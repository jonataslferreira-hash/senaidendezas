import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_CANVAS_ELEMENTS, canvasFromSlide, newElement } from '../src/canvas-data.js';
import { newLesson, validateLesson } from '../src/lessons.js';
import { compactLesson } from '../src/assets.js';
import { validateCustomModel } from '../src/model-files.js';
import { Room } from '../src/room.js';
import { normalizeImageQuery } from '../src/storage-ai-image-search.js';
import { composeAISlide, requestedFont, requestedPalette } from '../src/storage-ai-layouts.js';
import { shapeFields, shapeIcons } from '../src/shapes.js';
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
  assert.throws(() => validateLesson({ ...lesson, slides: [{ ...canvas, elements: Array.from({ length: MAX_CANVAS_ELEMENTS + 1 }, () => newElement('text')) }] }), new RegExp(`${MAX_CANVAS_ELEMENTS} elementos`));
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

test('pedidos de imagem viram consultas curtas e pesquisáveis', () => {
  assert.equal(normalizeImageQuery('Coloque uma imagem de vários sistemas operacionais nessa página'), 'vários operating systems');
  assert.match(normalizeImageQuery('troque a imagem pela área de trabalho do windows'), /desktop.*windows/);
  assert.equal(normalizeImageQuery('troque esta foto por um SSD gamer com fundo transparente'), 'SSD gamer');
});

test('cores e fonte pedidas no texto são aplicadas ao slide', () => {
  assert.equal(requestedPalette('quero azul, verde pastel e rosa pastel'), 'pastel');
  assert.equal(requestedPalette('use azul e verde'), 'pastel');
  assert.equal(requestedPalette('quero rosa'), 'rose');
  assert.equal(requestedPalette('fundo escuro com roxo'), 'midnight');
  assert.equal(requestedPalette('sem preferência de cor'), '');
  assert.equal(requestedFont('coloca a fonte do windows 11'), 'Segoe UI');
  assert.equal(requestedFont('fonte georgia'), 'Georgia');
  assert.equal(requestedFont('pode escolher'), '');
  const design=composeAISlide({spec:{theme:'pastel',font:'Segoe UI'},index:1,title:'IA no Windows',
    body:'• Copilot integrado ao sistema\n• Automação de tarefas',images:[],model:null,previous:null});
  assert.equal(design.theme,'pastel');
  const title=design.elements.find(element=>element.role==='title');
  assert.equal(title.fontFamily,'Segoe UI');
  // As três cores pastel aparecem nas formas de apoio.
  const tinted=design.elements.filter(element=>element.type==='shape'&&element.id.startsWith('ai-decor-tint-'));
  assert.ok(tinted.length>=2);
  assert.ok(tinted.some(element=>element.background!==tinted[0].background));
});

test('ícones de objetos são formas editáveis', () => {
  assert.ok(Object.keys(shapeIcons).length>=20);
  const fields=shapeFields({shapeType:'icon',iconName:'robot'});
  assert.equal(fields.shapeType,'icon');
  assert.equal(fields.iconName,'robot');
  assert.equal(shapeFields({shapeType:'icon',iconName:'inexistente'}).iconName,'monitor');
});
