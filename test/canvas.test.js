import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasFromSlide, newElement } from '../src/canvas-data.js';
import { newLesson, validateLesson } from '../src/lessons.js';
import { compactLesson } from '../src/assets.js';
import { validateCustomModel } from '../src/model-files.js';
import { Room } from '../src/room.js';
test('slide livre preserva elementos e limita posições, cores e recursos', () => {
  const lesson = newLesson();
  const canvas = canvasFromSlide(lesson.slides[0]);
  canvas.elements.push(newElement('shape', { x: -10, y: 200, w: 150, h: 10, background: 'url(evil)' }));
  lesson.slides[0] = canvas;
  const result = validateLesson(lesson), e = result.slides[0].elements.at(-1);
  assert.equal(e.x, -10); assert.equal(e.y, 200); assert.equal(e.w, 150); assert.equal(e.background, '#b7a0e8');
  const room = new Room('123456', undefined, Date.now, result);
  assert.equal(room.publicLesson().slides[0].kind, 'canvas');
  assert.equal(room.publicLesson().slides[0].elements[0].text, canvas.elements[0].text);
  assert.throws(() => validateLesson({ ...lesson, slides: [{ ...canvas, elements: Array.from({ length: 41 }, () => newElement('text')) }] }), /40 elementos/);
  assert.throws(() => validateLesson({ ...lesson, slides: [{ ...canvas, elements: Array.from({ length: 3 }, () => newElement('model')) }] }), /dois modelos/);
});
test('conversão leva a mídia para o elemento sem duplicar os bytes no slide', () => {
  const lesson = newLesson(), image = 'data:image/png;base64,YQ==', id = 'asset-00000000-0000-4000-8000-000000000000';
  const converted = canvasFromSlide({ ...lesson.slides[0], kind: 'document', image, assetId: id });
  assert.equal(converted.image, ''); assert.equal(converted.assetId, undefined);
  assert.equal(converted.elements[0].assetId, id); assert.equal(converted.elements[0].locked, true);
  lesson.slides = [converted];
  const compact = compactLesson(validateLesson(lesson));
  assert.equal(compact.slides[0].elements[0].image, '');
});
test('modelos próprios são validados, persistidos por referência e transportados com a aula', () => {
  const resource = { format: 'obj', name: 'modelo.obj', assetId: 'asset-00000000-0000-4000-8000-000000000000',
    data: JSON.stringify({ main: 'modelo.obj', files: [{ name: 'modelo.obj', data: 'data:text/plain;base64,YQ==' }] }) };
  const lesson = newLesson(); lesson.slides[0] = { ...lesson.slides[0], kind: 'model', model: 'custom', customModel: resource };
  const normalized = validateLesson(lesson);
  assert.equal(normalized.slides[0].customModel.format, 'obj');
  assert.equal(compactLesson(normalized).slides[0].customModel.data, '');
  assert.ok(normalized.slides[0].customModel.data);
  assert.throws(() => validateCustomModel({ ...resource, data: '{"files":[]}' }), /principal/);
  assert.throws(() => validateCustomModel({ ...resource, assetId: '../escape' }), /Referência/);
  assert.throws(() => validateLesson({ ...lesson, slides: [{ ...lesson.slides[0], customModel: null }] }), /Envie/);
});
