import { HardwareViewer } from './models.js';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function canvasMarkup(slide, { editing = false, selected = '', interacting = '' } = {}) {
  return `<div class="canvas-frame ${editing ? 'canvas-editing' : 'canvas-presenting'}"><div class="slide-canvas" data-visual-theme="${slide.visualTheme||''}" style="--slide-boundary:${parseInt((slide.background||'#171324').slice(1,3),16)*.299+parseInt((slide.background||'#171324').slice(3,5),16)*.587+parseInt((slide.background||'#171324').slice(5,7),16)*.114>145?'#111':'#fff'};background:${slide.background || '#171324'}" role="group" aria-label="Slide visual: ${esc(slide.title)}">${(slide.elements || []).map(e => `<div class="canvas-object ${e.locked ? 'object-locked' : ''}" data-object-id="${esc(e.id)}" data-selected="${e.id === selected}" data-interacting="${e.id === interacting}" data-type="${e.type}" ${editing ? 'tabindex="0" role="group" aria-label="Elemento: ' + esc(e.type === 'text' ? e.text.slice(0, 60) : e.type === 'model' ? 'Modelo 3D' : e.type === 'shape' ? 'Forma' : e.imageAlt || 'Imagem') + '"' : ''} style="left:${e.x}%;top:${e.y}%;width:${e.w}%;height:${e.h}%;color:${e.color};font-size:${e.fontSize / 12.8}cqw;font-weight:${e.bold ? 700 : 400};text-align:${e.align}">
    ${e.type === 'text' ? `<div class="canvas-text" spellcheck="true">${esc(e.text)}</div>` : e.type === 'image' ? `<div class="canvas-image-window"><img style="transform:translate(${e.imageX||0}%,${e.imageY||0}%) scale(${e.imageZoom||1})" ${e.image ? 'src="' + esc(e.image) + '"' : e.assetId ? 'data-asset-id="' + esc(e.assetId) + '"' : ''} alt="${esc(e.imageAlt || 'Imagem do slide')}" draggable="false"></div>` : e.type === 'shape' ? `<div class="canvas-shape" style="background:${e.background}"></div>` : `<div class="canvas-model-slot" data-canvas-model="${esc(e.id)}"></div>`}
    ${editing ? '<span class="canvas-resize-handle" data-resize-handle aria-label="Redimensionar elemento"></span>' : e.type === 'model' && e.model !== 'custom' ? '<button class="canvas-explode" data-canvas-explode="' + esc(e.id) + '" aria-label="Abrir ou fechar camadas do modelo">Camadas</button>' : ''}
    </div>`).join('')}</div></div>`;
}
export class CanvasModels {
  constructor() { this.viewers = new Map(); this.exploded = new Set(); }
  mount(root, slide) {
    const slots = root?.querySelectorAll('[data-canvas-model]') || [], active = new Set();
    for (const slot of slots) {
      const id = slot.dataset.canvasModel, element = slide?.elements?.find(e => e.id === id);
      if (!element) continue;
      if (element.model === 'custom' && !element.customModel) { slot.innerHTML = '<p class="model-fallback">Envie seu modelo 3D nas propriedades.</p>'; continue; }
      active.add(id);
      let viewer = this.viewers.get(id);
      if (!viewer) { viewer = new HardwareViewer(); this.viewers.set(id, viewer); }
      slot.append(viewer.el);
      if (element.model === 'custom' && element.customModel) viewer.setCustomModel(element.customModel);
      else viewer.setModel(element.model || 'ssd', this.exploded.has(id));
      requestAnimationFrame(() => viewer.resize());
    }
    for (const [id, viewer] of this.viewers) if (!active.has(id)) { viewer.dispose(); this.viewers.delete(id); this.exploded.delete(id); }
    this.observer?.disconnect();
    const frame = root?.querySelector('.canvas-frame');
    if (frame) {
      this.observer = new ResizeObserver(() => {
        const canvas = frame.querySelector('.slide-canvas');
        const width = Math.min(frame.clientWidth, frame.clientHeight * 16 / 9);
        canvas.style.width = width + 'px'; canvas.style.height = width * 9 / 16 + 'px';
        for (const viewer of this.viewers.values()) viewer.resize();
      });
      this.observer.observe(frame);
    }
  }
  toggle(id, slide) {
    this.exploded.has(id) ? this.exploded.delete(id) : this.exploded.add(id);
    const el = slide.elements.find(e => e.id === id);
    if (el && el.model !== 'custom') this.viewers.get(id)?.setModel(el.model, this.exploded.has(id));
  }
}
