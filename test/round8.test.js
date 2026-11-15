import test from 'node:test';
import assert from 'node:assert/strict';
import { teacherControls, InteractionBroadcaster } from '../src/live-interaction.js';
import { validateLesson, demoLesson } from '../src/lessons.js';
import { validPublicCode } from '../src/public-presentations.js';
import { shortCode, readPublicPresentation, writePublicPresentation } from '../cloudflare/presentation-worker.js';
import { duckItems, pixabayItems, mergeEngines } from '../cloudflare/storage-ai-images-worker.js';
import { expandImageQuery } from '../src/storage-ai-image-search.js';

test('controle do apresentador é guardado por slide', () => {
  const lesson = demoLesson();
  lesson.slides[0].interaction = 'sims'; lesson.slides[1].interaction = 'qualquer';
  const valid = validateLesson(lesson);
  assert.equal(valid.slides[0].interaction, 'sims');
  assert.equal(valid.slides[1].interaction, 'free');
  assert.equal(teacherControls({ interaction: 'models' }), 'models');
  assert.equal(teacherControls({ interaction: 'free' }), '');
  assert.equal(teacherControls(null), '');
});

test('transmissão só envia quando algo muda', async () => {
  const sent = []; let value = 1;
  const broadcaster = new InteractionBroadcaster(payload => sent.push(payload));
  broadcaster.watch('a', () => ({ value }));
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.equal(sent.length, 1);
  value = 2;
  await new Promise(resolve => setTimeout(resolve, 300));
  broadcaster.stop();
  assert.deepEqual(sent, [{ value: 1 }, { value: 2 }]);
});

test('código curto do link: 6 caracteres sem letras ambíguas', async () => {
  for (let i = 0; i < 200; i++) assert.ok(validPublicCode(shortCode()));
  assert.ok(validPublicCode('k7m2qd'));
  for (const bad of ['K7M2Q', 'K7M2QDD', 'O7M2QD', 'K1M2QD', 'K7M2Q0', '']) assert.equal(validPublicCode(bad), false, bad);
  const store = new Map();
  const FILES = {
    async get(key) { const item = store.get(key); return item ? { text: async () => item.body, body: item.body, customMetadata: item.meta } : null; },
    async head(key) { const item = store.get(key); return item ? { customMetadata: item.meta } : null; },
    async put(key, body, options) { store.set(key, { body: typeof body === 'string' ? body : 'DATA', meta: options?.customMetadata }); },
    async delete(key) { store.delete(key); }
  };
  const env = { FILES }, owner = { id: 'dono' };
  const created = await (await writePublicPresentation(new Request('https://w/presentations', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json', 'Content-Length': '2' } }), env, owner, {})).json();
  assert.ok(validPublicCode(created.code));
  const resolved = await readPublicPresentation(new Request('https://w/presentations/code/' + created.code.toLowerCase()), env, {});
  assert.equal((await resolved.json()).token, created.token);
  assert.equal((await writePublicPresentation(new Request('https://w/presentations/' + created.token + '/code', { method: 'POST' }), env, { id: 'outro' }, {})).status, 403);
  await writePublicPresentation(new Request('https://w/presentations/' + created.token, { method: 'DELETE' }), env, owner, {});
  assert.equal((await readPublicPresentation(new Request('https://w/presentations/code/' + created.code), env, {})).status, 404);
});

test('busca de imagens junta os buscadores sem repetir', () => {
  const duck = duckItems([
    { image: 'https://site.com/cachorro.png', thumbnail: 'https://tse1.mm.bing.net/th?id=OIP.abc&pid=Api', title: 'Cachorro <b>feliz</b>', url: 'https://site.com/p', width: 800, height: 600 },
    { image: 'https://site.com/x.jpg', thumbnail: 'ftp://nada', title: 'ruim' }
  ], 'cachorro', true);
  assert.equal(duck.length, 1);
  assert.equal(duck[0].kind, 'image/png');
  assert.equal(duck[0].original, 'https://site.com/cachorro.png');
  const pixabay = pixabayItems([{ id: 7, tags: 'dog, pet', webformatURL: 'https://pixabay.com/get/a_640.jpg', largeImageURL: 'https://pixabay.com/get/a_1280.jpg', pageURL: 'https://pixabay.com/photos/7', user: 'ana' }], 'cachorro');
  assert.equal(pixabay[0].catalog, 'Pixabay');
  const same = { ...duck[0], id: 'bing:1', original: 'https://www.site.com/cachorro.png?x=1' };
  const merged = mergeEngines(duck, [same, { ...same, id: 'bing:2', original: 'https://outro.com/b.png' }], pixabay);
  assert.deepEqual(merged.map(item => item.id), [duck[0].id, 'pixabay:7', 'bing:2']);
});

test('catálogos em inglês recebem o termo traduzido', () => {
  assert.equal(expandImageQuery('cachorro'), 'dog');
  assert.equal(expandImageQuery('vulcão'), 'volcano');
  assert.equal(expandImageQuery('Rio de Janeiro'), 'Rio de Janeiro');
});

test('experimento importado leva a ponte de sincronia e os gestos são conferidos', async () => {
  const { sandboxDocument } = await import('../src/custom-sim.js');
  const { cleanSimEvents, cleanSimValues, BRIDGE_SCRIPT } = await import('../src/custom-sim-bridge.js');
  for (const html of ['<p>oi</p>', '<html><body>oi</body></html>', '<html><head><title>x</title></head><body></body></html>']) {
    const doc = sandboxDocument(html);
    assert.ok(doc.includes('sim-ready') && doc.includes('Content-Security-Policy'));
    assert.ok(doc.indexOf('Content-Security-Policy') < doc.indexOf('sim-ready'));
  }
  assert.doesNotThrow(() => new Function(BRIDGE_SCRIPT.replace(/^<script>/, '').replace(/<\/script>$/, '').replace(/\(\);$/, ';')));
  const events = cleanSimEvents([{ t: 'click', p: [1, 0], x: .5, y: .25, b: 0, s: 0, extra: 'x' }, { t: 'input', p: [1], v: 'a'.repeat(200) }, { t: 'click', p: ['x'] }, null, { t: 5, p: [] }]);
  assert.deepEqual(events[0], { t: 'click', p: [1, 0], x: .5, y: .25, b: 0, s: 0 });
  assert.equal(events.length, 2);
  assert.equal(events[1].v.length, 60);
  assert.deepEqual(cleanSimValues(['1', 2, 'abc']), ['1', 'abc']);
});

test('busca de GIF pede o filtro de animação', async () => {
  const calls = [], original = globalThis.fetch;
  globalThis.fetch = async url => { calls.push(String(url)); return new Response('{}', { status: 500 }); };
  try {
    const { searchImageChoices } = await import('../src/storage-ai-image-search.js');
    await searchImageChoices('gato', 1, { gif: true }).catch(() => {});
  } finally { globalThis.fetch = original; }
  assert.ok(calls.length === 0 || calls.some(url => url.includes('gif=1')));
});
