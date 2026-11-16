// Testes de reconciliação do palco com markup real (canvas-view).
// Requer jsdom (instalado com --no-save no ambiente de desenvolvimento);
// sem jsdom, os testes pulam automaticamente.
import { test } from 'node:test';
import assert from 'node:assert/strict';

let dom = null;
try {
  const { JSDOM } = await import('jsdom');
  dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { pretendToBeVisual: true });
} catch { dom = null; }

if (!dom) {
  test('stage-keep dom', { skip: 'jsdom não instalado' }, () => {});
} else {
  for (const name of ['document', 'window', 'requestAnimationFrame']) globalThis[name] = dom.window[name] ?? (cb => setTimeout(cb, 16));
  const { canvasMarkup } = await import('../src/canvas-view.js');
  const { reconcileCanvas, reconcileStageSafely, tagStageSources } = await import('../src/stage-keep.js');

  const baseSlide = { id: 's1', kind: 'canvas', title: 'Slide', background: '#171324', pageWidth: 1280, pageHeight: 720,
    elements: [
      { id: 'a', type: 'text', text: 'Título', x: 10, y: 8, w: 60, h: 12, fontSize: 40, color: '#fff', bold: true, align: 'left' },
      { id: 'b', type: 'image', x: 20, y: 30, w: 30, h: 30, image: 'data:image/png;base64,x', imageAlt: 'img' },
      { id: 'c', type: 'shape', x: 60, y: 50, w: 15, h: 15, background: '#123456', borderColor: '#fff', borderWidth: 2, shape: 'rect' },
    ] };
  const clone = slide => JSON.parse(JSON.stringify(slide));
  const stageOf = slide => `<div class="designer-stage-wrap"><div class="designer-stage">${canvasMarkup(slide, { editing: true, selected: '', interacting: '' })}</div></div>`;
  const app = document.querySelector('#app');
  const mount = slide => { app.innerHTML = stageOf(slide); tagStageSources(app); return app.querySelector('.canvas-frame'); };
  const ids = frame => [...frame.querySelectorAll('[data-object-id]')].map(n => n.dataset.objectId);
  const objectNodes = frame => [...frame.querySelectorAll('[data-object-id]')];
  const freshMarkup = (slide, opts) => { const t = document.createElement('template'); t.innerHTML = canvasMarkup(slide, opts); return t.content.querySelector('.canvas-frame'); };

  test('selecionar elemento não remonta nada', () => {
    const frame = mount(baseSlide);
    const before = objectNodes(frame);
    reconcileCanvas(frame, freshMarkup(clone(baseSlide), { editing: true, selected: 'b', interacting: '' }));
    const after = objectNodes(frame);
    assert.deepEqual(before, after); // mesmos nós: nada remonta
    assert.equal(after[1].dataset.selected, 'true');
    assert.equal(after[0].dataset.selected, 'false');
  });

  test('mover elemento troca só o objeto movido', () => {
    const frame = mount(baseSlide);
    const before = objectNodes(frame);
    const moved = clone(baseSlide); moved.elements[1].x = 40; moved.elements[1].y = 44;
    reconcileCanvas(frame, freshMarkup(moved, { editing: true, selected: 'b', interacting: '' }));
    const after = objectNodes(frame);
    assert.equal(after[0], before[0]);
    assert.equal(after[2], before[2]);
    assert.notEqual(after[1], before[1]);
    assert.deepEqual(ids(frame), ['a', 'b', 'c']);
  });

  test('adicionar elemento novo entra no palco sem mexer nos outros', () => {
    const frame = mount(baseSlide);
    const before = objectNodes(frame);
    const grown = clone(baseSlide);
    grown.elements.push({ id: 'd', type: 'text', text: 'Novo', x: 5, y: 60, w: 30, h: 10, fontSize: 20, color: '#fff', bold: false, align: 'left' });
    reconcileCanvas(frame, freshMarkup(grown, { editing: true, selected: 'd', interacting: '' }));
    const after = objectNodes(frame);
    assert.deepEqual(ids(frame), ['a', 'b', 'c', 'd']);
    assert.equal(after[0], before[0]);
    assert.equal(after[1], before[1]);
  });

  test('remover elemento soma do palco', () => {
    const frame = mount(baseSlide);
    const shrunk = clone(baseSlide); shrunk.elements.splice(1, 1);
    reconcileCanvas(frame, freshMarkup(shrunk, { editing: true, selected: '', interacting: '' }));
    assert.deepEqual(ids(frame), ['a', 'c']);
  });

  test('trocar de slide troca todos os objetos corretamente', () => {
    const frame = mount(baseSlide);
    const other = clone(baseSlide); other.id = 's2'; other.elements = other.elements.map((e, i) => ({ ...e, id: 'z' + i }));
    reconcileCanvas(frame, freshMarkup(other, { editing: true, selected: '', interacting: '' }));
    assert.deepEqual(ids(frame), ['z0', 'z1', 'z2']);
  });

  test('markup idêntico não toca em nenhum nó', () => {
    const frame = mount(baseSlide);
    const before = objectNodes(frame);
    reconcileCanvas(frame, freshMarkup(clone(baseSlide), { editing: true, selected: '', interacting: '' }));
    assert.deepEqual(objectNodes(frame), before);
  });

  test('palco corrompido se auto-corrige', () => {
    const frame = mount(baseSlide);
    frame.querySelector('.slide-canvas').innerHTML = '';
    const t = document.createElement('template'); t.innerHTML = stageOf(clone(baseSlide));
    const stageEl = frame.closest('.designer-stage');
    reconcileStageSafely(stageEl, t.content.querySelector('.designer-stage'));
    assert.equal(stageEl.querySelectorAll('[data-object-id]').length, 3);
  });
}
