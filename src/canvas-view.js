import { colorValue } from './canvas-data.js';
import { shapeGraphic } from './shapes.js';
import {slideBackground} from './canvas-data.js';
import {simulationMarkup} from './simulations.js';
import { HardwareViewer } from './models.js';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function canvasMarkup(slide, { editing = false, selected = '', interacting = '', audioTrigger = '', audioHotspots = false } = {}) {
  return `<div class="canvas-frame ${editing ? 'canvas-editing' : 'canvas-presenting'}"><div class="slide-canvas" data-source-type="${slide.sourceType||''}" data-visual-theme="${slide.visualTheme||''}" data-custom-background="${Boolean(slide.backgroundFill)}" style="--canvas-ratio:${slide.pageWidth&&slide.pageHeight?slide.pageWidth/slide.pageHeight:16/9};aspect-ratio:${slide.pageWidth&&slide.pageHeight?slide.pageWidth/slide.pageHeight:16/9};--slide-boundary:${parseInt((slide.background||'#171324').slice(1,3),16)*.299+parseInt((slide.background||'#171324').slice(3,5),16)*.587+parseInt((slide.background||'#171324').slice(5,7),16)*.114>145?'#111':'#fff'};background:${slideBackground(slide)}" ${audioTrigger==='background'?'data-play-slide-audio="background" tabindex="0"':''} role="group" aria-label="Slide visual: ${esc(slide.title)}">${(slide.elements || []).map(e => `<div class="canvas-object ${e.locked ? 'object-locked' : ''}" data-object-id="${esc(e.id)}" data-selected="${e.id === selected}" data-interacting="${e.id === interacting}" data-type="${e.type}" ${(audioTrigger==='element:'+e.id||audioHotspots&&e.audio)?'data-play-slide-audio="element" tabindex="0" aria-label="Tocar áudio deste elemento"':''} ${editing ? 'tabindex="0" role="group" aria-label="Elemento: ' + esc(e.type === 'text' ? e.text.slice(0, 60) : e.type === 'model' ? 'Modelo 3D' : e.type === 'shape' ? 'Forma' : e.imageAlt || 'Imagem') + '"' : ''} style="left:${e.x}%;top:${e.y}%;width:${e.w}%;height:${e.h}%;color:${e.color};font-size:${e.fontSize / 12.8}cqw;font-weight:${e.bold ? 700 : 400};text-align:${e.align};font-family:&quot;${esc(e.fontFamily||'Arial')}&quot;,sans-serif;font-style:${e.italic?'italic':'normal'};transform:rotate(${e.rotation||0}deg)">
    ${e.type === 'simulation'?simulationMarkup(e.simulation):e.type === 'text' ? `<div class="canvas-text" style="display:flex;flex-direction:column;justify-content:${e.verticalAlign||'start'};padding:${(e.textPadding||[0,0,0,0]).map(n=>n/12.8+'cqw').join(' ')}" spellcheck="true">${esc(e.text)}</div>` : e.type === 'image' ? `<div class="canvas-image-window" style="background:${colorValue(e.imageBackground, 'transparent')}"><img style="object-fit:${['cover', 'fill'].includes(e.imageFit) ? e.imageFit : 'contain'};transform:translate(${e.imageX||0}%,${e.imageY||0}%) scale(${e.imageZoom||1})" ${e.image ? 'src="' + esc(e.image) + '"' : e.assetId ? 'data-asset-id="' + esc(e.assetId) + '"' : ''} alt="${esc(e.imageAlt || 'Imagem do slide')}" draggable="false"></div>` : e.type === 'shape' ? shapeGraphic(e) : `<div class="canvas-model-slot" data-canvas-model="${esc(e.id)}"></div>`}
    ${editing ? '<span class="canvas-resize-handle" data-resize-handle aria-label="Redimensionar elemento"></span>' : e.type === 'model' && e.model !== 'custom' ? '<button class="canvas-explode" data-canvas-explode="' + esc(e.id) + '" aria-label="Abrir ou fechar camadas do modelo">Camadas</button>' : ''}
    </div>`).join('')}${editing?'<i class="snap-guide guide-x" aria-hidden="true"></i><i class="snap-guide guide-y" aria-hidden="true"></i>':''}</div></div>`;
}
export class CanvasModels {
  constructor() { this.viewers = new Map(); this.exploded = new Set(); }
  preload(slide) {
    const element = slide?.elements?.find(item => item.type === 'model' && item.customModel &&
      this.viewers.get(item.id)?.customSource !== item.customModel);
    if (element && this.warm?.model === element.customModel) return;
    this.warm?.viewer.dispose();
    this.warm = null;
    if (!element) return;
    const viewer = new HardwareViewer({ defer: true });
    const ready = viewer.setCustomModel(element.customModel, element.modelLabel);
    this.warm = { model: element.customModel, viewer, ready };
  }
  mount(root, slide) {
    const slots = root?.querySelectorAll('[data-canvas-model]') || [], active = new Set(), pending = [];
    for (const slot of slots) {
      const id = slot.dataset.canvasModel, element = slide?.elements?.find(e => e.id === id);
      if (!element) continue;
      if (element.model === 'custom' && !element.customModel) { slot.innerHTML = '<p class="model-fallback">Envie seu modelo 3D nas propriedades.</p>'; continue; }
      active.add(id);
      let viewer = this.viewers.get(id);
      if (this.warm && this.warm.model === element.customModel) {
        viewer?.dispose();
        viewer = this.warm.viewer;
        pending.push(this.warm.ready.then(()=>viewer.setPresentation(element)));
        this.warm = null;
        this.viewers.set(id, viewer);
      } else if (!viewer) {
        viewer = new HardwareViewer({ defer: true });
        this.viewers.set(id, viewer);
      }
      slot.append(viewer.el);
      if (element.model === 'custom' && element.customModel) pending.push(viewer.setCustomModel(element.customModel, element.modelLabel).then(()=>viewer.setPresentation(element)));
      else { viewer.setModel(element.model || 'ssd', this.exploded.has(id)); viewer.setPresentation(element); }
      requestAnimationFrame(() => viewer.resize());
    }
    for (const [id, viewer] of this.viewers) if (!active.has(id)) { viewer.dispose(); this.viewers.delete(id); this.exploded.delete(id); }
    this.observer?.disconnect();
    const frame = root?.querySelector('.canvas-frame');
    if (frame) {
      const canvas = frame.querySelector('.slide-canvas'),editing=frame.classList.contains('canvas-editing');
      if(!editing){canvas.style.removeProperty('width');canvas.style.removeProperty('height');}
      this.observer = new ResizeObserver(() => {
        if(editing){
          const ratio=slide?.sourceType&&slide.pageWidth&&slide.pageHeight?slide.pageWidth/slide.pageHeight:16/9;
          const width = Math.min(frame.clientWidth, frame.clientHeight * ratio);
          canvas.style.width = width + 'px'; canvas.style.height = width / ratio + 'px';
        }
        for (const viewer of this.viewers.values()) viewer.resize();
      });
      this.observer.observe(frame);
    }
    return Promise.all(pending);
  }
  toggle(id, slide) {
    this.exploded.has(id) ? this.exploded.delete(id) : this.exploded.add(id);
    const el = slide.elements.find(e => e.id === id);
    if (el && el.model !== 'custom') this.viewers.get(id)?.setModel(el.model, this.exploded.has(id));
  }
}
