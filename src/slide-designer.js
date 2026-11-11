import { pickShape } from './shapes.js';
import { studioIcon } from './studio-icons.js';
import {Simulations,simulationNames} from './simulations.js';
import {FontPicker,fontButton,loadSlideFonts} from './fonts.js';
import {presentationSlide} from './slide-display.js';
import { audioEditor } from './audio-editor.js';
import { optimizeImage } from './image-optimize.js';
import { MAX_CANVAS_ELEMENTS, canvasFromSlide, newElement, canvasThemes, applyCanvasTheme, slideBackground, normalizeBackground, imageZoomValue } from './canvas-data.js';
import {openLayouts, applyOpenLayout} from './open-slide-layouts.js';
import {slideStylePicker,localLayouts} from './slide-style-picker.js';
import { canvasMarkup, CanvasModels, esc } from './canvas-view.js';
import { importModelFiles } from './model-files.js';
import { storePages, fillAssetImages, fillAssetAudio } from './assets.js';
const copy = value => JSON.parse(JSON.stringify(value));
const btn = (action, text, extra = '') => `<button type="button" data-designer-action="${action}" ${extra}>${text}</button>`;
function snapAxis(position,size,pixels,bypass,targets=[]) {
  let match={position,guide:null}, distance=7;
  if(bypass)return match;
  for(const guide of [0,50,100,...targets])for(const edge of [0,size/2,size]){
    const gap=Math.abs(position+edge-guide)*pixels/100;
    if(gap<=distance){match={position:guide-edge,guide};distance=gap;}
  }
  return match;
}
const elementEffects={
  appear:'Aparecer',fadeIn:'Dissolver',floatIn:'Flutuar',flyIn:'Deslizar',wipeIn:'Revelar',zoomIn:'Ampliar',fadeOut:'Desaparecer'
};
function elementAnimation(slide,element,open){
  const effect=slide.animations?.find(a=>a.id===element.id);
  const options=Object.entries(elementEffects);
  if(effect&&!Object.hasOwn(elementEffects,effect.effect))options.push([effect.effect,'Efeito importado']);
  return `<details class="element-animation" ${open?'open':''}><summary aria-label="Animação do elemento" title="Animação do elemento" data-has-effect="${Boolean(effect)}">${studioIcon('animate')} <span class="sr-only">Animação do elemento</span></summary><div class="element-animation-panel">
    <label>Efeito<select data-element-animation="effect" aria-label="Efeito"><option value="">Sem animação</option>${options.map(([value,label])=>`<option value="${value}" ${value===effect?.effect?'selected':''}>${label}</option>`).join('')}</select></label>
    ${effect?`<label>Início<select data-element-animation="start"><option value="enter">Ao entrar no slide</option><option value="next" ${effect.group?'selected':''}>Ao avançar</option></select></label>
    ${effect.group?`<label>Ordem do clique<input type="number" min="1" max="100" value="${effect.group}" data-element-animation="group"></label>`:''}
    <label>Duração (ms)<input type="number" min="1" max="30000" step="50" value="${effect.duration}" data-element-animation="duration"></label>`:''}
  </div></details>`;
}
export class SlideDesigner {
  constructor(studio) {
    this.studio = studio;this.simulations=new Simulations();this.fontPicker=new FontPicker(studio); this.selected = ''; this.interacting = ''; this.derived = new Map(); this.histories = new Map(); this.models = new CanvasModels();
    this.previewModels=new CanvasModels();
    const root = studio.root;
    root.addEventListener('click', event => this.chooseStyle(event));
    for(const [enter,leave] of [['pointerover','pointerout'],['focusin','focusout']]){
      root.addEventListener(enter,event=>{
        if(event.pointerType==='touch')return;
        const option=event.target.closest('[data-style-value]');
        if(!option||option.contains(event.relatedTarget))return;
        this.clearStylePreview();
        this.styleTimer=setTimeout(()=>{
          if(option.isConnected&&option.closest(':popover-open'))this.previewStyle(option);
        },2000);
      });
      root.addEventListener(leave,event=>{
        const option=event.target.closest('[data-style-value]');
        if(option&&!option.contains(event.relatedTarget))this.clearStylePreview();
      });
    }
    root.addEventListener('click', event => {
      const summary = event.target.closest('.element-animation > summary');
      if (summary) this.animationOpen = summary.parentElement.open ? null : this.selected;
      else if (!event.target.closest('.element-animation')) {
        const details = root.querySelector('.element-animation[open]');
        if (details) details.open = false;
        this.animationOpen = null;
      }
    });
    root.addEventListener('click', e => { const b = e.target.closest('[data-designer-action]'); if (b) this.action(b.dataset.designerAction, b, e).catch(error => studio.callbacks.toast(error.message)); });
    this.cropPointers=new Map();
    root.addEventListener('wheel',e=>this.cropWheel(e),{passive:false});
    root.addEventListener('pointerdown', e => this.down(e));
    root.addEventListener('pointermove', e => this.move(e));
    root.addEventListener('pointerup', e => this.up(e));
    root.addEventListener('pointercancel', e => this.up(e));
    root.addEventListener('dblclick', e => { const object = e.target.closest('.canvas-object'); if (object?.dataset.type === 'text') this.editText(object); });
    root.addEventListener('input', e => this.input(e));
    root.addEventListener('focusout', e => { if (e.target.matches('.canvas-text[contenteditable]')) { e.target.removeAttribute('contenteditable'); this.lastTap = null; } });
    root.addEventListener('change', e => this.change(e).catch(error => studio.callbacks.toast(error.message)));
    root.addEventListener('keydown', e => this.key(e));
  }
  get original() { return this.studio.draft.slides[this.studio.index]; }
  selectionIds(){
    const slide=this.display();
    if(this.groupSlide!==slide.id||!this.group?.has(this.selected))return this.selected?[this.selected]:[];
    return slide.elements.filter(element=>this.group.has(element.id)).map(element=>element.id);
  }
  selectObject(id,extend=false,keepGroup=false){
    const ids=this.selectionIds();
    const group=new Set(extend||keepGroup&&ids.includes(id)?ids:[]);
    if(extend&&group.has(id))group.delete(id);
    else if(id)group.add(id);
    this.group=group;
    this.groupSlide=this.display().id;
    this.selected=group.has(id)?id:[...group].at(-1)||null;
    this.interacting='';
    this.refreshSelection();
  }
  display() {
    if (this.original.kind === 'canvas') return this.original;
    const signature = JSON.stringify(this.original), cached = this.derived.get(this.original.id);
    if (!cached || cached.signature !== signature) this.derived.set(this.original.id, { signature, slide: this.original.kind==='document'?canvasFromSlide(copy(this.original)):presentationSlide(copy(this.original)) });
    return this.derived.get(this.original.id).slide;
  }
  ensure() {
    if (this.original.kind !== 'canvas') this.studio.draft.slides[this.studio.index] = this.display();
    return this.original;
  }
  history(id=this.original.id) {
    if (!this.histories.has(id)) this.histories.set(id, { undo: [], redo: [] });
    return this.histories.get(id);
  }
  record(before = copy(this.original)) {
    const h = this.history(before.id); h.undo.push(before); if (h.undo.length > 40) h.undo.shift(); h.redo = [];
  }
  mutate(fn) {
    const before = copy(this.original); this.record(before);
    try { fn(this.ensure()); } catch (error) { this.studio.draft.slides[this.studio.index] = before; this.history().undo.pop(); throw error; }
    this.studio.markDirty(); this.studio.callbacks.render();
  }
  applyStyle(slide, kind, value) {
    if(kind==='theme'){
      if(applyCanvasTheme(slide,value)&&canvasThemes[value].layout)applyOpenLayout(slide,canvasThemes[value].layout);
      return;
    }
    if(applyOpenLayout(slide,value)||!Object.hasOwn(localLayouts,value))return;
    if(openLayouts.has(slide.layout))slide.elements=slide.elements.filter(element=>!element.id.startsWith('opf-decor-'));
    slide.layout=value;
    const media=slide.elements.filter(e=>!e.locked&&['image','model','simulation'].includes(e.type));
    const texts=slide.elements.filter(e=>!e.locked&&e.type==='text');
    texts.forEach((e,i)=>Object.assign(e,{x:7,y:i===0?10:37+(i-1)*48/Math.max(1,texts.length-1),
      w:value==='split'||media.length?43:85,h:i===0?23:48/Math.max(1,texts.length-1)}));
    media.forEach((e,i)=>Object.assign(e,{x:value==='spotlight'?35:55,y:12+i*74/media.length,
      w:value==='spotlight'?59:39,h:74/media.length}));
  }
  clearStylePreview(){
    clearTimeout(this.styleTimer);
    this.previewModels.mount(null,null);
    this.studio.root.querySelector('.slide-style-preview')?.remove();
  }
  previewStyle(option){
    const stage=this.studio.root.querySelector('.designer-stage');
    if(!stage)return;
    const slide=copy(this.display());
    this.applyStyle(slide,option.dataset.styleKind,option.dataset.styleValue);
    const overlay=document.createElement('div');
    overlay.className='slide-style-preview';
    overlay.setAttribute('aria-hidden','true');
    overlay.inert=true;
    overlay.innerHTML=canvasMarkup(slide)+'<small>Prévia</small>';
    stage.append(overlay);
    fillAssetImages(overlay);
    this.previewModels.mount(overlay,slide);
  }
  chooseStyle(event){
    const trigger=event.target.closest('[data-style-picker]');
    if(trigger){
      const menu=trigger.nextElementSibling;
      if(menu.matches(':popover-open')){menu.hidePopover();return;}
      menu.showPopover();
      const anchor=trigger.getBoundingClientRect(), box=menu.getBoundingClientRect();
      menu.style.left=Math.max(8,Math.min(anchor.left,innerWidth-box.width-8))+'px';
      menu.style.top=Math.max(8,Math.min(anchor.bottom+5,innerHeight-box.height-8))+'px';
      trigger.setAttribute('aria-expanded','true');
      menu.ontoggle=()=>{
        if(!menu.matches(':popover-open')){
          trigger.setAttribute('aria-expanded','false');
          this.clearStylePreview();
        }
      };
      return;
    }
    const option=event.target.closest('[data-style-value]');
    if(!option||!this.studio.groups.canEdit)return;
    const {styleKind,styleValue}=option.dataset;
    this.clearStylePreview();
    if(!option.closest('.slide-style-menu').querySelector('[data-style-all]:checked')){
      this.mutate(slide=>this.applyStyle(slide,styleKind,styleValue));
      return;
    }
    this.studio.draft.slides=this.studio.draft.slides.map(slide=>{
      if(slide.kind==='document'||slide.poll)return slide;
      const next=canvasFromSlide(copy(slide));
      this.applyStyle(next,styleKind,styleValue);
      this.record(copy(slide));
      return next;
    });
    this.studio.markDirty();
    this.studio.callbacks.render();
  }
  toolbarMarkup(){
    const h=this.history();
    const slide=this.display();
    return `<div class="designer-toolbar" role="toolbar" aria-label="Ferramentas do slide">
      ${btn('undo', '↶', `aria-label="Desfazer" ${h.undo.length ? '' : 'disabled'}`)}${btn('redo', '↷', `aria-label="Refazer" ${h.redo.length ? '' : 'disabled'}`)}
      <span></span>${btn('add-text', 'T Texto')}${btn('image', '▧ Imagem')}${btn('shape', '▰ Forma')}${btn('model', '◇ Modelo 3D')}${btn('simulation','⚗ Simulação')}
      ${slideStylePicker('theme',slide)}${slideStylePicker('layout',slide)}
      <input type="file" id="designer-image-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden><input type="file" id="designer-model-files" accept=".glb,.gltf,.obj,.mtl,.bin,.png,.jpg,.jpeg,.webp,.gif,.ktx2" multiple hidden>
    </div>`;
  }
  markup(fieldsOnly = false, showTools = true) {
    const slide = this.display();
    if(this.selected!==null&&!slide.elements.some(e => e.id === this.selected)) this.selected = (slide.elements.find(e=>!e.locked)||slide.elements[0])?.id || '';
    return `<div class="slide-designer">${slide.importWarnings?.length?`<details class="pptx-compatibility"><summary>Compatibilidade do PPTX · ${slide.importWarnings.length} observações</summary><ul>${slide.importWarnings.map(w=>'<li>'+esc(w)+'</li>').join('')}</ul></details>`:''}${showTools?this.toolbarMarkup():''}<div class="designer-workspace ${fieldsOnly ? 'fields-only' : ''}">${fieldsOnly ? '' : `<div class="designer-stage-wrap"><div class="designer-stage" style="--slide-aspect:${slide.sourceType&&slide.pageWidth&&slide.pageHeight?slide.pageWidth/slide.pageHeight:16/9}">${canvasMarkup(slide, { editing: true, selected: this.selected, interacting: this.interacting })}</div><div class="designer-layer-list" aria-label="Camadas do slide">${slide.elements.map((e, i) => btn('select', (i + 1) + ' · ' + esc(e.type === 'text' ? e.text.slice(0, 25) || 'Texto' : e.type === 'model' ? 'Modelo 3D' : e.type === 'shape' ? 'Forma' : 'Imagem'), `data-id="${e.id}" aria-pressed="${e.id === this.selected}"`)).join('')}</div></div>`}
      <aside class="designer-inspector">${this.inspector()}</aside></div></div>`;
  }
  backgroundControls(slide) {
    const fill=slide.backgroundFill, mode=fill?.mode||(slide.visualTheme?'theme':'solid');
    const modes=[...(slide.visualTheme?[['theme','Do tema']]:[]),['solid','Cor sólida'],['gradient','Gradiente']];
    return `<details class="inspector-background" ${this.backgroundOpen?'open':''}>
      <summary><span class="background-swatch" data-visual-theme="${slide.visualTheme||''}" data-custom-background="${Boolean(fill)}" style="background:${slideBackground(slide)}"></span> Fundo do slide</summary>
      <label>Preenchimento<select data-background-mode>${modes.map(([value,label])=>`<option value="${value}" ${value===mode?'selected':''}>${label}</option>`).join('')}</select></label>
      <label>${mode==='gradient'?'Cor inicial':'Cor de base'}<input type="color" id="designer-background" value="${slide.background}"></label>
      ${mode==='gradient'?`<label>Cor final<input type="color" data-background-end value="${fill.end}"></label><label>Ângulo do gradiente<input type="range" data-background-angle min="0" max="360" value="${fill.angle}"></label>`:''}
    </details>`;
  }
  inspector() {
    const s = this.display(), e = s.elements.find(e => e.id === this.selected);
    const ids=this.selectionIds();
    if(ids.length>1&&!this.studio.ai.open){
      const text=s.elements.find(element=>ids.includes(element.id)&&element.type==='text'&&!element.locked);
      return `<strong>${ids.length} elementos selecionados</strong>${text?`<label>Fonte dos textos${fontButton(text,this.studio.draft.customFonts)}</label>`:''}<small>Arraste para mover a seleção. Shift + clique adiciona ou remove elementos.</small>`;
    }
    const number = (label, key, value, min, max) => `<label>${label}<input type="number" data-element-field="${key}" value="${value}" min="${min}" max="${max}" step="0.5"></label>`;
    if(this.studio.ai.open)return this.studio.ai.inspector(s);
    return `${!e ? this.backgroundControls(s)+slideStylePicker('theme',s,{inspector:true})+audioEditor(s.audio,'slide',s.elements) : `<div class="designer-selected-heading"><strong>${{ text: 'Caixa de texto', image: 'Imagem', model: 'Modelo 3D', shape: 'Forma',simulation:'Simulação' }[e.type]}</strong>${btn('delete', studioIcon('trash')+' Excluir', 'class="danger-text inspector-delete" aria-label="Excluir elemento"')}</div><div class="designer-arrange" aria-label="Organizar elemento">${[
  ['duplicate', 'duplicate', 'Duplicar elemento'],
  ['forward', 'forward', 'Trazer à frente'],
  ['animation'],
  ['backward', 'backward', 'Enviar para trás'],
  ['lock', e.locked ? 'unlock' : 'lock', e.locked ? 'Desbloquear elemento' : 'Fixar elemento']
].map(([action,icon,label])=>action==='animation'?elementAnimation(s,e,this.animationOpen===e.id):btn(action,studioIcon(icon),'aria-label="'+label+'" title="'+label+'"')).join('')}</div>${audioEditor(e.audio || (s.audio?.trigger==='element:'+e.id?s.audio:null),'element:'+e.id)}
      ${e.type === 'text' ? `<label>Fonte${fontButton(e,this.studio.draft.customFonts)}</label><label>Texto do elemento<textarea data-element-field="text" aria-label="Texto do elemento">${esc(e.text)}</textarea></label><div class="designer-type-settings">${number('Tamanho', 'fontSize', e.fontSize, 1, 512)}<label>Cor do texto<input type="color" data-element-field="color" value="${e.color}"></label></div><div class="designer-format-row">${btn('bold', '<b>N</b>', `aria-label="Negrito" aria-pressed="${e.bold}"`)}${['left', 'center', 'right'].map((a, i) => btn('align', ['⇤', '↔', '⇥'][i], `data-align="${a}" aria-label="${['Alinhar à esquerda', 'Centralizar texto', 'Alinhar à direita'][i]}"`)).join('')}</div>` : ''}
      ${e.type === 'image' ? `<div class="designer-image-actions" role="group" aria-label="Ações da imagem">${[
        ['replace-image','image','Trocar imagem'],
        ['image-reset','reload','Restaurar enquadramento'],
        ['crop-image','crop',this.imageEditing===e.id?'Concluir enquadramento':'Enquadrar imagem']
      ].map(([action,icon,label])=>btn(action,studioIcon(icon),`aria-label="${label}" title="${label}" ${action==='crop-image'?`aria-pressed="${this.imageEditing===e.id}"`:''}`)).join('')}</div>
      <label>Ajuste na moldura<select data-element-field="imageFit"><option value="contain">Mostrar inteira</option><option value="cover" ${e.imageFit==='cover'?'selected':''}>Preencher</option><option value="fill" ${e.imageFit==='fill'?'selected':''}>Esticar livremente</option></select></label>
      <div class="image-crop-controls">${btn('image-minus','−','aria-label="Diminuir zoom da imagem"')}<output>${Math.round((e.imageZoom||1)*1000)/10}%</output>${btn('image-plus','+','aria-label="Aumentar zoom da imagem"')}</div>
      <div class="designer-position-grid">${number('Deslocamento X (%)','imageX',e.imageX||0,'','')}${number('Deslocamento Y (%)','imageY',e.imageY||0,'','')}</div>
      ${btn('image-background','Fundo transparente',`class="designer-image-background" aria-pressed="${!e.imageBackground||e.imageBackground==='transparent'}"`)}
      ${e.imageBackground&&e.imageBackground!=='transparent'?`<label>Cor do fundo da imagem<input type="color" data-element-field="imageBackground" value="${esc(e.imageBackground)}"></label>`:''}
      <label>Descrição da imagem<input data-element-field="imageAlt" value="${esc(e.imageAlt)}"></label>` : ''}
      ${e.type === 'model' ? `<label>Modelo<select data-element-field="model" aria-label="Modelo do elemento">${[['ssd', 'SSD SATA'], ['hdd', 'HDD'], ['nvme', 'SSD NVMe'], ['custom', e.customModel?.name || 'Meu modelo enviado']].map(([v, label]) => `<option value="${v}" ${e.model === v ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label><label>Nome do modelo<input data-element-field="modelLabel" maxlength="120" value="${esc(e.modelLabel||'')}" placeholder="${esc(e.model==='custom'?e.customModel?.name||'Modelo 3D':'Nome da peça selecionada')}"></label><label>Descrição do modelo<textarea data-element-field="modelDescription" maxlength="500" placeholder="Descrição ao explorar o modelo">${esc(e.modelDescription||'')}</textarea></label><label class="model-details-toggle"><input type="checkbox" data-element-field="modelDetailsHidden" ${e.modelDetailsHidden?'checked':''}> Mostrar somente o modelo 3D</label>${btn('replace-model', '↑ Enviar GLB / GLTF / OBJ')}${btn('interact', this.interacting === e.id ? 'Voltar à edição' : 'Explorar o modelo')}` : ''}
      ${e.type==='simulation'?`<label>Experiência<select data-element-field="simulation" aria-label="Tipo de simulação">${Object.entries(simulationNames).map(([id,name])=>`<option value="${id}" ${e.simulation===id?'selected':''}>${name}</option>`).join('')}</select></label>${btn('interact',this.interacting===e.id?'Voltar à edição':'Experimentar simulação')}`:''}${e.type === 'shape' ? `<label>Cor da forma<input type="color" data-element-field="background" value="${e.background}"></label>
      <label>Cor da borda<input type="color" data-element-field="borderColor" value="${e.borderColor||'#ffffff'}"></label>
      <div class="designer-type-settings">${number('Largura da borda','borderWidth',e.borderWidth||0,0,40)}${e.shapeType!=='ellipse'?number('Curvatura','cornerRadius',e.cornerRadius??5,0,100):''}</div>` : ''}
      <div class="designer-position-grid">${number('Posição X (%)', 'x', e.x, -1000, 1000)}${number('Posição Y (%)', 'y', e.y, -1000, 1000)}${number('Largura (%)', 'w', e.w, e.type==='image'?.1:5, 1000)}${number('Altura (%)', 'h', e.h, e.type==='image'?.1:5, 1000)}</div>

      <small>As posições são relativas ao slide e ficam iguais no computador e no celular.</small>`}
      <details class="designer-notes"><summary>Perguntas e roteiro</summary><label>Pergunta de discussão<textarea data-slide-field="prompt">${esc(s.prompt)}</textarea></label><label>Explicação da discussão<textarea data-slide-field="answer">${esc(s.answer)}</textarea></label><label>Notas do professor<textarea data-slide-field="note">${esc(s.note)}</textarea></label></details>`;
  }
  afterRender() {
    this.clearStylePreview();
    const root = this.studio.root.querySelector('.slide-designer');
    this.simulations.mount(root);if(root){loadSlideFonts(this.display(),this.studio.draft.customFonts);fillAssetImages(root);this.models.mount(root,this.display());const ids=this.selectionIds();for(const node of root.querySelectorAll('[data-object-id]')){node.dataset.selected=String(ids.includes(node.dataset.objectId));node.dataset.cropping=String(node.dataset.objectId===this.imageEditing);}for(const button of root.querySelectorAll('[data-designer-action="select"]'))button.setAttribute('aria-pressed',String(ids.includes(button.dataset.id)));}
    else this.models.mount(null, null);
  }
  selectedElement() { return this.ensure().elements.find(e => e.id === this.selected); }
  refreshSelection() {
    const ids=this.selectionIds();
    for (const node of this.studio.root.querySelectorAll('.canvas-editing [data-object-id]')) { node.dataset.selected = String(ids.includes(node.dataset.objectId)); node.dataset.interacting = String(node.dataset.objectId === this.interacting);node.dataset.cropping=String(node.dataset.objectId===this.imageEditing); }
    const inspector = this.studio.root.querySelector('.designer-inspector'); if (inspector && !this.studio.ai.refreshInspectorScope()) { inspector.innerHTML = this.inspector(); inspector.classList.remove('selection-arrive'); void inspector.offsetWidth; inspector.classList.add('selection-arrive'); }
    fillAssetAudio(this.studio.root);
    for (const button of this.studio.root.querySelectorAll('[data-designer-action="select"]')) button.setAttribute('aria-pressed', String(ids.includes(button.dataset.id)));
  }
  down(event) {
    if(!this.studio.groups.canEdit)return;
    const node = event.target.closest('.canvas-editing .canvas-object');
    if(!node&&event.target.closest('.designer-stage-wrap')&&!event.target.closest('button,input,select,textarea')){this.selected=null;this.interacting='';this.imageEditing='';this.refreshSelection();return;}
    if (!node || event.target.closest('[contenteditable]') || event.target.closest('button')) return;
    if(this.imageEditing===node.dataset.objectId){this.cropDown(event,node);return;}
    this.imageEditing='';
    if(event.shiftKey){this.selectObject(node.dataset.objectId,true);event.preventDefault();return;}
    if(this.interacting===node.dataset.objectId)return;
    this.selectObject(node.dataset.objectId,false,true);
    const el = this.display().elements.find(e => e.id === this.selected);
    if (el.locked || this.interacting === el.id) return;
    const stage = node.closest('.slide-canvas');
    const ids=this.selectionIds();
    const moving=this.display().elements.filter(element=>ids.includes(element.id)&&!element.locked).map(({id,x,y})=>({id,x,y}));
    this.drag = { id: el.id, before: copy(this.original), initial: copy(el), moving, x: event.clientX, y: event.clientY, box: stage.getBoundingClientRect(), resize: ids.length===1&&Boolean(event.target.closest('[data-resize-handle]')), stage };
    stage.setPointerCapture(event.pointerId); event.preventDefault(); node.focus({ preventScroll: true });
    const now = performance.now();
    if (ids.length===1&&this.lastTap?.id === el.id && now - this.lastTap.time < 350 && el.type === 'text') { this.drag = null; this.editText(node); }
    this.lastTap = { id: el.id, time: now };
  }
  move(event) {
    if(this.cropPointers.has(event.pointerId)){this.cropMove(event);return;}
    if (!this.drag) return;
    const d = this.drag, dx = (event.clientX - d.x) / d.box.width * 100, dy = (event.clientY - d.y) / d.box.height * 100;
    if (Math.abs(dx) + Math.abs(dy) < .15) return;
    const el = this.selectedElement();
    if (d.resize) {
      const { w, h } = d.initial;
      const minimum = el.type === 'image' ? .1 : 5;
      el.w = Math.max(minimum, Math.min(1000, w + dx));
      el.h = Math.max(minimum, Math.min(1000, h + dy));
    }
    else {
      const others=this.display().elements.filter(item=>!d.moving.some(member=>member.id===item.id));
      const x=snapAxis(d.initial.x+dx,el.w,d.box.width,event.altKey,others.flatMap(item=>[item.x,item.x+item.w/2,item.x+item.w]));
      const y=snapAxis(d.initial.y+dy,el.h,d.box.height,event.altKey,others.flatMap(item=>[item.y,item.y+item.h/2,item.y+item.h]));
      const deltaX=Math.max(...d.moving.map(item=>-1000-item.x),Math.min(x.position-d.initial.x,...d.moving.map(item=>1000-item.x)));
      const deltaY=Math.max(...d.moving.map(item=>-1000-item.y),Math.min(y.position-d.initial.y,...d.moving.map(item=>1000-item.y)));
      for(const member of d.moving){
        const element=this.original.elements.find(item=>item.id===member.id);
        element.x=Math.round((member.x+deltaX)*10)/10;
        element.y=Math.round((member.y+deltaY)*10)/10;
        const object=d.stage.querySelector('[data-object-id="'+CSS.escape(member.id)+'"]');
        if(object)Object.assign(object.style,{left:element.x+'%',top:element.y+'%'});
      }
      d.stage.style.setProperty('--guide-x',x.guide===null?'none':x.guide+'%');
      d.stage.style.setProperty('--guide-y',y.guide===null?'none':y.guide+'%');
      d.stage.toggleAttribute('data-guide-x',x.guide!==null);
      d.stage.toggleAttribute('data-guide-y',y.guide!==null);
    }
    for (const key of ['x', 'y']) el[key] = Math.round(el[key] * 10) / 10;
    if (d.resize) {
      el.w = Math.round(el.w * 10) / 10;
      el.h = Math.round(el.h * 10) / 10;
    }
    const node = d.stage.querySelector('[data-object-id="' + CSS.escape(el.id) + '"]');
    Object.assign(node.style, { left: el.x + '%', top: el.y + '%', width: el.w + '%', height: el.h + '%' });
    this.studio.markDirty();
  }
  up(event) {
    if(this.cropPointers.has(event?.pointerId)){
      this.cropPointers.delete(event.pointerId);if(this.cropPointers.size){this.cropGesture();return;}
      const before=this.cropBefore;this.cropBefore=null;this.cropStart=null;if(before&&JSON.stringify(before)!==JSON.stringify(this.original)){this.record(before);this.studio.callbacks.render();}return;
    }
    if (!this.drag) return;
    const {before,stage}=this.drag; this.drag = null;
    stage.removeAttribute('data-guide-x');stage.removeAttribute('data-guide-y');
    if (JSON.stringify(before) !== JSON.stringify(this.original)) { this.lastTap = null; this.record(before); this.studio.callbacks.render(); }
  }
  editText(node) {
    const text = node.querySelector('.canvas-text'); if (!text) return;
    this.record(); this.ensure(); text.contentEditable = 'plaintext-only'; text.focus();
    const range = document.createRange(); range.selectNodeContents(text);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  }
  input(event) {
    const target = event.target;
    if (!this.studio.groups.canEdit || this.studio.receivingRemote || !this.studio.root.contains(target)) return;
    if (target.closest('.canvas-text[contenteditable]')) {
      const el = this.selectedElement(); el.text = target.innerText.slice(0, 6000); if (el.role === 'title') this.original.title = el.text.slice(0, 200);
      const label = this.studio.root.querySelector('[data-current-label]'); if (label && el.role === 'title') label.textContent = this.original.title;
      this.studio.markDirty(); return;
    }
    const background = target.matches('#designer-background,[data-background-end],[data-background-angle]');
    if (!target.dataset.elementField && !target.dataset.slideField && !background) return;
    if (!this.studio.root.querySelector('.slide-designer')) return;
    if (!this.lastInput || Date.now() - this.lastInput > 700) this.record();
    this.lastInput = Date.now();
    const s = this.ensure(), key = target.dataset.elementField, el = s.elements.find(e => e.id === this.selected);
    if (background) {
      if(target.id==='designer-background')s.background=target.value;
      else if(target.matches('[data-background-end]'))s.backgroundFill.end=target.value;
      else s.backgroundFill.angle=Number(target.value);
      for(const node of this.studio.root.querySelectorAll('.designer-stage .slide-canvas,.background-swatch'))node.style.background=slideBackground(s);
      this.studio.markDirty();
      return;
    }
    else if (target.dataset.slideField) s[target.dataset.slideField] = target.value;
    else if (el) {
      el[key] = key==='modelDetailsHidden' ? target.checked
        : ['x', 'y', 'w', 'h', 'fontSize','borderWidth','cornerRadius','imageX','imageY'].includes(key) ? Number(target.value) : target.value;
      if(key==='simulation'){this.studio.markDirty();this.studio.callbacks.render();return;}
      if(key==='borderWidth'||key==='cornerRadius')el[key]=Math.max(0,Math.min(key==='borderWidth'?40:100,el[key]));
      if (key === 'fontSize') el.fontSize = Math.max(1, Math.min(512, el.fontSize));
      if (['w', 'h'].includes(key)) el[key] = Math.max(el.type === 'image' ? .1 : 5, Math.min(1000, el[key]));
      if (['x', 'y'].includes(key)) el[key] = Math.max(-1000, Math.min(1000, el[key]));
      if (key === 'text' && el.role === 'title') s.title = el.text.slice(0, 200);
    }
    this.studio.markDirty();
    const stage = this.studio.root.querySelector('.designer-stage');
    if (stage) { stage.innerHTML = canvasMarkup(s, { editing: true, selected: this.selected, interacting: this.interacting }); const cropping = stage.querySelector('[data-object-id="'+CSS.escape(this.imageEditing)+'"]');if(cropping)cropping.dataset.cropping='true';fillAssetImages(stage);this.simulations.mount(stage); this.models.mount(stage, s); }
  }
  async change(event) {
    const t = event.target;
    if (!this.studio.groups.canEdit || this.studio.receivingRemote || !this.studio.root.contains(t)) return;
    if(t.dataset.elementAnimation){
      const id=this.selected;
      const field=t.dataset.elementAnimation;
      this.mutate(slide=>{
        slide.animations||=[];
        const index=slide.animations.findIndex(effect=>effect.id===id);
        if(field==='effect'&&!t.value){slide.animations=slide.animations.filter(effect=>effect.id!==id);return;}
        if(index<0){
          if(slide.animations.length>=100)throw Error('Este slide já tem 100 efeitos.');
          slide.animations.push({id,effect:t.value,group:0,duration:500,delay:0});
          return;
        }
        const effect=slide.animations[index];
        if(field==='start')effect.group=t.value==='enter'?0:Math.min(100,Math.max(0,...slide.animations.map(a=>a.group))+1);
        else if(field==='effect')effect.effect=t.value;
        else effect[field]=Math.max(1,Math.min(field==='group'?100:30000,Math.round(Number(t.value)||1)));
      });
      return;
    }
    if(t.matches('[data-background-mode]')){
      this.backgroundOpen=true;
      this.mutate(s=>{
        const mode=t.value;
        if(mode==='theme'){delete s.backgroundFill;s.background=canvasThemes[s.visualTheme].background;}
        else s.backgroundFill=normalizeBackground({mode,end:canvasThemes[s.visualTheme]?.accent||'#36648a',angle:135});
      });
      return;
    }
    if (t.id === 'designer-image-file') {
      let file = t.files[0]; if (!file) return;
      const sourceSlide = this.original, targetId = this.replaceId;
      file = await optimizeImage(file);
      if (!this.studio.groups.canEdit || sourceSlide !== this.original) return;
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 1400000) throw Error('Use PNG, JPEG, WebP ou GIF de até 1,4 MB.');
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const [assetId] = await storePages([data]); if (!this.studio.groups.canEdit || sourceSlide !== this.original) return;
      this.mutate(s => { let e = s.elements.find(e => e.id === targetId && e.type === 'image'); if (!e) { if(targetId)return; if(s.elements.length>=MAX_CANVAS_ELEMENTS)throw Error(`Use até ${MAX_CANVAS_ELEMENTS} elementos no slide.`); e = newElement('image', { imageAlt: file.name }); s.elements.push(e); } e.assetId = assetId; e.image = ''; this.selected = e.id; }); this.replaceId = null;
    }
    if (t.id === 'designer-model-files') {
      const sourceSlide = this.original, targetId = this.replaceId, model = await importModelFiles(t.files); if (!model || sourceSlide !== this.original) return;
      this.mutate(s => { let e = s.elements.find(e => e.id === targetId && e.type === 'model'); if (!e) { if (s.elements.filter(e => e.type === 'model').length >= 2) throw Error('Use até dois modelos por slide.'); e = newElement('model'); s.elements.push(e); } e.model = 'custom'; e.customModel = model; this.selected = e.id; }); this.replaceId = null;
    }
  }
  async action(action, button, event) {
    if(!this.studio.groups.canEdit)return;
    const e = this.display().elements.find(e => e.id === this.selected);
    if(action==='simulation'){this.mutate(s=>{const e=newElement('simulation',{x:53,y:12,w:42,h:76});s.elements.push(e);this.selected=e.id;});return;}
    if(action==='crop-image'){this.ensure();this.imageEditing=this.imageEditing===e.id?'':e.id;this.refreshSelection();return;}
    if(action==='image-background'){
      this.mutate(s=>{
        const image=s.elements.find(item=>item.id===e?.id);
        if(image?.type==='image')image.imageBackground=!image.imageBackground||image.imageBackground==='transparent'?'#ffffff':'transparent';
      });
      return;
    }
    if(['image-plus','image-minus','image-reset'].includes(action)){
      this.mutate(s=>{const image=s.elements.find(item=>item.id===e?.id);if(!image)return;if(action==='image-reset'){image.imageZoom=1;image.imageX=image.imageY=0;}else image.imageZoom=imageZoomValue((image.imageZoom||1)*(action==='image-plus'?1.25:.8));});return;
    }
    if (action === 'select') { this.selectObject(button.dataset.id,event?.shiftKey); return; }
    if (action === 'image' || action === 'replace-image') { this.replaceId = action.startsWith('replace') ? e?.id : null; this.studio.root.querySelector('#designer-image-file').click(); return; }
    if (action === 'model') { this.mutate(s => { if (s.elements.length >= MAX_CANVAS_ELEMENTS) throw Error(`Use até ${MAX_CANVAS_ELEMENTS} elementos no slide.`); if (s.elements.filter(item => item.type === 'model').length >= 2) throw Error('Use até dois modelos por slide.'); const model = newElement('model'); s.elements.push(model); this.selected = model.id; }); return; }
    if (action === 'replace-model') { this.replaceId = e?.id; this.studio.root.querySelector('#designer-model-files').click(); return; }
    if (action === 'interact') { this.interacting = this.interacting === e.id ? '' : e.id; this.refreshSelection(); return; }
    if (action === 'undo' || action === 'redo') {
      clearTimeout(this.cropWheelTimer);this.cropWheelBefore=null;
      const h = this.history(), from = action === 'undo' ? h.undo : h.redo, to = action === 'undo' ? h.redo : h.undo;
      if (!from.length) return; to.push(copy(this.original)); this.studio.draft.slides[this.studio.index] = from.pop(); this.studio.markDirty(); this.studio.callbacks.render(); return;
    }
    const original=action==='shape'?this.original:null;
    const shape=action==='shape'?await pickShape():null;
    if(action==='shape'&&(!shape||!this.studio.groups.canEdit||this.original!==original))return;
    this.mutate(s => {
      if (s.elements.length >= MAX_CANVAS_ELEMENTS && ['add-text', 'shape', 'duplicate'].includes(action)) throw Error(`Use até ${MAX_CANVAS_ELEMENTS} elementos no slide.`);
      let current = s.elements.find(e => e.id === this.selected);
      if (action === 'add-text' || action === 'shape') { current = newElement(action === 'shape' ? 'shape' : 'text',shape||{}); s.elements.push(current); this.selected = current.id; }
      else if (!current) return;
      else if (action === 'delete') {
        s.elements=s.elements.filter(e=>e.id!==current.id);
        if(s.animations)s.animations=s.animations.filter(a=>a.id!==current.id);
      }
      else if (action === 'duplicate') { const next = { ...copy(current), id: crypto.randomUUID(), x: current.x + 3, y: current.y + 3 }; s.elements.push(next); this.selected = next.id; }
      else if (action === 'bold') current.bold = !current.bold;
      else if (action === 'align') current.align = button.dataset.align;
      else if (action === 'lock') current.locked = !current.locked;
      else if (action === 'forward' || action === 'backward') { const index = s.elements.indexOf(current), next = Math.max(0, Math.min(s.elements.length - 1, index + (action === 'forward' ? 1 : -1))); s.elements.splice(index, 1); s.elements.splice(next, 0, current); }
    });
  }
  cropDown(event,node){
    event.preventDefault();this.selected=node.dataset.objectId;this.ensure();
    if(!this.cropPointers.size)this.cropBefore=copy(this.original);
    this.cropPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});node.setPointerCapture(event.pointerId);this.cropGesture();
  }
  cropGesture(){
    const image=this.selectedElement(),points=[...this.cropPointers.values()];if(!image||!points.length)return;
    const node=this.studio.root.querySelector(`[data-object-id="${image.id}"]`),rect=node.getBoundingClientRect();
    this.cropStart={zoom:image.imageZoom||1,x:image.imageX||0,y:image.imageY||0,cx:points.reduce((s,p)=>s+p.x,0)/points.length,cy:points.reduce((s,p)=>s+p.y,0)/points.length,rect,distance:points.length>1?Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y):1};
  }
  cropMove(event){
    event.preventDefault();this.cropPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const d=this.cropStart,image=this.selectedElement(),points=[...this.cropPointers.values()];if(!d||!image)return;
    const cx=points.reduce((s,p)=>s+p.x,0)/points.length,cy=points.reduce((s,p)=>s+p.y,0)/points.length;
    const zoom=points.length>1?imageZoomValue(d.zoom*Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)/Math.max(1,d.distance)):d.zoom,ratio=zoom/d.zoom;
    image.imageZoom=zoom;image.imageX=d.x*ratio+(cx-d.cx)/d.rect.width*100+(d.cx-d.rect.left-d.rect.width/2)/d.rect.width*100*(1-ratio);image.imageY=d.y*ratio+(cy-d.cy)/d.rect.height*100+(d.cy-d.rect.top-d.rect.height/2)/d.rect.height*100*(1-ratio);this.paintCrop(image);this.studio.markDirty();
  }
  paintCrop(image){const node=this.studio.root.querySelector(`[data-object-id="${image.id}"] img`);if(node)node.style.transform=`translate(${image.imageX||0}%,${image.imageY||0}%) scale(${image.imageZoom||1})`;const output=this.studio.root.querySelector('.image-crop-controls output');if(output)output.textContent=Math.round((image.imageZoom||1)*1000)/10+'%';}
  cropWheel(event){
    const node=event.target.closest('.canvas-editing [data-object-id]');if(!node||node.dataset.objectId!==this.imageEditing)return;
    event.preventDefault();const image=this.selectedElement();if(!image)return;if(!this.cropWheelBefore||this.cropWheelSlide!==this.original.id){this.record(copy(this.original));this.cropWheelBefore=true;this.cropWheelSlide=this.original.id;}
    const rect=node.getBoundingClientRect(),before=image.imageZoom||1,zoom=imageZoomValue(before*Math.exp(-Math.max(-300,Math.min(300,event.deltaY))*.002)),ratio=zoom/before;
    image.imageX=(image.imageX||0)*ratio+(event.clientX-rect.left-rect.width/2)/rect.width*100*(1-ratio);image.imageY=(image.imageY||0)*ratio+(event.clientY-rect.top-rect.height/2)/rect.height*100*(1-ratio);image.imageZoom=zoom;this.paintCrop(image);this.studio.markDirty();
    clearTimeout(this.cropWheelTimer);const slideId=this.original.id;this.cropWheelTimer=setTimeout(()=>{this.cropWheelBefore=null;if(this.original?.id===slideId)this.studio.callbacks.render();},350);
  }
  key(event) {
    const editor=event.target.closest('.studio-editor')||this.studio.root.querySelector('.studio-editor');
    if(!editor||!this.studio.groups.canEdit||event.target.closest?.('input,textarea,select,[contenteditable],dialog,.lesson-chat')||document.querySelector('dialog[open]'))return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); this.action(event.shiftKey ? 'redo' : 'undo', {}); return; }
    if (event.key==='Delete' && this.selected) { event.preventDefault(); this.action('delete', {}).catch(error=>this.studio.callbacks.toast(error.message)); }
    if (event.target.closest?.('.slide-designer')&&event.key.startsWith('Arrow') && this.selected) {
      event.preventDefault(); const amount = event.shiftKey ? 5 : 1;
      this.mutate(s => { const e = s.elements.find(e => e.id === this.selected); if (!e || e.locked) return; if (event.key === 'ArrowLeft') e.x = Math.max(-1000, e.x - amount); if (event.key === 'ArrowRight') e.x = Math.min(1000, e.x + amount); if (event.key === 'ArrowUp') e.y = Math.max(-1000, e.y - amount); if (event.key === 'ArrowDown') e.y = Math.min(1000, e.y + amount); });
    }
  }
}
