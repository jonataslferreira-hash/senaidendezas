import {loadCustomSims,saveCustomSims,parseExperimentFile,customSimMarkup,experimentTemplate,experimentName,experimentSubject,isCustomExperiment,CUSTOM_SIM_MAX} from './custom-sim.js';
import {videoSource,videoMarkup} from './video-embed.js';
import { createUuid } from './uuid.js';
import { pickShape } from './shapes.js';
import { studioIcon } from './studio-icons.js';
import {Simulations,simulationMarkup,simulationNames,simulationGroups,simulationSubjects} from './simulations.js';
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
import { searchImageChoices, importImageChoice, verifyTransparentChoice } from './storage-ai-image-search.js';
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
// Gradientes com duas cores realmente distintas: antes o fim era a cor de
// destaque do tema e o resultado ficava quase igual ao fundo sólido.
export const backgroundGradients = [
  { name: 'Aurora', hint: 'violeta para turquesa', css: 'linear-gradient(135deg,#5b21b6,#22d3ee)' },
  { name: 'Pôr do sol', hint: 'laranja para rosa', css: 'linear-gradient(135deg,#f97316,#db2777)' },
  { name: 'Oceano', hint: 'azul profundo para água', css: 'linear-gradient(135deg,#0c4a6e,#38bdf8)' },
  { name: 'Floresta', hint: 'verde escuro para limão', css: 'linear-gradient(135deg,#14532d,#a3e635)' },
  { name: 'Papel', hint: 'creme para lavanda', css: 'linear-gradient(135deg,#fef3c7,#e9d5ff)' },
  { name: 'Grafite', hint: 'carvão para prata', css: 'linear-gradient(135deg,#111827,#9ca3af)' }
];
// Lê as duas cores do preset para que o slide guarde só #rrggbb (formato do editor).
export function gradientEndpoints(css){
  const colors=[...String(css).matchAll(/#[0-9a-f]{6}/gi)].map(match=>match[0].toLowerCase());
  return [colors[0]||'#171324',colors[1]||'#36648a'];
}
// Distância perceptiva simples entre duas cores (0 = iguais, ~441 = preto/branco).
export function colorDistance(a,b){
  const part=(hex,at)=>parseInt(hex.slice(at,at+2),16);
  return Math.hypot(part(a,1)-part(b,1),part(a,3)-part(b,3),part(a,5)-part(b,5));
}
// Cor final do gradiente escolhida para ser claramente outra cor: gira o matiz
// e desloca a luminosidade, em vez de só clarear um pouco a base (o que deixava
// o gradiente com cara de cor única).
export function contrastingGradient(theme, base){
  const r=parseInt(base.slice(1,3),16)/255,g=parseInt(base.slice(3,5),16)/255,b=parseInt(base.slice(5,7),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;
  let h=0,sat=0;
  if(d){
    sat=d/(1-Math.abs(2*l-1));
    h=max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4;
    h*=60;
  }
  const accent=theme?.accent;
  if(accent&&colorDistance(accent,base)>150)return accent.toLowerCase();
  const hue=(h+(d?70:265))%360, s2=Math.max(.55,Math.min(.85,sat||.6));
  const l2=l<.5?Math.min(.68,l+.36):Math.max(.34,l-.36);
  const c=(1-Math.abs(2*l2-1))*s2,x=c*(1-Math.abs(hue/60%2-1)),m=l2-c/2;
  const [r2,g2,b2]=hue<60?[c,x,0]:hue<120?[x,c,0]:hue<180?[0,c,x]:hue<240?[0,x,c]:hue<300?[x,0,c]:[c,0,x];
  return '#'+[r2,g2,b2].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
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
        },1000);
      });
      root.addEventListener(leave,event=>{
        const option=event.target.closest('[data-style-value]');
        if(option&&!option.contains(event.relatedTarget))this.clearStylePreview();
      });
    }
    root.addEventListener('click', event => {
      const timeline=event.target.closest('.designer-timeline > summary');
      if(timeline)this.timelineOpen=!timeline.parentElement.open;
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
    root.addEventListener('wheel',e=>{const strip=e.target.closest('.designer-layer-list');if(!strip||Math.abs(e.deltaY)<Math.abs(e.deltaX))return;strip.scrollLeft+=e.deltaY;e.preventDefault();},{passive:false});
    root.addEventListener('pointerdown', event => {
      const grip = event.target.closest('[data-layer-grip]');
      if (grip) {
        event.preventDefault();
        this.dragLayer(event, grip.closest('[data-layer-row]'), true);
        return;
      }
      // Segurar o próprio nome da camada também arrasta (mouse/caneta).
      const layerRow = event.target.closest('#designer-layers [data-layer-row]');
      if (layerRow && event.pointerType !== 'touch') { this.dragLayer(event, layerRow, false); return; }
      this.down(event);
    });
    root.addEventListener('pointermove', e => this.move(e));
    root.addEventListener('pointerup', e => this.up(e));
    root.addEventListener('pointercancel', e => this.up(e));
    root.addEventListener('dblclick', e => {
      const object = e.target.closest('.canvas-object');
      if (object?.dataset.type === 'text') this.editText(object);
      else if (object?.dataset.type === 'simulation') {
        const element = this.display().elements.find(item => item.id === object.dataset.objectId);
        if (element) this.openSimulationModal(element.simulation, element.id);
      }
    });
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
    this.mobilePanel='';
    this.refreshSelection();
  }
  display() {
    if (this.original.kind === 'canvas') return this.original;
    const signature = JSON.stringify(this.original), cached = this.derived.get(this.original.id);
    if (!cached || cached.signature !== signature) this.derived.set(this.original.id, { signature, slide: this.original.kind==='document'?canvasFromSlide(copy(this.original)):presentationSlide(copy(this.original)) });
    return this.derived.get(this.original.id).slide;
  }
  ensure() {
    if (this.original.kind !== 'canvas') this.studio.draft.slides[this.studio.index] = copy(this.display());
    return this.original;
  }
  history(id=this.original.id) {
    if (!this.histories.has(id)) this.histories.set(id, { undo: [], redo: [] });
    return this.histories.get(id);
  }
  record(before = copy(this.original)) {
    const h = this.history(before.id); h.undo.push(before); if (h.undo.length > 40) h.undo.shift(); h.redo = [];
  }
  mutate(fn, preserveInspector = false) {
    const scroll = preserveInspector ? this.studio.root.querySelector("#designer-inspector")?.scrollTop : undefined;
    const before = copy(this.original); this.record(before);
    try { fn(this.ensure()); } catch (error) { this.studio.draft.slides[this.studio.index] = before; this.history().undo.pop(); throw error; }
    this.studio.markDirty(); this.studio.callbacks.render();
    const inspector = this.studio.root.querySelector("#designer-inspector");
    if (inspector && scroll !== undefined) inspector.scrollTop = scroll;
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
    overlay.innerHTML=canvasMarkup(slide,{interactive:false})+'<small>Prévia</small>';
    stage.append(overlay);
    fillAssetImages(overlay);
    this.simulations.mountStatic(overlay);
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
  dragLayer(event, row, immediate) {
    if (!row || !this.studio.groups.canEdit || event.button !== 0) return;
    const list = row.closest('#designer-layers');
    const from = row.dataset.layerRow;
    const original = this.original;
    const startX = event.clientX, startY = event.clientY;
    let ghost, destination, active = false;
    const clearTarget = () => { destination?.classList.remove('layer-drop-target', 'layer-drop-before', 'layer-drop-after'); };
    const start = () => {
      active = true;
      row.classList.add('dragging');
      list.classList.add('layer-dragging');
      ghost = document.createElement('span');
      ghost.className = 'layer-drag-preview';
      ghost.textContent = row.querySelector('button').textContent;
      document.body.append(ghost);
    };
    const move = next => {
      if (!active) {
        if (Math.hypot(next.clientX - startX, next.clientY - startY) < 6) return;
        start();
      }
      next.preventDefault?.();
      ghost.style.translate = next.clientX + 'px ' + next.clientY + 'px';
      clearTarget();
      const bounds = list.getBoundingClientRect();
      if (next.clientX < bounds.left + 28) list.scrollLeft -= 12;
      if (next.clientX > bounds.right - 28) list.scrollLeft += 12;
      destination = document.elementFromPoint(next.clientX, next.clientY)?.closest('[data-layer-row]');
      if (destination?.closest('#designer-layers') === list && destination.dataset.layerRow !== from) {
        const rows = [...list.querySelectorAll('[data-layer-row]')];
        destination.classList.add('layer-drop-target', rows.indexOf(destination) > rows.indexOf(row) ? 'layer-drop-after' : 'layer-drop-before');
      } else destination = null;
    };
    const finish = end => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', finish);
      removeEventListener('pointercancel', finish);
      if (!active) return;
      ghost.remove();
      clearTarget();
      row.classList.remove('dragging');
      list.classList.remove('layer-dragging');
      // O clique que viria depois de soltar não deve trocar a seleção.
      const swallow = click => { click.stopPropagation(); click.preventDefault(); };
      addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => removeEventListener('click', swallow, { capture: true }), 0);
      if (end.type !== 'pointerup' || this.original !== original || !this.studio.groups.canEdit) return;
      const to = document.elementFromPoint(end.clientX, end.clientY)?.closest('[data-layer-row]')?.dataset.layerRow;
      if (!to || from === to) return;
      this.mutate(slide => {
        const fromIndex = slide.elements.findIndex(item => item.id === from);
        const toIndex = slide.elements.findIndex(item => item.id === to);
        if (fromIndex < 0 || toIndex < 0) return;
        const [element] = slide.elements.splice(fromIndex, 1);
        slide.elements.splice(toIndex, 0, element);
      }, true);
      const nextList = this.studio.root.querySelector('#designer-layers');
      if (nextList) nextList.scrollLeft = list.scrollLeft;
      if (nextList && list.hasAttribute('data-mobile-open')) {
        nextList.setAttribute('data-mobile-open', '');
        this.studio.root.querySelector('[data-designer-action="mobile-layers"]')?.setAttribute('aria-expanded', 'true');
      }
    };
    if (immediate) { start(); move(event); }
    addEventListener('pointermove', move);
    addEventListener('pointerup', finish);
    addEventListener('pointercancel', finish);
  }
  historyMarkup() {
    const history = this.history();
    return ['undo', 'redo'].map((action, index) => {
      const label = index ? 'Refazer' : 'Desfazer';
      return btn(action, studioIcon(action), `aria-label="${label}" title="${label}" ${this.studio.groups.canEdit && history[action].length ? '' : 'disabled'}`);
    }).join('');
  }
  toolbarMarkup(){
    const h=this.history();
    const slide=this.display();
    return `<div class="designer-toolbar" role="toolbar" aria-label="Ferramentas do slide" data-selection-type="${slide.elements.find(item => item.id === this.selected)?.type || ''}">
      <div class="mobile-object-tools">
        ${btn('mobile-object-edit', 'Editar', 'aria-controls="designer-inspector" aria-expanded="false"')}
        <button type="button" data-font-action="open" class="mobile-object-font">Fonte</button>
        ${btn('duplicate',studioIcon('duplicate'),'aria-label="Duplicar elemento"')}
        ${btn('delete',studioIcon('trash'),'aria-label="Excluir elemento"')}
        ${btn('mobile-clear-selection','Concluir')}
      </div>
      <button type="button" class="mobile-inspector-open" data-designer-action="mobile-inspector-open" aria-controls="designer-inspector" aria-expanded="false">${studioIcon('settings')}<span>Ajustes</span></button>
      ${btn('undo', '↶', `class="desktop-history" aria-label="Desfazer" ${h.undo.length ? '' : 'disabled'}`)}${btn('redo', '↷', `class="desktop-history" aria-label="Refazer" ${h.redo.length ? '' : 'disabled'}`)}
      <span></span>${btn('add-text', studioIcon('text')+'<span>Texto</span>')}${btn('image', studioIcon('image')+'<span>Imagem</span>')}${btn('shape', studioIcon('shape')+'<span>Forma</span>')}${btn('video', studioIcon('video')+'<span>Vídeo</span>')}<details class="designer-insert-more"><summary><span class="desktop-insert-label">Inserir mais</span><span class="mobile-action-label">${studioIcon('more')}<span>Mais</span></span></summary><div><div class="mobile-history">
        ${btn('undo', '↶ Desfazer', h.undo.length ? '' : 'disabled')}${btn('redo', '↷ Refazer', h.redo.length ? '' : 'disabled')}
        ${btn('mobile-layers','Camadas', 'aria-controls="designer-layers" aria-expanded="false"')}
      </div>${btn('icon', '⊞ Ícones de objetos')}${btn('model', '◇ Modelo 3D')}${btn('simulation','⚗ Simulação')}${btn('browse-images',studioIcon('search')+' Buscar imagens')}</div></details>
      ${slideStylePicker('theme',slide)}${slideStylePicker('layout',slide)}
      <input type="file" id="designer-image-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden><input type="file" id="designer-model-files" accept=".glb,.gltf,.obj,.mtl,.bin,.png,.jpg,.jpeg,.webp,.gif,.ktx2" multiple hidden>
    </div>`;
  }
  markup(fieldsOnly = false, showTools = true) {
    const slide = this.display();
    if(this.selected!==null&&!slide.elements.some(e => e.id === this.selected)) this.selected = (slide.elements.find(e=>!e.locked)||slide.elements[0])?.id || '';
    const unavailable=[...new Set((slide.importWarnings||[]).map(w=>/^Fonte indisponível neste dispositivo: (.+)\.$/.exec(w)?.[1]).filter(Boolean))];
    return `<div class="slide-designer">${slide.importWarnings?.length?`<details class="pptx-compatibility"><summary>Compatibilidade do PPTX · ${slide.importWarnings.length} observações</summary><ul>${slide.importWarnings.map(w=>'<li>'+esc(w)+'</li>').join('')}</ul>${unavailable.map(font=>`<div class="pptx-font-replace"><span>“${esc(font)}” não existe aqui. Trocar por:</span><select data-missing-font="${esc(font)}">${['Arial','Verdana','Georgia','Trebuchet MS','Times New Roman'].map(name=>`<option value="${name}">${name}</option>`).join('')}</select>${btn('replace-font','Aplicar fonte',`data-source-font="${esc(font)}"`)}</div>`).join('')}</details>`:''}${showTools?this.toolbarMarkup():''}<div class="designer-workspace ${fieldsOnly ? 'fields-only' : ''}">${fieldsOnly ? '' : `<div class="designer-stage-wrap"><div class="designer-stage" style="--slide-aspect:${slide.sourceType&&slide.pageWidth&&slide.pageHeight?slide.pageWidth/slide.pageHeight:16/9}">${canvasMarkup(slide, { editing: true, selected: this.selected, interacting: this.interacting })}</div><div class="designer-layer-list" id="designer-layers" aria-label="Camadas do slide">${slide.elements.map((e, i) => `<span class="designer-layer-row" data-layer-row="${esc(e.id)}">${btn('select', (i + 1) + ' · ' + esc(e.type === 'text' ? e.text.slice(0, 25) || 'Texto' : e.type === 'model' ? 'Modelo 3D' : e.type === 'shape' ? 'Forma' : e.type === 'simulation' ? experimentName(e) : e.type === 'video' ? 'Vídeo' : 'Imagem'), `data-id="${e.id}" aria-pressed="${e.id === this.selected}"`)}${this.studio.groups.canEdit ? `<span class="layer-grip" data-layer-grip="${esc(e.id)}" title="Arraste para mover a camada" aria-hidden="true">&#8942;</span>` : ''}</span>`).join('')}</div></div>`}
      <aside class="designer-inspector" id="designer-inspector" data-mobile-panel="${this.mobilePanel||''}">${this.inspectorContent()}</aside></div></div>`;
  }
  inspectorContent() {
    const close = btn('mobile-inspector-close','×','class="mobile-inspector-close" aria-label="Fechar painel de edição"');
    const activities = this.studio.ai.open?'':this.studio.slideActivities();
    return close+this.inspector()+(activities?'<div class="designer-slide-activities">'+activities+'</div>':'');
  }
  backgroundControls(slide) {
    const fill=slide.backgroundFill, mode=fill?.mode||(slide.visualTheme?'theme':'solid');
    const modes=[...(slide.visualTheme?[['theme','Do tema']]:[]),['solid','Cor sólida'],['gradient','Gradiente']];
    return `<details class="inspector-background" ${this.backgroundOpen?'open':''}>
      <summary><span class="background-swatch" data-visual-theme="${slide.visualTheme||''}" data-custom-background="${Boolean(fill)}" style="background:${slideBackground(slide)}"></span><span class="setting-label">Fundo</span></summary>
      <label>Preenchimento<select data-background-mode>${modes.map(([value,label])=>`<option value="${value}" ${value===mode?'selected':''}>${label}</option>`).join('')}</select></label>
      <label>${mode==='gradient'?'Cor inicial':'Cor de base'}<input type="color" id="designer-background" value="${slide.background}"></label>
      ${mode==='gradient'?`<label>Cor final<input type="color" data-background-end value="${fill.end}"></label><label>Ângulo do gradiente<input type="range" data-background-angle min="0" max="360" value="${fill.angle}"></label>
      <div class="background-gradients" role="group" aria-label="Gradientes prontos">${backgroundGradients.map((preset,index)=>`<button type="button" class="background-gradient" data-background-gradient="${index}" style="--preset:${preset.css}" aria-label="${preset.name}: ${preset.hint}" title="${preset.name} · ${preset.hint}"><span></span></button>`).join('')}</div>`:''}
    </details>`;
  }
  animationOrder(slide) {
    const ordered=this.orderedAnimations(slide);
    return `<details class="designer-timeline" ${this.timelineOpen?'open':''}><summary>${studioIcon('animate')} Animações <span>${ordered.length}</span></summary>
      ${ordered.length?`<ol>${ordered.map(({effect,index},position)=>{
        const object=slide.elements.find(element=>element.id===effect.id);
        const name=object?.type==='text'?object.text.slice(0,44):object?.imageAlt||({image:'Imagem',shape:'Forma',model:'Modelo 3D',video:'Vídeo',simulation:experimentName(object)})[object?.type]||'Elemento';
        return `<li><div><strong>${esc(name)}</strong><small>${effect.group?'Clique '+effect.group:'Ao entrar'} · ${effect.duration} ms</small></div><div class="timeline-actions">
          ${btn('animation-up','↑',`data-effect-index="${index}" aria-label="Mover animação para cima" ${position===0?'disabled':''}`)}
          ${btn('animation-down','↓',`data-effect-index="${index}" aria-label="Mover animação para baixo" ${position===ordered.length-1?'disabled':''}`)}</div></li>`;
      }).join('')}</ol>`:'<p>Adicione uma animação a um elemento para organizar a ordem aqui.</p>'}</details>`;
  }
  orderedAnimations(slide) {
    return (slide.animations||[]).map((effect,index)=>({effect,index}))
      .sort((a,b)=>a.effect.group-b.effect.group||a.effect.delay-b.effect.delay||a.index-b.index);
  }
  settingsMarkup(s) {
    const active=this.settingTab||'';
    const background=this.backgroundControls(s).replace(/^<details[^>]*>[\s\S]*?<\/summary>/,'').replace(/<\/details>$/,'');
    const panels={background,theme:slideStylePicker('theme',s,{inspector:true})+'<div class="mobile-slide-layout">'+slideStylePicker('layout',s,{inspector:true})+'</div>',audio:audioEditor(s.audio,'slide',s.elements,{expanded:true})};
    return `<div class="slide-settings-tabs">${[['background','Fundo',`<span class="background-swatch" style="background:${slideBackground(s)}"></span>`],['theme','Tema',studioIcon('palette')],['audio','Áudio','♫']].map(([id,label,icon])=>btn('setting-'+id,icon+'<span>'+label+'</span>',`aria-pressed="${active===id}"`)).join('')}</div>${active?`<div class="slide-setting-panel">${panels[active]}</div>`:''}`;
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
    const layerIdx = e ? s.elements.indexOf(e) : -1;
    return `${!e ? `${this.settingsMarkup(s)}${this.animationOrder(s)}` : `<div class="designer-selected-heading"><strong>${{ text: 'Caixa de texto', image: 'Imagem', model: 'Modelo 3D', shape: 'Forma',simulation:'Simulação',video:'Vídeo' }[e.type]}</strong><span class="inspector-layer-badge">Camada ${layerIdx + 1}/${s.elements.length}</span></div><div class="designer-arrange" aria-label="Organizar elemento">${[
  ['duplicate', 'duplicate', 'Duplicar elemento'],
  ['forward', 'forward', 'Trazer à frente'],
  ['animation'],
  ['backward', 'backward', 'Enviar para trás'],
  ['lock', e.locked ? 'unlock' : 'lock', e.locked ? 'Desbloquear elemento' : 'Fixar elemento'],
  ['delete', 'trash', 'Excluir elemento']
].map(([action,icon,label])=>action==='animation'?elementAnimation(s,e,this.animationOpen===e.id):btn(action,studioIcon(icon),'aria-label="'+label+'" title="'+label+'"'+(action==='lock'?' aria-pressed="'+Boolean(e.locked)+'"':''))).join('')}</div>${audioEditor(e.audio || (s.audio?.trigger==='element:'+e.id?s.audio:null),'element:'+e.id)}
      ${e.type === 'text' ? `<label>Fonte${fontButton(e,this.studio.draft.customFonts)}</label><label>Texto do elemento<textarea data-element-field="text" aria-label="Texto do elemento">${esc(e.text)}</textarea></label><div class="designer-type-settings">${number('Tamanho', 'fontSize', e.fontSize, 1, 512)}<label>Cor do texto<input type="color" data-element-field="color" value="${e.color}"></label></div><div class="designer-format-row">${btn('bold', '<b>N</b>', `aria-label="Negrito" aria-pressed="${e.bold}"`)}${['left', 'center', 'right'].map((a, i) => btn('align', ['⇤', '↔', '⇥'][i], `data-align="${a}" aria-pressed="${e.align===a}" aria-label="${['Alinhar à esquerda', 'Centralizar texto', 'Alinhar à direita'][i]}"`)).join('')}</div>` : ''}
      ${e.type === 'image' ? `<div class="designer-image-actions" role="group" aria-label="Ações da imagem">${[
        ['replace-image','image','Trocar imagem'],
        ['image-reset','reload','Restaurar enquadramento'],
        ['search-image','search','Pesquisar imagem livre'],
        ['crop-image','crop',this.imageEditing===e.id?'Concluir enquadramento':'Enquadrar imagem']
      ].map(([action,icon,label])=>btn(action,studioIcon(icon),`aria-label="${label}" title="${label}" ${action==='crop-image'?`aria-pressed="${this.imageEditing===e.id}"`:''}`)).join('')}</div>
      <label>Ajuste na moldura<select data-element-field="imageFit"><option value="contain">Mostrar inteira</option><option value="cover" ${e.imageFit==='cover'?'selected':''}>Preencher</option><option value="fill" ${e.imageFit==='fill'?'selected':''}>Esticar livremente</option></select></label>
      <div class="image-crop-controls">${btn('image-minus','−','aria-label="Diminuir zoom da imagem"')}<output>${Math.round((e.imageZoom||1)*1000)/10}%</output>${btn('image-plus','+','aria-label="Aumentar zoom da imagem"')}</div>
      <div class="designer-position-grid">${number('Deslocamento X (%)','imageX',e.imageX||0,'','')}${number('Deslocamento Y (%)','imageY',e.imageY||0,'','')}</div>
      <label>Descrição da imagem<input data-element-field="imageAlt" value="${esc(e.imageAlt)}"></label>${e.imageSource||e.imageLicense?`<p class="designer-image-credit"><strong>Créditos</strong> ${esc([e.imageCredit,e.imageLicense].filter(Boolean).join(' · '))}${e.imageSource?`<a href="${esc(e.imageSource)}" target="_blank" rel="noopener noreferrer">Ver origem</a>`:''}</p>`:''}` : ''}
      ${e.type === 'model' ? `<label>Modelo<select data-element-field="model" aria-label="Modelo do elemento">${[['ssd', 'SSD SATA'], ['hdd', 'HDD'], ['nvme', 'SSD NVMe'], ['custom', e.customModel?.name || 'Meu modelo enviado']].map(([v, label]) => `<option value="${v}" ${e.model === v ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label><label>Nome do modelo<input data-element-field="modelLabel" maxlength="120" value="${esc(e.modelLabel||'')}" placeholder="${esc(e.model==='custom'?e.customModel?.name||'Modelo 3D':'Nome da peça selecionada')}"></label><label>Descrição do modelo<textarea data-element-field="modelDescription" maxlength="500" placeholder="Descrição ao explorar o modelo">${esc(e.modelDescription||'')}</textarea></label><label class="model-details-toggle"><input type="checkbox" data-element-field="modelDetailsHidden" ${e.modelDetailsHidden?'checked':''}> Mostrar somente o modelo 3D</label><div class="designer-model-actions">${btn('replace-model', '↑ Enviar GLB / GLTF / OBJ')}${btn('interact', this.interacting === e.id ? 'Voltar à edição' : 'Explorar o modelo')}</div>` : ''}
      ${e.type==='video'?`<p class="designer-video-note">${esc(videoSource(e.video)?.label||'Sem vídeo')} · o vídeo toca na apresentação; aqui aparece só a capa.</p><div class="designer-simulation-actions">${btn('change-video','Trocar link do vídeo')}</div>`:''}
      ${e.type==='simulation'?`<label>Disciplina: ${esc(experimentSubject(e))}<select data-element-field="simulation" aria-label="Tipo de simulação">${isCustomExperiment(e)?`<option value="custom" selected>Importado · ${esc(e.customSim.name)}</option>`:''}${simulationGroups.map(([subject,items])=>`<optgroup label="${esc(subject)}">${items.map(([id,name])=>`<option value="${id}" ${e.simulation===id?'selected':''}>${esc(name)}</option>`).join('')}</optgroup>`).join('')}</select></label><div class="designer-simulation-actions">${btn('interact',this.interacting===e.id?'Voltar à edição':'Experimentar no slide')}${btn('preview-simulation','Abrir laboratório')}</div>`:''}${e.type === 'shape' ? `<div class="designer-type-settings"><label>Cor da forma<input type="color" data-element-field="background" value="${e.background}"></label><label>Cor da borda<input type="color" data-element-field="borderColor" value="${e.borderColor||'#ffffff'}"></label></div>
      <div class="designer-type-settings">${number('Largura da borda','borderWidth',e.borderWidth||0,0,40)}${!['ellipse','icon'].includes(e.shapeType)?number('Curvatura','cornerRadius',e.cornerRadius??5,0,100):''}</div>` : ''}
      <span class="inspector-section-label">Posição e tamanho</span>
      <div class="designer-position-grid">${number('Posição X (%)', 'x', e.x, -1000, 1000)}${number('Posição Y (%)', 'y', e.y, -1000, 1000)}${number('Largura (%)', 'w', e.w, e.type==='image'?.1:5, 1000)}${number('Altura (%)', 'h', e.h, e.type==='image'?.1:5, 1000)}</div>

      `}
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
    const toolbar = this.studio.root.querySelector('.designer-toolbar');
    if (toolbar) toolbar.dataset.selectionType = this.display().elements.find(item => item.id === this.selected)?.type || '';
    const ids=this.selectionIds();
    for (const node of this.studio.root.querySelectorAll('.canvas-editing [data-object-id]')) { node.dataset.selected = String(ids.includes(node.dataset.objectId)); node.dataset.interacting = String(node.dataset.objectId === this.interacting);node.dataset.cropping=String(node.dataset.objectId===this.imageEditing); }
    const inspector = this.studio.root.querySelector('.designer-inspector'); if (inspector && !this.studio.ai.refreshInspectorScope()) { inspector.dataset.mobilePanel=this.mobilePanel||''; inspector.innerHTML = this.inspectorContent(); inspector.classList.remove('selection-arrive'); void inspector.offsetWidth; inspector.classList.add('selection-arrive'); }
    fillAssetAudio(this.studio.root);
    for (const button of this.studio.root.querySelectorAll('[data-designer-action="select"]')) button.setAttribute('aria-pressed', String(ids.includes(button.dataset.id)));
  }
  down(event) {
    if(!this.studio.groups.canEdit)return;
    const node = event.target.closest('.canvas-editing .canvas-object');
    if(!node&&event.target.closest('.designer-stage-wrap')&&!event.target.closest('button,input,select,textarea')){this.selected=null;this.mobilePanel='';this.interacting='';this.imageEditing='';this.refreshSelection();return;}
    if (!node || event.target.closest('[contenteditable]') || event.target.closest('button')) return;
    // Os controles da simulação respondem na hora, sem exigir o modo "Experimentar":
    // o arrasto do objeto não pode capturar o ponteiro do slider.
    if (event.target.closest('.simulation-widget :is(input,select,textarea,label,output)')) {
      if (this.interacting !== node.dataset.objectId) { this.interacting = node.dataset.objectId; this.refreshSelection(); }
      return;
    }
    if(this.imageEditing===node.dataset.objectId){this.cropDown(event,node);return;}
    this.imageEditing='';
    if(event.shiftKey){this.selectObject(node.dataset.objectId,true);event.preventDefault();return;}
    if(this.interacting===node.dataset.objectId&&!event.target.closest('[data-resize-handle]'))return;
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
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < .15) return;
    d.moved = true;
    const el = this.selectedElement();
    if (d.resize) {
      const { w, h } = d.initial;
      const minimum = el.type === 'image' ? .1 : 5;
      el.w = Math.max(minimum, Math.min(1000, w + dx));
      el.h = Math.max(minimum, Math.min(1000, h + dy));
      if(el.type==='text'){el.x=d.initial.x-(el.w-w)/2;el.y=d.initial.y-(el.h-h)/2;}
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
      if(key==='simulation'){delete el.customSim;this.studio.markDirty();this.studio.callbacks.render();return;}
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
        if(mode==='theme'){delete s.backgroundFill;s.background=canvasThemes[s.visualTheme]?.background||'#171324';}
        else {
          const theme=canvasThemes[s.visualTheme];
          const base=s.background||theme?.background||'#171324';
          // A cor final do tema só serve se for bem diferente da base; senão calculamos uma.
          const end=theme?.end&&colorDistance(theme.end,base)>120?theme.end:contrastingGradient(theme,base);
          s.backgroundFill=normalizeBackground({mode,end,angle:135});
        }
      });
      return;
    }
    if (t.id === 'designer-image-file') {
      await this.uploadImage(t.files[0], this.replaceId, this.original);
      this.replaceId = null;
    }
    if (t.id === 'designer-model-files') {
      const sourceSlide = this.original, targetId = this.replaceId, model = await importModelFiles(t.files); if (!model || sourceSlide !== this.original) return;
      this.mutate(s => { let e = s.elements.find(e => e.id === targetId && e.type === 'model'); if (!e) { if (s.elements.filter(e => e.type === 'model').length >= 2) throw Error('Use até dois modelos por slide.'); e = newElement('model'); s.elements.push(e); } e.model = 'custom'; e.customModel = model; this.selected = e.id; }); this.replaceId = null;
    }
  }
  closeMobileInspector() {
    this.mobilePanel = '';
    const root = this.studio.root;
    const inspector = root.querySelector('.designer-inspector');
    if (inspector) inspector.dataset.mobilePanel = '';
    for (const trigger of root.querySelectorAll('[aria-controls="designer-inspector"]')) trigger.setAttribute('aria-expanded', 'false');
  }
  async action(action, button, event) {
    if (action === 'mobile-inspector-close') {
      if (this.studio.ai.open) { this.studio.ai.open = false; this.studio.callbacks.render(); return; }
      const trigger = this.studio.root.querySelector('[aria-controls="designer-inspector"][aria-expanded="true"]');
      this.closeMobileInspector();
      trigger?.focus();
      return;
    }
    if (action === 'mobile-layers') {
      const layers = this.studio.root.querySelector('#designer-layers');
      if (layers) {
        const open = layers.toggleAttribute('data-mobile-open');
        button.setAttribute('aria-expanded', String(open));
      }
      return;
    }
    if (action === 'mobile-clear-selection') {
      this.closeMobileInspector();
      this.selectObject(null);
      return;
    }
    if (action === 'mobile-inspector-open' || action === 'mobile-object-edit') {
      const isSlide = action === 'mobile-inspector-open';
      if (isSlide) this.selected = null;
      this.mobilePanel = isSlide ? 'slide' : 'element';
      this.refreshSelection();
      button.setAttribute('aria-expanded', 'true');
      this.studio.root.querySelector('.mobile-inspector-close')?.focus({preventScroll: true});
      return;
    }
    if(!this.studio.groups.canEdit)return;
    const e = this.display().elements.find(e => e.id === this.selected);
    if(action==='replace-font'){
      const font=button.dataset.sourceFont;
      const replacement=button.parentElement.querySelector('select').value;
      this.mutate(slide=>{for(const item of slide.elements)if(item.type==='text'&&item.fontFamily===font)item.fontFamily=replacement;slide.importWarnings=slide.importWarnings.filter(w=>w!==`Fonte indisponível neste dispositivo: ${font}.`);});
      return;
    }
    if(action==='animation-up'||action==='animation-down'){
      const ordered=this.orderedAnimations(this.display());
      const position=ordered.findIndex(entry=>entry.index===Number(button.dataset.effectIndex));
      const next=position+(action==='animation-up'?-1:1);
      if(position<0||!ordered[next])return;
      const first=ordered[position].effect,second=ordered[next].effect;
      ordered[position].effect={...second,group:first.group,delay:first.delay};
      ordered[next].effect={...first,group:second.group,delay:second.delay};
      this.timelineOpen=true;
      this.mutate(slide=>{slide.animations=ordered.map(entry=>entry.effect);});
      return;
    }
    if(action==='background-gradient'){
      const preset=backgroundGradients[Number(button?.dataset.backgroundGradient)];
      if(!preset)return;
      this.backgroundOpen=true;
      this.mutate(slide=>{
        const [start,end]=gradientEndpoints(preset.css);
        slide.background=start;
        slide.backgroundFill=normalizeBackground({mode:'gradient',end,angle:135});
        slide.visualTheme='';
      });
      return;
    }
    if(action.startsWith('setting-')){const tab=action.slice(8);this.settingTab=this.settingTab===tab?'':tab;this.refreshSelection();return;}
    if(action==='video'){if(this.studio.groups.canEdit)this.openVideoDialog(null);return;}
    if(action==='change-video'){if(e?.type==='video')this.openVideoDialog(e.id);return;}
    if(action==='browse-images'){this.openImageSearch(null);return;}
    if(action==='search-image'){this.openImageSearch(e?.type==='image'?e.id:null);return;}
    if(action==='simulation'){if(!this.studio.groups.canEdit)return;button?.closest?.('details')?.removeAttribute('open');this.openSimulationModal('projectile',null);return;}
    if(action==='preview-simulation'){if(e?.type==='simulation')this.openSimulationModal(e.simulation,e.id,isCustomExperiment(e)?e.customSim:null);return;}
    if(action==='crop-image'){this.ensure();this.imageEditing=this.imageEditing===e.id?'':e.id;this.refreshSelection();return;}
    if(['image-plus','image-minus','image-reset'].includes(action)){
      this.mutate(s=>{const image=s.elements.find(item=>item.id===e?.id);if(!image)return;if(action==='image-reset'){image.imageZoom=1;image.imageX=image.imageY=0;}else image.imageZoom=imageZoomValue((image.imageZoom||1)*(action==='image-plus'?1.25:.8));}, true);return;
    }
    if (action === 'select') { this.selectObject(button.dataset.id,event?.shiftKey); return; }
    if (action === 'replace-image') { if (e?.type === 'image') this.openImageReplacement(e.id); return; }
    if (action === 'image') { this.openImageReplacement(); return; }
    if (action === 'model') { this.mutate(s => { if (s.elements.length >= MAX_CANVAS_ELEMENTS) throw Error(`Use até ${MAX_CANVAS_ELEMENTS} elementos no slide.`); if (s.elements.filter(item => item.type === 'model').length >= 2) throw Error('Use até dois modelos por slide.'); const model = newElement('model'); s.elements.push(model); this.selected = model.id; }); return; }
    if (action === 'replace-model') { this.replaceId = e?.id; this.studio.root.querySelector('#designer-model-files').click(); return; }
    if (action === 'interact') { this.interacting = this.interacting === e.id ? '' : e.id; this.refreshSelection(); return; }
    if (action === 'undo' || action === 'redo') {
      clearTimeout(this.cropWheelTimer);this.cropWheelBefore=null;
      const h = this.history(), from = action === 'undo' ? h.undo : h.redo, to = action === 'undo' ? h.redo : h.undo;
      if (!from.length) return; to.push(copy(this.original)); this.studio.draft.slides[this.studio.index] = from.pop(); this.studio.markDirty(); this.studio.callbacks.render(); return;
    }
    const insertShape=action==='shape'||action==='icon';
    const original=insertShape?this.original:null;
    const shape=insertShape?await pickShape():null;
    if(insertShape&&(!shape||!this.studio.groups.canEdit||this.original!==original))return;
    this.mutate(s => {
      if (s.elements.length >= MAX_CANVAS_ELEMENTS && ['add-text', 'shape', 'icon', 'duplicate'].includes(action)) throw Error(`Use até ${MAX_CANVAS_ELEMENTS} elementos no slide.`);
      let current = s.elements.find(e => e.id === this.selected);
      if (action === 'add-text' || insertShape) { current = newElement(insertShape ? 'shape' : 'text',shape||{}); s.elements.push(current); this.selected = current.id; }
      else if (!current) return;
      else if (action === 'delete') {
        s.elements=s.elements.filter(e=>e.id!==current.id);
        if(s.animations)s.animations=s.animations.filter(a=>a.id!==current.id);
      }
      else if (action === 'duplicate') { const next = { ...copy(current), id: createUuid(), x: current.x + 3, y: current.y + 3 }; s.elements.push(next); this.selected = next.id; }
      else if (action === 'bold') current.bold = !current.bold;
      else if (action === 'align') current.align = button.dataset.align;
      else if (action === 'lock') current.locked = !current.locked;
      else if (action === 'forward' || action === 'backward') { const index = s.elements.indexOf(current), next = Math.max(0, Math.min(s.elements.length - 1, index + (action === 'forward' ? 1 : -1))); s.elements.splice(index, 1); s.elements.splice(next, 0, current); }
    });
  }
  async uploadImage(file, targetId, sourceSlide) {
      if (!file) return;
      file = await optimizeImage(file);
      if (!this.studio.groups.canEdit || sourceSlide !== this.original) return;
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 1400000) throw Error('Use PNG, JPEG, WebP ou GIF de até 1,4 MB.');
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const [assetId] = await storePages([data]); if (!this.studio.groups.canEdit || sourceSlide !== this.original) return;
      this.mutate(s => { let e = s.elements.find(e => e.id === targetId && e.type === 'image'); if (!e) { if(targetId)return; if(s.elements.length>=MAX_CANVAS_ELEMENTS)throw Error(`Use até ${MAX_CANVAS_ELEMENTS} elementos no slide.`); e = newElement('image', { imageAlt: file.name }); s.elements.push(e); } e.assetId = assetId; e.image = ''; e.imageSource = e.imageLicense = e.imageCredit = ''; e.imageBackground = 'transparent'; this.selected = e.id; });
  }
  openImageReplacement(targetId, initialUrl) {
    const original = this.original;
    const dialog = document.createElement('dialog');
    dialog.className = 'storage-image-search image-replacement';
    dialog.innerHTML = `<form method="dialog" class="image-search-head"><strong>${targetId ? 'Trocar imagem' : 'Adicionar imagem'}</strong><button aria-label="Fechar">×</button></form>
      <button type="button" class="image-drop-zone" data-image-device>${studioIcon('upload')}<strong>Abrir galeria</strong><span>Arraste ou cole uma imagem aqui</span></button><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
      <form class="image-search-form"><input name="url" type="url" aria-label="Link HTTPS da imagem" placeholder="https://…" required><button>Usar link</button></form>
      <div class="image-import-preview" hidden><img alt="Prévia da imagem"><button type="button">Usar esta imagem</button></div><p role="status"></p>`;
    const picker = dialog.querySelector('input[type=file]');
    const status = dialog.querySelector('[role=status]');
    const importFile = async file => {
      if (!file) return;
      try {
        await this.uploadImage(file, targetId, original);
        if (dialog.open) dialog.close();
      } catch (error) { status.textContent = error.message; }
    };
    dialog.querySelector('[data-image-device]').onclick = () => picker.click();
    picker.onchange = () => importFile(picker.files[0]);
    const linkForm = dialog.querySelector('.image-search-form');
    dialog.addEventListener('dragover', event => event.preventDefault());
    dialog.addEventListener('drop', event => {
      event.preventDefault();
      const file = [...event.dataTransfer.files].find(item => item.type.startsWith('image/'));
      if (file) { importFile(file); return; }
      const html = new DOMParser().parseFromString(event.dataTransfer.getData('text/html'), 'text/html');
      const url = html.querySelector('img')?.getAttribute('src') || event.dataTransfer.getData('text/uri-list').split(/\r?\n/).find(line => /^https:\/\//i.test(line));
      if (url) { linkForm.elements.url.value = url; linkForm.requestSubmit(); }
    });
    dialog.addEventListener('paste', event => {
      const file = [...event.clipboardData.files].find(item => item.type.startsWith('image/'));
      if (file) { event.preventDefault(); importFile(file); return; }
      const html = new DOMParser().parseFromString(event.clipboardData.getData('text/html'), 'text/html');
      const url = html.querySelector('img')?.getAttribute('src');
      if (url?.startsWith('https://')) { event.preventDefault(); linkForm.elements.url.value = url; linkForm.requestSubmit(); }
    });
    const preview = dialog.querySelector('.image-import-preview');
    const previewImage = preview.querySelector('img');
    const confirm = preview.querySelector('button');
    const resetPreview = () => { preview.hidden = true; previewImage.removeAttribute('src'); };
    linkForm.elements.url.addEventListener('input', resetPreview);
    let pendingUrl;
    linkForm.onsubmit = async event => {
      event.preventDefault();
      resetPreview();
      try {
        const enteredUrl = linkForm.elements.url.value.trim();
        let url = new URL(enteredUrl);
        if (url.origin === 'https://www.google.com' && url.pathname === '/imgres' && url.searchParams.has('imgurl')) url = new URL(url.searchParams.get('imgurl'));
        if (url.protocol !== 'https:') { status.textContent = 'Use um link HTTPS para a imagem.'; return; }
        status.textContent = 'Verificando imagem…';
        const image = new Image();
        image.src = url.href;
        await image.decode();
        if (!dialog.open || linkForm.elements.url.value.trim() !== enteredUrl) return;
        pendingUrl = url;
        previewImage.src = url.href;
        preview.hidden = false;
        status.textContent = '';
      } catch { status.textContent = 'Use o endereço direto da imagem ou envie o arquivo pela galeria.'; }
    };
    confirm.onclick = async () => {
      if (!pendingUrl || preview.hidden) return;
      confirm.disabled = true;
      status.textContent = 'Salvando imagem…';
      try {
        const response = await fetch(pendingUrl, {credentials:'omit', signal:AbortSignal.timeout(12000)});
        if (!response.ok || !response.headers.get('Content-Type')?.startsWith('image/')) throw Error();
        const blob = await response.blob();
        if (!dialog.open) return;
        await this.uploadImage(new File([blob], 'Imagem da web', {type:blob.type}), targetId, original);
        if (dialog.open) dialog.close();
      } catch {
        status.textContent = 'Este site bloqueou o download direto ou o formato é incompatível. Copie a imagem ou salve o arquivo e envie pela galeria.';
      } finally { confirm.disabled = false; }
    };
    dialog.addEventListener('close', () => dialog.remove(), {once:true});
    document.body.append(dialog);
    dialog.showModal();
    if (initialUrl) { linkForm.elements.url.value = initialUrl; linkForm.requestSubmit(); }
  }
  openImageSearch(targetId){
    document.querySelector('#storage-image-search')?.remove();
    const dialog=document.createElement('dialog');dialog.id='storage-image-search';dialog.className='image-finder';dialog.setAttribute('aria-labelledby','image-finder-title');
    const accent=getComputedStyle(this.studio.root.querySelector('.designer-inspector')||this.studio.root).getPropertyValue('--studio-accent').trim();
    if(accent)dialog.style.setProperty('--finder-accent',accent);
    const ideas=['cachorro','sistema solar','célula animal','mapa do Brasil','vulcão','computador'];
    dialog.innerHTML=`<header class="image-finder-head"><div><h2 id="image-finder-title">Buscar imagens</h2><p>${targetId?'A imagem escolhida substitui a que está selecionada.':'Clique em uma imagem para colocá-la no slide.'}</p></div><button type="button" data-finder-close aria-label="Fechar busca de imagens">×</button></header>
      <form class="image-finder-form" role="search"><span aria-hidden="true">${studioIcon('search')}</span><input name="query" type="search" aria-label="O que você procura?" placeholder="O que você procura? Ex.: cachorro" autocomplete="off" required><button type="submit">Buscar</button></form>
      <div class="image-finder-modes" role="radiogroup" aria-label="Tipo de imagem">
        <button type="button" role="radio" aria-checked="true" data-finder-mode="all">Todas as imagens</button>
        <button type="button" role="radio" aria-checked="false" data-finder-mode="alpha"><i aria-hidden="true"></i>Só fundo transparente</button>
      </div>
      <p class="image-finder-status" role="status"></p>
      <div class="image-finder-scroll">
        <div class="image-finder-empty" data-finder-empty><strong>Digite o assunto e aperte Buscar</strong><span>Ou comece por uma destas ideias:</span><div>${ideas.map(idea=>`<button type="button" data-finder-idea="${esc(idea)}">${esc(idea)}</button>`).join('')}</div></div>
        <div class="image-finder-grid" data-finder-grid></div>
        <p class="image-finder-more" data-finder-more></p>
      </div>`;
    document.body.append(dialog);dialog.showModal();
    const form=dialog.querySelector('.image-finder-form'),input=form.elements.query,scroller=dialog.querySelector('.image-finder-scroll'),grid=dialog.querySelector('[data-finder-grid]'),status=dialog.querySelector('.image-finder-status'),empty=dialog.querySelector('[data-finder-empty]'),more=dialog.querySelector('[data-finder-more]');
    const urls=[];
    // Quando a busca exata acaba, a galeria segue com variações do mesmo assunto.
    const variants=(term,alpha)=>alpha?[term+' png',term,term+' sem fundo',term+' recortado',term+' clipart png',term+' ícone png']:[term,...['imagens','fotos','ilustração','desenho','hd','arte','exemplos'].map(extra=>term+' '+extra)];
    const seen=new Set();
    let term='',alpha=false,loading=false,ended=false,queries=[],queryIndex=0,page=0,dry=0,failures=0,token=0,shown=0,checking=0,checked=0;
    const nearEnd=()=>scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<480;
    const skeleton=count=>{for(let i=0;i<count;i++){const cell=document.createElement('div');cell.className='image-finder-skeleton';cell.setAttribute('aria-hidden','true');grid.append(cell);}};
    const clearSkeleton=()=>grid.querySelectorAll('.image-finder-skeleton').forEach(cell=>cell.remove());
    const showEmpty=(title,text,withIdeas=false)=>{empty.hidden=false;empty.querySelector('strong').textContent=title;empty.querySelector('span').textContent=text;empty.querySelector('div').hidden=!withIdeas;};
    const report=()=>{
      if(!term){status.textContent='';return;}
      if(alpha)status.textContent=shown?`${shown} ${shown===1?'imagem':'imagens'} com fundo transparente conferido${checking?' · conferindo mais…':''}`:checking||loading?`Conferindo quais imagens têm fundo transparente de verdade… (${checked} analisadas)`:'';
      else status.textContent=shown?`${shown} ${shown===1?'imagem':'imagens'} para “${term}”`:loading?'Buscando imagens…':'';
    };
    const insert=async(choice,button)=>{
      button.disabled=true;button.dataset.busy='true';
      try{
        const image=await importImageChoice(choice);const [assetId]=await storePages([image.data]);
        this.mutate(slide=>{let item=slide.elements.find(value=>value.id===targetId&&value.type==='image');if(!item){item=newElement('image');slide.elements.push(item);}item.assetId=assetId;item.image='';item.imageAlt=image.alt;item.imageSource=image.source;item.imageLicense=[image.license,image.author].filter(Boolean).join(' · ');item.imageCredit=image.catalog||'';this.selected=item.id;});
        dialog.close();
      }catch(error){this.studio.callbacks.toast(error.message);button.disabled=false;delete button.dataset.busy;}
    };
    const addCard=(choice,run)=>{
      if(run!==token)return;
      const button=document.createElement('button');button.type='button';button.className='image-finder-card';
      const img=document.createElement('img');img.alt=choice.title;img.loading='lazy';img.decoding='async';
      if(choice.blob){const url=URL.createObjectURL(choice.blob);urls.push(url);img.src=url;button.dataset.transparent='true';}
      else img.src=choice.thumbnail;
      img.onerror=()=>{if(button.isConnected){button.remove();shown--;report();}};
      const title=document.createElement('span');title.className='image-finder-title';title.textContent=choice.title;
      let host='';try{host=new URL(choice.source||choice.original||choice.url).hostname.replace(/^www\./,'');}catch{/* sem origem */}
      const origin=document.createElement('span');origin.className='image-finder-origin';origin.textContent=[host,choice.license].filter(Boolean).join(' · ');
      button.append(img);
      if(choice.blob){const badge=document.createElement('span');badge.className='image-finder-badge';badge.textContent='✓ Fundo transparente';button.append(badge);}
      button.append(title,origin);
      button.setAttribute('aria-label',`Inserir imagem: ${choice.title}${choice.blob?' (fundo transparente)':''}`);
      button.addEventListener('click',()=>insert(choice,button));
      const firstSkeleton=grid.querySelector('.image-finder-skeleton');
      if(firstSkeleton)grid.insertBefore(button,firstSkeleton);else grid.append(button);
      shown++;empty.hidden=true;report();
    };
    // Fundo transparente: cada imagem só aparece depois de conferida no arquivo original.
    const verifyAll=async(choices,run)=>{
      const queue=[...choices];
      const worker=async()=>{
        while(queue.length&&run===token&&dialog.open){
          const choice=queue.shift();checking++;report();
          const blob=await verifyTransparentChoice(choice);
          checking--;checked++;
          if(blob)addCard({...choice,blob,transparent:true},run);
          if(run===token)report();
        }
      };
      await Promise.all(Array.from({length:4},worker));
    };
    const loadMore=async()=>{
      if(loading||ended||!term||!dialog.open)return;
      loading=true;const run=token;
      more.textContent='';skeleton(shown?4:8);report();
      try{
        // Continua até encher a tela; enquanto não houver nenhuma imagem, não para.
        let burst=0;
        while(run===token&&dialog.open&&!ended&&(nearEnd()||!shown)&&burst++<(shown?4:12)){
          let choices;
          try{choices=await searchImageChoices(queries[queryIndex],++page,{transparent:alpha});failures=0;}
          catch{
            page--;
            if(run!==token)return;
            if(++failures<3){burst--;await new Promise(resolve=>setTimeout(resolve,900*failures));continue;}
            failures=0;clearSkeleton();
            if(!shown)showEmpty('Não consegui falar com o buscador','Confira a internet e tente de novo.');
            more.replaceChildren();const retry=document.createElement('button');retry.type='button';retry.textContent='Tentar de novo';retry.addEventListener('click',loadMore);more.append(retry);
            return;
          }
          if(run!==token)return;
          const fresh=choices.filter(choice=>{const key=choice.original||choice.url;if(seen.has(key))return false;seen.add(key);return true;});
          if(alpha)await verifyAll(fresh,run);else for(const choice of fresh)addCard(choice,run);
          if(run!==token)return;
          dry=fresh.length?0:dry+1;
          // Duas páginas seguidas sem novidade: passa para a próxima variação.
          if(dry>=2||page>=80||alpha&&page>=4){queryIndex++;page=0;dry=0;if(queryIndex>=queries.length)ended=true;}
        }
        if(run!==token)return;
        clearSkeleton();
        if(!shown){
          ended=true;
          if(alpha)showEmpty('Nenhuma imagem com fundo transparente','Analisei '+checked+' imagens e nenhuma tinha o fundo recortado. Tente outra palavra ou busque em “Todas as imagens”.');
          else showEmpty('Nada encontrado para “'+term+'”','Tente outra palavra, no singular ou em inglês.',true);
        }else more.textContent=ended?'Você viu todas as imagens desta busca.':'Role para carregar mais';
      }finally{if(run===token){loading=false;clearSkeleton();report();}}
    };
    const startSearch=()=>{
      const value=input.value.trim();if(!value)return;
      token++;loading=false;ended=false;term=value;
      queries=variants(term,alpha);queryIndex=0;page=0;dry=0;failures=0;shown=0;checking=0;checked=0;seen.clear();
      for(const url of urls.splice(0))URL.revokeObjectURL(url);
      grid.replaceChildren();more.textContent='';empty.hidden=true;scroller.scrollTop=0;
      loadMore();
    };
    scroller.addEventListener('scroll',()=>{if(nearEnd())loadMore();},{passive:true});
    dialog.addEventListener('click',event=>{
      if(event.target.closest('[data-finder-close]')){dialog.close();return;}
      const idea=event.target.closest('[data-finder-idea]');
      if(idea){input.value=idea.dataset.finderIdea;startSearch();return;}
      const mode=event.target.closest('[data-finder-mode]');
      if(mode){
        alpha=mode.dataset.finderMode==='alpha';
        for(const option of dialog.querySelectorAll('[data-finder-mode]'))option.setAttribute('aria-checked',String(option===mode));
        dialog.dataset.mode=mode.dataset.finderMode;
        if(input.value.trim())startSearch();
      }
    });
    dialog.addEventListener('close',()=>{token++;for(const url of urls.splice(0))URL.revokeObjectURL(url);dialog.remove();});
    form.addEventListener('submit',event=>{event.preventDefault();startSearch();});
    input.focus();
  }
  openVideoDialog(targetId=null){
    document.querySelector('#slide-video-dialog')?.remove();
    const current=targetId?this.display().elements.find(item=>item.id===targetId)?.video||'':'';
    const dialog=document.createElement('dialog');
    dialog.id='slide-video-dialog';dialog.className='video-dialog';dialog.setAttribute('aria-labelledby','slide-video-title');
    dialog.innerHTML=`<form method="dialog" novalidate><header><h2 id="slide-video-title">${targetId?'Trocar vídeo':'Inserir vídeo'}</h2><button type="button" data-video-close aria-label="Fechar">×</button></header>
      <label for="slide-video-url">Link do vídeo</label>
      <input id="slide-video-url" type="url" inputmode="url" autocomplete="off" placeholder="https://www.youtube.com/watch?v=…" value="${esc(current)}">
      <p class="video-dialog-hint" data-video-hint>Aceita YouTube, Vimeo ou link direto de arquivo .mp4 / .webm.</p>
      <div class="video-dialog-preview" data-video-preview hidden></div>
      <footer><button type="button" class="video-dialog-quiet" data-video-close>Cancelar</button><button type="submit" class="video-dialog-go" disabled>${targetId?'Trocar vídeo':'Inserir no slide'}</button></footer></form>`;
    const input=dialog.querySelector('input'),hint=dialog.querySelector('[data-video-hint]'),preview=dialog.querySelector('[data-video-preview]'),submit=dialog.querySelector('[type=submit]');
    const check=()=>{
      const value=input.value.trim(),source=videoSource(value);
      submit.disabled=!source;
      hint.dataset.state=source?'ok':value?'error':'';
      hint.textContent=source?`${source.label} reconhecido.`:value?'Não reconheci esse link. Use um link do YouTube, do Vimeo ou de um arquivo .mp4 / .webm.':'Aceita YouTube, Vimeo ou link direto de arquivo .mp4 / .webm.';
      preview.hidden=!source;
      preview.innerHTML=source?videoMarkup({video:value},false):'';
      return source;
    };
    input.addEventListener('input',check);
    dialog.addEventListener('click',event=>{if(event.target.closest('[data-video-close]'))dialog.close();});
    dialog.querySelector('form').addEventListener('submit',event=>{
      event.preventDefault();
      if(!check())return;
      const video=input.value.trim().slice(0,600);
      try{
        this.mutate(s=>{
          const existing=targetId&&s.elements.find(item=>item.id===targetId&&item.type==='video');
          if(existing){existing.video=video;this.selected=existing.id;return;}
          if(s.elements.length>=MAX_CANVAS_ELEMENTS)throw Error(`Use até ${MAX_CANVAS_ELEMENTS} elementos no slide.`);
          const item=newElement('video',{x:22,y:18,w:56,h:56,video});
          s.elements.push(item);this.selected=item.id;
        });
        dialog.close();
      }catch(error){this.studio.callbacks.toast(error.message);}
    });
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    document.body.append(dialog);check();dialog.showModal();input.focus();
  }
  openSimulationModal(initialType='projectile',targetId=null,initialCustom=null){
    document.querySelector('#simulation-lab-modal')?.remove();
    // Importados ficam na biblioteca deste navegador; o que já está no slide entra na lista também.
    let customs=loadCustomSims();
    let activeType=Object.hasOwn(simulationNames,initialType)?initialType:'projectile';
    if(initialCustom){
      let match=customs.find(item=>item.html===initialCustom.html);
      if(!match){match={id:'slide-'+createUuid(),...initialCustom,unsaved:true};customs=[match,...customs];}
      activeType='custom:'+match.id;
    }
    let activeSubject='all';
    const canEdit=this.studio.groups.canEdit;
    const modalSims=new Simulations();
    const dialog=document.createElement('dialog');
    dialog.id='simulation-lab-modal';
    dialog.className='simulation-modal';
    dialog.setAttribute('aria-labelledby','simulation-modal-title');
    const accent=getComputedStyle(this.studio.root.querySelector('.designer-inspector')||this.studio.root).getPropertyValue('--studio-accent').trim();
    if(accent)dialog.style.setProperty('--sim-accent',accent);
    const subjects=simulationGroups.map(([subject])=>subject);
    const customOf=type=>type.startsWith('custom:')?customs.find(item=>item.id===type.slice(7)):null;
    const filtersMarkup=[['all','Todas'],...subjects.map(subject=>[subject,subject]),['mine','Importados']].map(([key,label])=>`<button type="button" role="tab" class="simulation-modal-filter" data-sim-filter="${esc(key)}" aria-selected="${key===activeSubject}">${esc(label)}</button>`).join('');
    dialog.innerHTML=`<form method="dialog" class="simulation-modal-head"><div><strong id="simulation-modal-title">Laboratório de simulações</strong></div><button type="submit" class="simulation-modal-close" aria-label="Fechar">×</button></form>
      <div class="simulation-modal-body">
        <section class="simulation-modal-stage" aria-live="polite"></section>
        <aside class="simulation-modal-catalog">
          <label class="simulation-modal-select-wrap">Experimento<select class="simulation-modal-select" aria-label="Escolher experimento"></select></label>
          <div class="simulation-modal-filters" role="tablist" aria-label="Filtrar por disciplina">${filtersMarkup}</div>
          <div class="simulation-modal-list" role="listbox" aria-label="Experimentos"></div>
          ${canEdit?`<div class="simulation-modal-import"><button type="button" data-sim-import>↑ Importar experimento</button><button type="button" data-sim-template>↓ Baixar modelo para IA</button><input type="file" accept=".html,.htm,.txt,text/html,text/plain" hidden><p role="status" data-sim-import-status></p></div>`:''}
        </aside>
      </div>
      <footer class="simulation-modal-foot"><span class="simulation-modal-current"></span><div class="simulation-modal-actions"><button type="button" class="studio-btn quiet" data-sim-cancel>${canEdit?'Cancelar':'Fechar'}</button>${canEdit?`<button type="button" class="studio-btn studio-launch" data-sim-confirm>${targetId?'Aplicar no slide':'Inserir no slide'}</button>`:''}</div></footer>`;
    const stage=dialog.querySelector('.simulation-modal-stage');
    const current=dialog.querySelector('.simulation-modal-current');
    const list=dialog.querySelector('.simulation-modal-list');
    const importStatus=dialog.querySelector('[data-sim-import-status]')||document.createElement('p');
    const select=dialog.querySelector('.simulation-modal-select');
    const fileInput=dialog.querySelector('.simulation-modal-import input');
    const persist=()=>saveCustomSims(customs.filter(item=>!item.unsaved).map(({id,name,category,html})=>({id,name,category,html})));
    const renderList=()=>{
      list.innerHTML=simulationGroups.flatMap(([subject,items])=>items.map(([id,name])=>`<button type="button" role="option" class="simulation-modal-choice" data-sim-choice="${esc(id)}" data-subject="${esc(subject)}" aria-selected="${id===activeType}"><strong>${esc(name)}</strong><span>${esc(subject)}</span></button>`)).join('')
        +customs.map(item=>`<button type="button" role="option" class="simulation-modal-choice" data-sim-choice="custom:${esc(item.id)}" data-subject="${esc(item.category)}" data-mine aria-selected="${'custom:'+item.id===activeType}"><strong>${esc(item.name)}</strong><span>${esc(item.category)} · importado</span></button>`).join('');
      // No celular a lista vira um seletor só.
      select.innerHTML=simulationGroups.map(([subject,items])=>`<optgroup label="${esc(subject)}">${items.map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('')}</optgroup>`).join('')+(customs.length?`<optgroup label="Importados">${customs.map(item=>`<option value="custom:${esc(item.id)}">${esc(item.name)}</option>`).join('')}</optgroup>`:'');
      select.value=activeType;
      for(const choice of list.children)choice.hidden=activeSubject==='mine'?!choice.hasAttribute('data-mine'):activeSubject!=='all'&&choice.dataset.subject!==activeSubject;
      if(activeSubject==='mine'&&!customs.length)list.innerHTML='<p class="simulation-modal-none">Nenhum experimento importado ainda. Baixe o modelo, peça o experimento a uma IA e importe o arquivo aqui.</p>';
    };
    const renderStage=(type)=>{
      const custom=customOf(type);
      activeType=custom?type:Object.hasOwn(simulationNames,type)?type:'projectile';
      modalSims.dispose();
      if(custom){
        current.textContent=`${custom.category} · ${custom.name} (importado)`;
        stage.innerHTML=`<div class="simulation-modal-custom">${customSimMarkup(custom)}${canEdit?`<div class="simulation-modal-manage"><label>Nome<input type="text" maxlength="80" value="${esc(custom.name)}" data-sim-rename></label><label>Categoria<select data-sim-category>${subjects.map(subject=>`<option ${subject===custom.category?'selected':''}>${esc(subject)}</option>`).join('')}</select></label>${custom.unsaved?'<button type="button" data-sim-keep>Guardar na minha lista</button>':'<button type="button" data-sim-delete>Excluir da lista</button>'}</div>`:''}</div>`;
      }else{
        current.textContent=`${simulationSubjects[activeType]||'Ciências'} · ${simulationNames[activeType]}`;
        stage.innerHTML=simulationMarkup(activeType);
        modalSims.mount(stage);
      }
      for(const choice of list.querySelectorAll('[data-sim-choice]'))choice.setAttribute('aria-selected',String(choice.dataset.simChoice===activeType));
      if(select.value!==activeType)select.value=activeType;
    };
    const setFilter=(subject)=>{
      activeSubject=subject;
      for(const tab of dialog.querySelectorAll('[data-sim-filter]'))tab.setAttribute('aria-selected',String(tab.dataset.simFilter===activeSubject));
      renderList();
    };
    const importFile=async file=>{
      importStatus.textContent='';
      try{
        if(file.size>CUSTOM_SIM_MAX*4)throw Error('Arquivo grande demais para um experimento.');
        const sim=parseExperimentFile(await file.text(),file.name);
        if(customs.filter(item=>!item.unsaved).length>=40)throw Error('A lista já tem 40 experimentos importados. Exclua algum antes de importar outro.');
        const item={id:createUuid(),...sim};
        customs=[item,...customs.filter(other=>other.html!==sim.html)];
        if(!persist())importStatus.textContent='Importado, mas não coube na memória deste navegador: ele vale só até fechar esta janela.';
        else importStatus.textContent=`“${sim.name}” importado. Teste ao lado antes de inserir.`;
        activeSubject='mine';setFilter('mine');renderStage('custom:'+item.id);
      }catch(error){importStatus.textContent=error.message;}
    };
    dialog.addEventListener('click',event=>{
      const filterBtn=event.target.closest('[data-sim-filter]');
      if(filterBtn){setFilter(filterBtn.dataset.simFilter);return;}
      const choiceBtn=event.target.closest('[data-sim-choice]');
      if(choiceBtn){renderStage(choiceBtn.dataset.simChoice);return;}
      if(event.target.closest('[data-sim-cancel]')){dialog.close();return;}
      if(event.target.closest('[data-sim-import]')){fileInput.click();return;}
      if(event.target.closest('[data-sim-template]')){
        const url=URL.createObjectURL(new Blob([experimentTemplate()],{type:'text/html'}));
        const link=document.createElement('a');link.href=url;link.download='modelo-experimento-storage-lab.html';document.body.append(link);link.click();link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),2000);
        importStatus.textContent='Modelo baixado. Envie o arquivo para uma IA com o seu pedido e importe a resposta aqui.';
        return;
      }
      const custom=customOf(activeType);
      if(custom&&event.target.closest('[data-sim-delete]')){customs=customs.filter(item=>item!==custom);persist();renderList();renderStage('projectile');importStatus.textContent=`“${custom.name}” saiu da sua lista. Slides que já usam continuam funcionando.`;return;}
      if(custom&&event.target.closest('[data-sim-keep]')){delete custom.unsaved;persist();renderList();renderStage(activeType);return;}
      if(event.target.closest('[data-sim-confirm]')){
        if(!canEdit)return;
        try{
          const fields=custom?{simulation:'custom',customSim:{name:custom.name,category:custom.category,html:custom.html}}:{simulation:activeType};
          this.mutate(s=>{
            if(targetId){
              const existing=s.elements.find(item=>item.id===targetId&&item.type==='simulation');
              if(existing){delete existing.customSim;Object.assign(existing,fields);this.selected=existing.id;return;}
            }
            if(s.elements.length>=MAX_CANVAS_ELEMENTS)throw Error(`Use até ${MAX_CANVAS_ELEMENTS} elementos no slide.`);
            const item=newElement('simulation',{x:53,y:12,w:42,h:76,...fields});
            s.elements.push(item);
            this.selected=item.id;
          });
          if(dialog.open)dialog.close();
        }catch(error){this.studio.callbacks.toast(error.message);}
      }
    });
    // Renomear e trocar de categoria valem na hora, sem recarregar o experimento.
    dialog.addEventListener('input',event=>{
      const custom=customOf(activeType);if(!custom)return;
      if(event.target.matches('[data-sim-rename]')){custom.name=event.target.value.replace(/[<>]/g,'').trim().slice(0,80)||'Experimento importado';}
      else if(event.target.matches('[data-sim-category]')){custom.category=event.target.value;}
      else return;
      persist();renderList();
      current.textContent=`${custom.category} · ${custom.name} (importado)`;
      const head=stage.querySelector('.custom-sim header');
      if(head){head.querySelector('strong').textContent=custom.name;head.querySelector('span').textContent=custom.category.toUpperCase();}
    });
    select.addEventListener('change',()=>renderStage(select.value));
    fileInput?.addEventListener('change',()=>{const file=fileInput.files[0];fileInput.value='';if(file)importFile(file);});
    dialog.addEventListener('close',()=>{modalSims.dispose();dialog.remove();},{once:true});
    document.body.append(dialog);
    renderList();
    renderStage(activeType);
    dialog.showModal();
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
