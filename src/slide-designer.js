import { audioEditor } from './audio-editor.js';
import { optimizeImage } from './image-optimize.js';
import { canvasFromSlide, newElement, canvasThemes } from './canvas-data.js';
import { canvasMarkup, CanvasModels, esc } from './canvas-view.js';
import { importModelFiles } from './model-files.js';
import { storePages, fillAssetImages } from './assets.js';
const copy = value => JSON.parse(JSON.stringify(value));
const btn = (action, text, extra = '') => `<button type="button" data-designer-action="${action}" ${extra}>${text}</button>`;
export class SlideDesigner {
  constructor(studio) {
    this.studio = studio; this.selected = ''; this.interacting = ''; this.derived = new Map(); this.histories = new Map(); this.models = new CanvasModels();
    const root = studio.root;
    root.addEventListener('click', e => { const b = e.target.closest('[data-designer-action]'); if (b) this.action(b.dataset.designerAction, b).catch(error => studio.callbacks.toast(error.message)); });
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
  display() {
    if (this.original.kind === 'canvas') return this.original;
    const signature = JSON.stringify(this.original), cached = this.derived.get(this.original.id);
    if (!cached || cached.signature !== signature) this.derived.set(this.original.id, { signature, slide: canvasFromSlide(copy(this.original)) });
    return this.derived.get(this.original.id).slide;
  }
  ensure() {
    if (this.original.kind !== 'canvas') this.studio.draft.slides[this.studio.index] = this.display();
    return this.original;
  }
  history() {
    const id = this.original.id;
    if (!this.histories.has(id)) this.histories.set(id, { undo: [], redo: [] });
    return this.histories.get(id);
  }
  record(before = copy(this.original)) {
    const h = this.history(); h.undo.push(before); if (h.undo.length > 40) h.undo.shift(); h.redo = [];
  }
  mutate(fn) {
    const before = copy(this.original); this.record(before);
    try { fn(this.ensure()); } catch (error) { this.studio.draft.slides[this.studio.index] = before; this.history().undo.pop(); throw error; }
    this.studio.markDirty(); this.studio.callbacks.render();
  }
  toolbarMarkup(){
    const h=this.history();
    return `<div class="designer-toolbar" role="toolbar" aria-label="Ferramentas do slide">
      ${btn('undo', '↶', `aria-label="Desfazer" ${h.undo.length ? '' : 'disabled'}`)}${btn('redo', '↷', `aria-label="Refazer" ${h.redo.length ? '' : 'disabled'}`)}
      <span></span>${btn('add-text', 'T Texto')}${btn('image', '▧ Imagem')}${btn('shape', '▰ Forma')}${btn('model', '◇ Modelo 3D')}${audioEditor(this.original.audio,'slide')}
      <label for="designer-theme" class="sr-only">Tema do slide</label><select id="designer-theme" aria-label="Tema do slide"><option value="">Tema</option>${Object.entries(canvasThemes).map(([k, t]) => '<option value="' + k + '">' + t.name + '</option>').join('')}</select>
      <label for="designer-layout" class="sr-only">Layout do slide</label><select id="designer-layout" aria-label="Layout do slide"><option value="">Layout</option><option value="title">Título e conteúdo</option><option value="split">Duas colunas</option><option value="spotlight">Destaque visual</option></select>
      <input type="file" id="designer-image-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden><input type="file" id="designer-model-files" accept=".glb,.gltf,.obj,.mtl,.bin,.png,.jpg,.jpeg,.webp,.gif,.ktx2" multiple hidden>
    </div>`;
  }
  markup(fieldsOnly = false, showTools = true) {
    const slide = this.display();
    if (!slide.elements.some(e => e.id === this.selected)) this.selected = (slide.elements.find(e=>!e.locked)||slide.elements[0])?.id || '';
    return `<div class="slide-designer">${slide.importWarnings?.length?`<details class="pptx-compatibility"><summary>Compatibilidade do PPTX · ${slide.importWarnings.length} observações</summary><ul>${slide.importWarnings.map(w=>'<li>'+esc(w)+'</li>').join('')}</ul></details>`:''}${showTools?this.toolbarMarkup():''}<div class="designer-workspace ${fieldsOnly ? 'fields-only' : ''}">${fieldsOnly ? '' : `<div class="designer-stage-wrap"><div class="designer-stage" style="--slide-aspect:${slide.sourceType==='pptx'?slide.pageWidth/slide.pageHeight:16/9}">${canvasMarkup(slide, { editing: true, selected: this.selected, interacting: this.interacting })}</div><p class="designer-help">Arraste para mover · use a alça para redimensionar · toque duas vezes no texto para escrever</p><div class="designer-layer-list" aria-label="Camadas do slide">${slide.elements.map((e, i) => btn('select', (i + 1) + ' · ' + esc(e.type === 'text' ? e.text.slice(0, 25) || 'Texto' : e.type === 'model' ? 'Modelo 3D' : e.type === 'shape' ? 'Forma' : 'Imagem'), `data-id="${e.id}" aria-pressed="${e.id === this.selected}"`)).join('')}</div></div>`}
      <aside class="designer-inspector">${this.inspector()}</aside></div></div>`;
  }
  inspector() {
    const s = this.display(), e = s.elements.find(e => e.id === this.selected);
    const number = (label, key, value, min, max) => `<label>${label}<input type="number" data-element-field="${key}" value="${value}" min="${min}" max="${max}" step="0.5"></label>`;
    return `<div class="designer-slide-settings"><label>Fundo do slide<input type="color" id="designer-background" value="${s.background}"></label></div>${!e ? '<p>Adicione ou selecione um elemento.</p>' : `<div class="designer-selected-heading"><strong>${{ text: 'Caixa de texto', image: 'Imagem', model: 'Modelo 3D', shape: 'Forma' }[e.type]}</strong>${btn('delete', 'Excluir', 'aria-label="Excluir elemento"')}</div>
      ${e.type === 'text' ? `<label>Texto do elemento<textarea data-element-field="text" aria-label="Texto do elemento">${esc(e.text)}</textarea></label><div class="designer-type-settings">${number('Tamanho', 'fontSize', e.fontSize, 1, 512)}<label>Cor do texto<input type="color" data-element-field="color" value="${e.color}"></label></div><div class="designer-format-row">${btn('bold', '<b>N</b>', `aria-label="Negrito" aria-pressed="${e.bold}"`)}${['left', 'center', 'right'].map((a, i) => btn('align', ['⇤', '↔', '⇥'][i], `data-align="${a}" aria-label="${['Alinhar à esquerda', 'Centralizar texto', 'Alinhar à direita'][i]}"`)).join('')}</div>` : ''}
      ${e.type === 'image' ? `<label>Descrição da imagem<input data-element-field="imageAlt" value="${esc(e.imageAlt)}"></label>${btn('replace-image', 'Trocar imagem')}${btn('crop-image',this.imageEditing===e.id?'Concluir enquadramento':'Enquadrar imagem')}<div class="image-crop-controls">${btn('image-minus','−','aria-label="Diminuir zoom da imagem"')}<output>${Math.round((e.imageZoom||1)*100)}%</output>${btn('image-plus','+','aria-label="Aumentar zoom da imagem"')}</div>${btn('image-reset','Restaurar imagem')}<small>Em Enquadrar: arraste a imagem livremente; use a pinça, a roda do mouse ou os botões para ampliar.</small>` : ''}
      ${e.type === 'model' ? `<label>Modelo exibido<select data-element-field="model" aria-label="Modelo do elemento">${[['ssd', 'SSD SATA'], ['hdd', 'HDD'], ['nvme', 'SSD NVMe'], ['custom', 'Meu modelo enviado']].map(([v, label]) => `<option value="${v}" ${e.model === v ? 'selected' : ''}>${label}</option>`).join('')}</select></label>${btn('replace-model', '↑ Enviar GLB / GLTF / OBJ')}${e.customModel ? '<small>' + esc(e.customModel.name) + '</small>' : ''}${btn('interact', this.interacting === e.id ? 'Voltar à edição' : 'Explorar o modelo')}` : ''}
      ${e.type === 'shape' ? `<label>Cor da forma<input type="color" data-element-field="background" value="${e.background}"></label>` : ''}
      <div class="designer-position-grid">${number('Posição X (%)', 'x', e.x, -1000, 1000)}${number('Posição Y (%)', 'y', e.y, -1000, 1000)}${number('Largura (%)', 'w', e.w, 5, 10000)}${number('Altura (%)', 'h', e.h, 5, 10000)}</div>
      <div class="designer-arrange">${btn('duplicate', 'Duplicar elemento')}${btn('forward', 'Trazer à frente')}${btn('backward', 'Enviar para trás')}${btn('lock', e.locked ? 'Desbloquear elemento' : 'Fixar elemento')}</div>
      <small>As posições são relativas ao slide e ficam iguais no computador e no celular.</small>`}
      <details class="designer-notes"><summary>Perguntas e roteiro</summary><label>Pergunta de discussão<textarea data-slide-field="prompt">${esc(s.prompt)}</textarea></label><label>Explicação da discussão<textarea data-slide-field="answer">${esc(s.answer)}</textarea></label><label>Notas do professor<textarea data-slide-field="note">${esc(s.note)}</textarea></label></details>`;
  }
  afterRender() {
    const root = this.studio.root.querySelector('.slide-designer');
    if(root){fillAssetImages(root);this.models.mount(root,this.display());for(const node of root.querySelectorAll('[data-object-id]'))node.dataset.cropping=String(node.dataset.objectId===this.imageEditing);}
    else this.models.mount(null, null);
  }
  selectedElement() { return this.ensure().elements.find(e => e.id === this.selected); }
  refreshSelection() {
    for (const node of this.studio.root.querySelectorAll('[data-object-id]')) { node.dataset.selected = String(node.dataset.objectId === this.selected); node.dataset.interacting = String(node.dataset.objectId === this.interacting);node.dataset.cropping=String(node.dataset.objectId===this.imageEditing); }
    const inspector = this.studio.root.querySelector('.designer-inspector'); if (inspector) { inspector.innerHTML = this.inspector(); inspector.classList.remove('selection-arrive'); void inspector.offsetWidth; inspector.classList.add('selection-arrive'); }
    for (const button of this.studio.root.querySelectorAll('[data-designer-action="select"]')) button.setAttribute('aria-pressed', String(button.dataset.id === this.selected));
  }
  down(event) {
    const node = event.target.closest('.canvas-editing .canvas-object');
    if (!node || event.target.closest('[contenteditable]') || event.target.closest('button')) return;
    if(this.imageEditing===node.dataset.objectId){this.cropDown(event,node);return;}
    this.imageEditing='';this.selected = node.dataset.objectId; this.refreshSelection();
    const el = this.display().elements.find(e => e.id === this.selected);
    if (el.locked || this.interacting === el.id) return;
    const stage = node.closest('.slide-canvas');
    this.drag = { id: el.id, before: copy(this.original), initial: copy(el), x: event.clientX, y: event.clientY, box: stage.getBoundingClientRect(), resize: Boolean(event.target.closest('[data-resize-handle]')), stage };
    stage.setPointerCapture(event.pointerId); event.preventDefault(); node.focus({ preventScroll: true });
    const now = performance.now();
    if (this.lastTap?.id === el.id && now - this.lastTap.time < 350 && el.type === 'text') { this.drag = null; this.editText(node); }
    this.lastTap = { id: el.id, time: now };
  }
  move(event) {
    if(this.cropPointers.has(event.pointerId)){this.cropMove(event);return;}
    if (!this.drag) return;
    const d = this.drag, dx = (event.clientX - d.x) / d.box.width * 100, dy = (event.clientY - d.y) / d.box.height * 100;
    if (Math.abs(dx) + Math.abs(dy) < .15) return;
    const el = this.selectedElement();
    if (d.resize) { el.w = Math.max(5, Math.min(1000, d.initial.w + dx)); el.h = Math.max(5, Math.min(1000, d.initial.h + dy)); }
    else { el.x = Math.max(-1000, Math.min(1000, d.initial.x + dx)); el.y = Math.max(-1000, Math.min(1000, d.initial.y + dy)); }
    for (const key of ['x', 'y', 'w', 'h']) el[key] = Math.round(el[key] * 10) / 10;
    const node = d.stage.querySelector('[data-object-id="' + el.id + '"]');
    Object.assign(node.style, { left: el.x + '%', top: el.y + '%', width: el.w + '%', height: el.h + '%' });
    this.studio.markDirty();
  }
  up(event) {
    if(this.cropPointers.has(event?.pointerId)){
      this.cropPointers.delete(event.pointerId);if(this.cropPointers.size){this.cropGesture();return;}
      const before=this.cropBefore;this.cropBefore=null;this.cropStart=null;if(before&&JSON.stringify(before)!==JSON.stringify(this.original)){this.record(before);this.studio.callbacks.render();}return;
    }
    if (!this.drag) return;
    const before = this.drag.before; this.drag = null;
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
    if (this.studio.receivingRemote || !this.studio.root.contains(target)) return;
    if (target.closest('.canvas-text[contenteditable]')) {
      const el = this.selectedElement(); el.text = target.innerText.slice(0, 6000); if (el.role === 'title') this.original.title = el.text.slice(0, 200);
      const label = this.studio.root.querySelector('[data-current-label]'); if (label && el.role === 'title') label.textContent = this.original.title;
      this.studio.markDirty(); return;
    }
    if (!target.dataset.elementField && !target.dataset.slideField && target.id !== 'designer-background') return;
    if (!this.studio.root.querySelector('.slide-designer')) return;
    if (!this.lastInput || Date.now() - this.lastInput > 700) this.record();
    this.lastInput = Date.now();
    const s = this.ensure(), key = target.dataset.elementField, el = s.elements.find(e => e.id === this.selected);
    if (target.id === 'designer-background') s.background = target.value;
    else if (target.dataset.slideField) s[target.dataset.slideField] = target.value;
    else if (el) {
      el[key] = ['x', 'y', 'w', 'h', 'fontSize'].includes(key) ? Number(target.value) : target.value;
      if (key === 'fontSize') el.fontSize = Math.max(1, Math.min(512, el.fontSize));
      if (['w', 'h'].includes(key)) el[key] = Math.max(5, Math.min(1000, el[key]));
      if (['x', 'y'].includes(key)) el[key] = Math.max(-1000, Math.min(1000, el[key]));
      if (key === 'text' && el.role === 'title') s.title = el.text.slice(0, 200);
    }
    this.studio.markDirty();
    const stage = this.studio.root.querySelector('.designer-stage');
    if (stage) { stage.innerHTML = canvasMarkup(s, { editing: true, selected: this.selected, interacting: this.interacting }); fillAssetImages(stage); this.models.mount(stage, s); }
  }
  async change(event) {
    const t = event.target;
    if (this.studio.receivingRemote || !this.studio.root.contains(t)) return;
    if (t.id === 'designer-theme') {
      const theme = canvasThemes[t.value]; if (theme) this.mutate(s => { s.visualTheme=t.value;s.background = theme.background; for (const e of s.elements) { if(e.type==='text')e.color=e.role==='title'?theme.accent:theme.color;if(e.type==='shape')e.background=theme.accent; } }); return;
    }
    if (t.id === 'designer-layout' && t.value) { const value = t.value; this.mutate(s => {
      const media = s.elements.filter(e => ['image', 'model'].includes(e.type)), texts = s.elements.filter(e => e.type === 'text');
      texts.forEach((e, i) => Object.assign(e, { x: 7, y: i === 0 ? 10 : 37 + (i - 1) * 18, w: value === 'split' || media.length ? 43 : 85, h: i === 0 ? 23 : 48 / Math.max(1, texts.length - 1) }));
      media.forEach((e, i) => Object.assign(e, { x: value === 'spotlight' ? 35 : 55, y: 12 + i * 36, w: value === 'spotlight' ? 59 : 39, h: 74 / Math.max(1, media.length) }));
    }); return; }
    if (t.id === 'designer-image-file') {
      let file = t.files[0]; if (!file) return;
      const sourceSlide = this.original, targetId = this.replaceId;
      file = await optimizeImage(file);
      if (sourceSlide !== this.original) return;
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 1400000) throw Error('Use PNG, JPEG, WebP ou GIF de até 1,4 MB.');
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const [assetId] = await storePages([data]); if (sourceSlide !== this.original) return;
      this.mutate(s => { let e = s.elements.find(e => e.id === targetId && e.type === 'image'); if (!e) { e = newElement('image', { imageAlt: file.name }); s.elements.push(e); } e.assetId = assetId; e.image = ''; this.selected = e.id; }); this.replaceId = null;
    }
    if (t.id === 'designer-model-files') {
      const sourceSlide = this.original, targetId = this.replaceId, model = await importModelFiles(t.files); if (!model || sourceSlide !== this.original) return;
      this.mutate(s => { let e = s.elements.find(e => e.id === targetId && e.type === 'model'); if (!e) { if (s.elements.filter(e => e.type === 'model').length >= 2) throw Error('Use até dois modelos por slide.'); e = newElement('model'); s.elements.push(e); } e.model = 'custom'; e.customModel = model; this.selected = e.id; }); this.replaceId = null;
    }
  }
  async action(action, button) {
    const e = this.display().elements.find(e => e.id === this.selected);
    if(action==='crop-image'){this.ensure();this.imageEditing=this.imageEditing===e.id?'':e.id;this.refreshSelection();return;}
    if(['image-plus','image-minus','image-reset'].includes(action)){
      this.mutate(s=>{const image=s.elements.find(item=>item.id===e?.id);if(!image)return;if(action==='image-reset'){image.imageZoom=1;image.imageX=image.imageY=0;}else image.imageZoom=Math.max(1,Math.min(1000,(image.imageZoom||1)*(action==='image-plus'?1.25:.8)));});return;
    }
    if (action === 'select') { this.selected = button.dataset.id; this.interacting = ''; this.refreshSelection(); return; }
    if (action === 'image' || action === 'replace-image') { this.replaceId = action.startsWith('replace') ? e?.id : null; this.studio.root.querySelector('#designer-image-file').click(); return; }
    if (action === 'model' || action === 'replace-model') { this.replaceId = action.startsWith('replace') ? e?.id : null; this.studio.root.querySelector('#designer-model-files').click(); return; }
    if (action === 'interact') { this.interacting = this.interacting === e.id ? '' : e.id; this.refreshSelection(); return; }
    if (action === 'undo' || action === 'redo') {
      clearTimeout(this.cropWheelTimer);this.cropWheelBefore=null;
      const h = this.history(), from = action === 'undo' ? h.undo : h.redo, to = action === 'undo' ? h.redo : h.undo;
      if (!from.length) return; to.push(copy(this.original)); this.studio.draft.slides[this.studio.index] = from.pop(); this.studio.markDirty(); this.studio.callbacks.render(); return;
    }
    this.mutate(s => {
      if (s.elements.length >= 40 && ['add-text', 'shape', 'duplicate'].includes(action)) throw Error('Use até 40 elementos no slide.');
      let current = s.elements.find(e => e.id === this.selected);
      if (action === 'add-text' || action === 'shape') { current = newElement(action === 'shape' ? 'shape' : 'text'); s.elements.push(current); this.selected = current.id; }
      else if (!current) return;
      else if (action === 'delete') s.elements = s.elements.filter(e => e.id !== current.id);
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
    const zoom=points.length>1?Math.max(1,Math.min(1000,d.zoom*Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)/Math.max(1,d.distance))):d.zoom,ratio=zoom/d.zoom;
    image.imageZoom=zoom;image.imageX=d.x*ratio+(cx-d.cx)/d.rect.width*100+(d.cx-d.rect.left-d.rect.width/2)/d.rect.width*100*(1-ratio);image.imageY=d.y*ratio+(cy-d.cy)/d.rect.height*100+(d.cy-d.rect.top-d.rect.height/2)/d.rect.height*100*(1-ratio);this.paintCrop(image);this.studio.markDirty();
  }
  paintCrop(image){const node=this.studio.root.querySelector(`[data-object-id="${image.id}"] img`);if(node)node.style.transform=`translate(${image.imageX||0}%,${image.imageY||0}%) scale(${image.imageZoom||1})`;const output=this.studio.root.querySelector('.image-crop-controls output');if(output)output.textContent=Math.round((image.imageZoom||1)*100)+'%';}
  cropWheel(event){
    const node=event.target.closest('.canvas-editing [data-object-id]');if(!node||node.dataset.objectId!==this.imageEditing)return;
    event.preventDefault();const image=this.selectedElement();if(!image)return;if(!this.cropWheelBefore||this.cropWheelSlide!==this.original.id){this.record(copy(this.original));this.cropWheelBefore=true;this.cropWheelSlide=this.original.id;}
    const rect=node.getBoundingClientRect(),before=image.imageZoom||1,zoom=Math.max(1,Math.min(1000,before*Math.exp(-Math.max(-300,Math.min(300,event.deltaY))*.002))),ratio=zoom/before;
    image.imageX=(image.imageX||0)*ratio+(event.clientX-rect.left-rect.width/2)/rect.width*100*(1-ratio);image.imageY=(image.imageY||0)*ratio+(event.clientY-rect.top-rect.height/2)/rect.height*100*(1-ratio);image.imageZoom=zoom;this.paintCrop(image);this.studio.markDirty();
    clearTimeout(this.cropWheelTimer);const slideId=this.original.id;this.cropWheelTimer=setTimeout(()=>{this.cropWheelBefore=null;if(this.original?.id===slideId)this.studio.callbacks.render();},350);
  }
  key(event) {
    if (!event.target.closest('.slide-designer') || event.target.closest('input,textarea,select,[contenteditable="plaintext-only"]')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); this.action(event.shiftKey ? 'redo' : 'undo', {}); return; }
    if (['Delete', 'Backspace'].includes(event.key)) { event.preventDefault(); this.action('delete', {}); }
    if (event.key.startsWith('Arrow') && this.selected) {
      event.preventDefault(); const amount = event.shiftKey ? 5 : 1;
      this.mutate(s => { const e = s.elements.find(e => e.id === this.selected); if (!e || e.locked) return; if (event.key === 'ArrowLeft') e.x = Math.max(-1000, e.x - amount); if (event.key === 'ArrowRight') e.x = Math.min(1000, e.x + amount); if (event.key === 'ArrowUp') e.y = Math.max(-1000, e.y - amount); if (event.key === 'ArrowDown') e.y = Math.min(1000, e.y + amount); });
    }
  }
}
