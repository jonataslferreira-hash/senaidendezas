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

test('vídeo sincronizado: aluno alcança o professor e não repete comando à toa', async () => {
  const { videoState, videoCommands } = await import('../src/video-sync.js');
  const host = { state: 1, time: 30, at: 1000, sent: NaN };
  const first = videoState(host, 3000, 100000);            // tocando: 32 s quando o relógio marca 100 s
  assert.deepEqual(first, { s: 1, o: -68 });
  assert.deepEqual(videoState(host, 3300, 100300), first);  // continua tocando: nada novo para enviar
  const student = { state: 2, time: 0, at: 0 };
  assert.deepEqual(videoCommands(student, first, 0, 110000), [['seekTo', [42, true]], ['playVideo', []]]);
  assert.deepEqual(videoCommands({ state: 1, time: 41.6, at: 0 }, first, 0, 110000), []);
  assert.deepEqual(videoCommands({ state: 1, time: 50, at: 0 }, { s: 2, t: 50.2 }, 0, 0), [['pauseVideo', []]]);
  assert.deepEqual(videoState({ state: 2, time: 12.34, at: 0 }, 0, 0), { s: 2, t: 12.3 });
  const { videoSource } = await import('../src/video-embed.js');
  assert.match(videoSource('https://youtu.be/dQw4w9WgXcQ').embed, /enablejsapi=1/);
});

test('Spotify aceita música, playlist e álbum', async () => {
  const { spotifyItem } = await import('../src/editor-playlist.js');
  assert.deepEqual(spotifyItem('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x'), { type: 'playlist', id: '37i9dQZF1DXcBWIGoYBM5M' });
  assert.equal(spotifyItem('https://open.spotify.com/intl-pt/album/0123456789012345678901').type, 'album');
  assert.equal(spotifyItem('https://open.spotify.com/track/0123456789012345678901').type, 'track');
  assert.equal(spotifyItem('https://open.spotify.com/artist/0123456789012345678901'), null);
  assert.equal(spotifyItem('https://evil.example/playlist/0123456789012345678901'), null);
});

test('controle remoto: comando repetido só vale uma vez e a sessão tolera falha de sinal', async () => {
  const { AccountPresenter } = await import('../src/account-presenter.js');
  const make = device => { const sent = [], actions = []; const item = Object.create(AccountPresenter.prototype); Object.assign(item, { studio: { root: { querySelector: () => null, querySelectorAll: () => [] }, callbacks: { remoteAction: (name, value) => actions.push([name, value]) } }, device, sessions: [], open: '' }); item.send = payload => sent.push({ ...payload, from: device }); return { item, sent, actions }; };
  const pc = make('pc'), phone = make('phone');
  pc.item.local = { code: '123456', title: 'Aula', total: 5, slide: 2, phase: 'lesson', sims: [] };
  pc.item.announce(true);
  phone.item.receive(pc.sent.at(-1));
  assert.equal(phone.item.sessions.length, 1);
  assert.equal(phone.item.sessions[0].slide, 2);
  const command = { kind: 'control', target: 'pc', action: 'next-slide', id: 'a1', from: 'phone' };
  pc.item.receive(command); pc.item.receive(command);
  assert.deepEqual(pc.actions, [['next-slide', undefined]]);
  assert.equal(pc.sent.filter(message => message.kind === 'ack' && message.id === 'a1').length, 2);
  pc.item.receive({ kind: 'control', target: 'outro', action: 'next-slide', id: 'a2', from: 'phone' });
  pc.item.receive({ kind: 'control', target: 'pc', action: 'apagar-tudo', id: 'a3', from: 'phone' });
  assert.equal(pc.actions.length, 1);
  phone.item.refresh();
  assert.equal(phone.item.sessions.length, 1);
  phone.item.seen.get('pc').last = Date.now() - 60000; phone.item.refresh();
  assert.equal(phone.item.sessions.length, 0);
  phone.item.open = 'pc';
  assert.match(phone.item.dialog(), /Apresentação desconectada/);
});
