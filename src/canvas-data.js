import { validateCustomModel } from './model-files.js';
export const canvasThemes = {
  midnight: { name: 'Noite violeta', background: '#171324', color: '#f1eaff', accent: '#baa4f4' },
  paper: { name: 'Papel', background: '#f8f6f0', color: '#202332', accent: '#654ca0' },
  sage: { name: 'Verde sálvia', background: '#153b37', color: '#e6fff4', accent: '#a7dfc9' },
  ocean: { name: 'Azul profundo', background: '#122d49', color: '#edf7ff', accent: '#8dcaf7' }
};
export const colorValue = (v, fallback = '#f1eaff') => /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
const number = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
export function newElement(type, overrides = {}) {
  return { id: crypto.randomUUID(), type, x: 8, y: 15, w: type === 'text' ? 65 : 42, h: type === 'text' ? 18 : 60,
    text: 'Escreva sua ideia', role: '', fontSize: 36,fontFamily:'Arial',italic:false,rotation:0,verticalAlign:'start',textPadding:[0,0,0,0], color: '#f1eaff', bold: false, align: 'left', background: '#b7a0e8', image: '', imageAlt: '', imageZoom:1,imageX:0,imageY:0, model: 'ssd', customModel: null, locked: false, ...overrides };
}
export function normalizeElements(elements, draft, validateImage) {
  if (!Array.isArray(elements) || elements.length > 40) throw Error('Um slide livre pode ter até 40 elementos.');
  if (elements.filter(e => e.type === 'model').length > 2) throw Error('Use até dois modelos 3D por slide para manter a aula fluida.');
  const ids = new Set();
  return elements.map(e => {
    if (!e || !['text', 'image', 'model', 'shape'].includes(e.type)) throw Error('O slide contém um elemento inválido.');
    const w = Math.max(.1, Math.min(1000, number(e.w, 40))), h = Math.max(.1, Math.min(1000, number(e.h, 20)));
    let id = typeof e.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(e.id) ? e.id : crypto.randomUUID();
    if (ids.has(id)) id = crypto.randomUUID(); ids.add(id);
    const assetId = typeof e.assetId === 'string' && /^asset-[a-f0-9-]{36}$/.test(e.assetId) ? e.assetId : '';
    const image = validateImage(e.image), customModel = validateCustomModel(e.customModel, draft);
    if (!draft && e.type === 'image' && !image && !assetId) throw Error('Carregue a imagem do elemento antes de apresentar.');
    if (!draft && e.type === 'model' && e.model === 'custom' && !customModel) throw Error('Carregue o modelo 3D do elemento antes de apresentar.');
    return { ...newElement(e.type), id, x: Math.max(-1000, Math.min(1000, number(e.x, 8))), y: Math.max(-1000, Math.min(1000, number(e.y, 15))), w, h,
      fontFamily:String(e.fontFamily||'Arial').replace(/["'<>;{}\\]/g,'').slice(0,100),italic:Boolean(e.italic),rotation:Math.max(-360,Math.min(360,number(e.rotation,0))),verticalAlign:e.verticalAlign==='center'?'center':e.verticalAlign==='end'?'end':'start',textPadding:Array.isArray(e.textPadding)&&e.textPadding.length===4?e.textPadding.map(n=>Math.max(0,Math.min(200,number(n,0)))):[0,0,0,0],text: String(e.text || '').slice(0, 6000), role: e.role === 'title' ? 'title' : '', fontSize: Math.max(1, Math.min(512, number(e.fontSize, 36))), color: colorValue(e.color), bold: Boolean(e.bold),
      align: ['left', 'center', 'right'].includes(e.align) ? e.align : 'left', background: colorValue(e.background, '#b7a0e8'), image, imageAlt: String(e.imageAlt || '').slice(0, 500),
      imageZoom:Math.max(1,Math.min(1000,number(e.imageZoom,1))),imageX:Math.max(-100000,Math.min(100000,number(e.imageX,0))),imageY:Math.max(-100000,Math.min(100000,number(e.imageY,0))),
      ...(assetId ? { assetId } : {}), model: ['ssd', 'hdd', 'nvme', 'custom'].includes(e.model) ? e.model : 'ssd', customModel, locked: Boolean(e.locked) };
  });
}
export function canvasFromSlide(slide) {
  if (slide.kind === 'canvas') return slide;
  const elements = [];
  if (slide.kind === 'document') elements.push(newElement('image', { x: 0, y: 0, w: 100, h: 100, image: slide.image, assetId: slide.assetId, imageAlt: slide.imageAlt, locked: true }));
  else {
    const media = ['image', 'model'].includes(slide.kind);
    elements.push(newElement('text', { role: 'title', text: slide.title, x: 7, y: 12, w: media ? 45 : 85, h: 22, fontSize: 56, bold: true }));
    elements.push(newElement('text', { text: [slide.intro, ...slide.points.map(p => '• ' + p), slide.callout].filter(Boolean).join('\n\n'), x: 7, y: 39, w: media ? 43 : 85, h: 49, fontSize: 27 }));
    if (media) elements.push(newElement(slide.kind, { x: 55, y: 14, w: 39, h: 72, image: slide.image, assetId: slide.assetId, imageAlt: slide.imageAlt, model: slide.model, customModel: slide.customModel }));
  }
  return { ...slide, kind: 'canvas', background: '#171324', elements, image: '', assetId: undefined, customModel: null };
}
