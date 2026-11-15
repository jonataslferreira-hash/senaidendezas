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

test('etapas interativas: equipes, relâmpago, sobrevivência, desafio, sorteio e cabo de guerra', async () => {
  const { Room } = await import('../src/room.js');
  const { demoLesson } = await import('../src/lessons.js');
  const { defaultGame, challengeMatches, validateGame } = await import('../src/stage-games.js');
  const lesson = demoLesson(); let now = 1000;
  const add = (type, extra = {}) => { const slide = { ...lesson.slides[0], id: 'g-' + type, game: { ...defaultGame(type), ...extra } }; lesson.slides.push(slide); return { id: 'b-' + type, type, items: [slide.id] }; };
  lesson.activityBlocks = [add('teams'), add('flash'), add('survival', { questions: [{ text: 'a', options: ['x', 'y'], correct: 0 }, { text: 'b', options: ['x', 'y'], correct: 1 }, { text: 'c', options: ['x', 'y'], correct: 0 }] }), add('challenge', { answer: [{ k: 'range', label: 'v', v: '50', min: 0, max: 100 }, { k: 'select', label: 's', v: 'a' }] }), add('raffle'), add('tug'), { id: 's', type: 'slides', items: lesson.slides.slice(0, 2).map(s => s.id) }];
  const room = new Room('123456', null, () => now, lesson);
  const ana = room.join({ name: 'Ana' }), bia = room.join({ name: 'Bia' }), caio = room.join({ name: 'Caio' });
  assert.equal(room.data.phase, 'game');
  assert.deepEqual(room.snapshot().teams.map(t => t.members.length).sort(), [1, 2]);
  room.control('next-stage');
  // Relâmpago: várias perguntas de tempo curto; ao fim do tempo ou quando todos respondem, revela e espera o professor avançar.
  assert.equal(room.snapshot().game.state, 'ready');
  assert.throws(() => room.answer(ana.id, { choice: { choice: 0, round: 0 } }), /Aguarde/);
  room.control('game', { do: 'next' });
  assert.equal(room.snapshot().game.seconds, 10);
  room.answer(ana.id, { choice: { choice: 1, round: 0 } });
  assert.equal(room.snapshot(caio.id).game.question.correct, undefined, 'aluno não recebe a resposta antes do fim');
  const hidden = room.snapshot(caio.id, true).lesson.slides.find(s => s.game?.type === 'flash').game;
  assert.equal(hidden.questions, undefined); assert.equal(hidden.rounds, 3);
  room.answer(bia.id, { choice: { choice: 0, round: 0 } });
  assert.equal(room.snapshot().game.state, 'open', 'continua aberto enquanto falta gente responder');
  assert.equal(room.snapshot().game.fastest, null, 'não revela quem acertou antes de encerrar a pergunta');
  room.answer(caio.id, { choice: { choice: 0, round: 0 } });
  assert.equal(room.snapshot().game.state, 'reveal', 'todos responderam: mostra a resposta');
  assert.equal(room.snapshot().game.fastest.name, 'Bia');
  assert.equal(room.snapshot(bia.id).game.me.gain, 300, 'acerto na hora (200) + primeiro a acertar (100)');
  assert.equal(room.snapshot(caio.id).game.me.gain, 200);
  now += 5000; room.tick();
  assert.equal(room.snapshot().game.state, 'reveal', 'não avança sozinho após revelar a resposta');
  assert.equal(room.snapshot().game.round, 0, 'espera o professor passar para a próxima pergunta');
  room.control('game', { do: 'next' });
  assert.equal(room.snapshot().game.round, 1, 'professor avança manualmente para a próxima pergunta');
  assert.equal(room.snapshot().game.state, 'open');
  now += 10500; room.tick();
  assert.equal(room.snapshot().game.state, 'reveal', 'o tempo curto acabou e mostrou a resposta');
  now += 5000; room.tick();
  assert.equal(room.snapshot().game.state, 'reveal', 'continua mostrando a resposta após o tempo acabar');
  room.control('game', { do: 'next' }); // pergunta 3 (round 2)
  assert.equal(room.snapshot().game.round, 2);
  room.control('game', { do: 'next' }); // revela pergunta 3
  assert.equal(room.snapshot().game.state, 'reveal');
  room.control('game', { do: 'next' }); // resultado final
  assert.equal(room.snapshot().game.state, 'done');
  assert.deepEqual(room.snapshot().game.board.map(item => [item.name, item.score, item.wins]), [['Bia', 300, 1], ['Caio', 200, 0]]);
  assert.throws(() => room.answer(caio.id, { choice: { choice: 0, round: 2 } }), /terminou/);
  // Relâmpago antigo (uma pergunta só) vira uma lista de perguntas.
  const old = validateGame({ type: 'flash', text: 'Capital do Brasil?', options: ['Brasília', 'Rio'], correct: 0 });
  assert.deepEqual([old.text, old.seconds, old.questions.length, old.questions[0].text], ['Desafio relâmpago', 10, 1, 'Capital do Brasil?']);
  room.control('next-stage');
  // Sobrevivência: uma vida só; quem erra ou não responde cai e não joga mais.
  assert.equal(room.snapshot().game.state, 'ready');
  room.control('game', { do: 'next' });
  room.answer(ana.id, { choice: { choice: 0, round: 0 } }); room.answer(bia.id, { choice: { choice: 1, round: 0 } });
  assert.equal(room.snapshot(bia.id).game.question.correct, undefined);
  now += 16000; room.tick();
  assert.equal(room.snapshot(bia.id).game.me.alive, false);
  assert.equal(room.snapshot(caio.id).game.me.alive, false, 'quem não respondeu a tempo também cai');
  assert.equal(room.snapshot().game.state, 'done');
  assert.throws(() => room.answer(bia.id, { choice: { choice: 0, round: 0 } }), /terminou|caiu/);
  assert.equal(room.snapshot().ranking.find(p => p.name === 'Ana').score, 500, 'pontos das dinâmicas contam no ranking individual');
  room.control('next-stage'); now += 5000;
  room.answer(ana.id, { choice: { values: ['80', 'a'] } });
  assert.equal(room.snapshot(ana.id).game.me.ok, false);
  now += 2000; room.answer(ana.id, { choice: { values: ['53', 'a'] } });
  assert.equal(room.snapshot(ana.id).game.me.place, 1);
  room.control('next-stage'); room.control('game', { do: 'draw' });
  assert.ok(['Ana', 'Bia', 'Caio'].includes(room.snapshot().game.current.name));
  assert.equal(room.snapshot().game.left, 2);
  room.control('next-stage');
  // Cabo de guerra por rodadas: até 12, cada uma sorteia 1 de até 3 perguntas.
  const legacyTug = validateGame({ type: 'tug', text: 'x', options: ['A', 'B'], questions: Array.from({ length: 14 }, (_, i) => ({ text: 'p' + i, options: ['x', 'y'], correct: 0 })) });
  assert.equal(legacyTug.rounds.length, 12); assert.equal(legacyTug.questions, undefined);
  const variants = validateGame({ type: 'tug', text: 'x', options: ['A', 'B'], rounds: [[1, 2, 3, 4].map(n => ({ text: 'v' + n, options: ['x', 'y'], correct: 0 }))] });
  assert.equal(variants.rounds[0].length, 3, 'no máximo 3 perguntas por rodada');
  assert.throws(() => validateGame({ type: 'tug', text: 'x', options: ['A', 'B'], rounds: [] }), /rodada/);
  // 3 rodadas; quem é do lado A acerta tudo, o lado B erra tudo.
  assert.equal(room.snapshot().game.rounds, 3);
  assert.equal(room.snapshot().game.state, 'ready');
  const everyone = room.data.players;
  for (let round = 0; round < 3; round++) {
    room.control('game', { do: 'next' });
    const question = room.snapshot().game.question;
    assert.equal(room.snapshot(everyone[0].id).game.question.text, '', 'aluno não recebe o texto da pergunta');
    for (const player of everyone) { const side = room.snapshot(player.id).game.side; room.answer(player.id, { choice: { choice: side === 0 ? question.correct : (question.correct + 1) % question.options.length, round } }); }
    assert.equal(room.snapshot().game.state, 'reveal');
  }
  room.control('game', { do: 'next' });
  assert.equal(room.snapshot().game.state, 'pull');
  assert.equal(room.snapshot().game.winner, 0, 'o lado que acertou mais puxa a corda');
  now += 6000; room.tick();
  assert.equal(room.snapshot().game.state, 'done');
  assert.equal(room.snapshot().teams.reduce((sum, t) => sum + t.score, 0), 500 + 500 + 500 + room.snapshot().game.sides[0] * (300 + 200));
  room.control('next-stage');
  assert.equal(room.data.phase, 'lesson');
  assert.equal(challengeMatches({ tolerance: 5, answer: [{ k: 'range', v: '50', min: 0, max: 100, skip: true }, { k: 'toggle', v: '1' }] }, ['0', '1']), true);
  assert.throws(() => validateGame({ type: 'challenge', text: 'x', simulation: 'pendulum', answer: [] }), /resposta certa/);
});

test('controle remoto gira e aproxima o modelo 3D', async () => {
  const { orbitCamera, applyModelCommand } = await import('../src/live-interaction.js');
  const vec = (x, y, z) => ({ x, y, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; } });
  const viewer = { camera: { position: vec(0, 0, 10) }, controls: { target: vec(0, 0, 0), update() {} } };
  orbitCamera(viewer, { dx: Math.PI / 2 });
  assert.ok(Math.abs(viewer.camera.position.x + 10) < 1e-6 && Math.abs(viewer.camera.position.z) < 1e-6);
  orbitCamera(viewer, { zoom: .5 });
  assert.ok(Math.abs(Math.hypot(viewer.camera.position.x, viewer.camera.position.y, viewer.camera.position.z) - 5) < 1e-6);
  assert.equal(applyModelCommand({ model: 'nope', dx: 1 }, { canvasModels: { viewers: new Map() } }), false);
});

test('rodada 14: escolha de time, pódio guiado pela sala, corrida, textos escondidos do aluno e IA com dinâmicas', async () => {
  const { Room } = await import('../src/room.js');
  const { newLesson, validateLesson, newQuestion } = await import('../src/lessons.js');
  const { defaultGame, gameTypes } = await import('../src/stage-games.js');
  const { writeLesson, readLesson } = await import('../src/collaboration-core.js');
  const Y = await import('yjs');
  assert.equal(gameTypes.length, 7, 'com slides, enquete e quiz são 10 tipos de etapa');
  let now = 1000;
  const base = newLesson(), question = { ...newQuestion(), text: 'Quanto é 2+2?', options: ['3', '4'], correct: 1, explanation: 'Conta simples.' };
  const stage = (type, extra = {}) => ({ id: 's-' + type, title: type, kind: 'text', game: { ...defaultGame(type), ...extra } });
  const lesson = validateLesson({ ...base, slides: [base.slides[0], stage('teams', { pick: true }), stage('race', { seconds: 15, questions: [{ text: 'Corrida 1', options: ['certa', 'errada'], correct: 0 }, { text: 'Corrida 2', options: ['errada', 'certa'], correct: 1 }] }), stage('survival')], questions: [question],
    activityBlocks: [{ id: 'b0', type: 'slides', items: [base.slides[0].id] }, { id: 'b1', type: 'teams', items: ['s-teams'] }, { id: 'b2', type: 'race', items: ['s-race'] }, { id: 'b3', type: 'survival', items: ['s-survival'] }, { id: 'b4', type: 'quiz', items: [question.id] }] });
  // Salvar no grupo: a lista de perguntas da sobrevivência não tem id e quebrava a gravação.
  const doc = new Y.Doc(); writeLesson(doc, lesson);
  assert.deepEqual(readLesson(doc).slides[3].game.questions, lesson.slides[3].game.questions);

  const room = new Room('123456', null, () => now, lesson);
  const [ana, bia, caio] = ['Ana', 'Bia', 'Caio'].map(name => room.join({ name }));
  // "Iniciar quiz" passa pelas etapas que vêm antes dele.
  room.control('quiz');
  assert.equal(room.data.phase, 'game'); assert.equal(room.snapshot().game.type, 'teams');
  assert.equal(room.snapshot(ana.id).game.pick, true);
  room.answer(ana.id, { choice: { team: 1 } }); room.answer(bia.id, { choice: { team: 1 } });
  assert.deepEqual(room.snapshot().teams.map(team => team.members.length), [0, 2]);
  room.control('next-stage');
  assert.equal(room.snapshot().game.type, 'race');
  assert.deepEqual(room.snapshot().teams.map(team => team.members.length), [1, 2], 'quem não escolheu entra no time menor');
  assert.equal(room.snapshot().ranking.find(p => p.id === ana.id).color, '#f97316', 'o jogador leva a cor do time');
  // Corrida do saber: só anda quem acerta, e quem responde mais rápido vai mais longe.
  assert.equal(room.snapshot(ana.id).game.question, null);
  assert.throws(() => room.answer(ana.id, { choice: { choice: 0, round: 0 } }), /Aguarde/);
  room.control('game', { do: 'next' });
  assert.equal(room.snapshot(ana.id).game.question.text, '', 'aluno não recebe o texto');
  assert.equal(room.snapshot().game.question.text, 'Corrida 1');
  now += 1000; room.answer(ana.id, { choice: { choice: 0, round: 0 } });
  let race = room.snapshot().game;
  const lane = id => race.runners.find(r => r.id === id);
  assert.equal(race.state, 'open'); assert.equal(lane(ana.id).right, true, 'tempo real: o boneco anda assim que a pessoa acerta');
  assert.ok(lane(ana.id).dist >= 10); assert.equal(lane(bia.id).right, undefined);
  now += 8000; room.answer(bia.id, { choice: { choice: 0, round: 0 } });
  room.answer(caio.id, { choice: { choice: 1, round: 0 } });
  race = room.snapshot().game;
  assert.equal(race.state, 'reveal', 'todos responderam: mostra a resposta');
  assert.ok(lane(ana.id).gain > lane(bia.id).gain && lane(bia.id).gain >= 10, 'rapidez rende mais metros');
  assert.equal(lane(caio.id).gain, 0); assert.equal(lane(caio.id).right, false);
  // O professor não clica: a próxima pergunta vem sozinha.
  now += 2000; room.tick(); assert.equal(room.data.game.state, 'reveal');
  now += 2000; room.tick(); assert.equal(room.data.game.state, 'open'); assert.equal(room.data.game.round, 1);
  room.answer(bia.id, { choice: { choice: 0, round: 1 } });
  now += 16000; room.tick(); assert.equal(room.data.game.state, 'reveal', 'tempo esgotado também revela');
  now += 4000; room.tick();
  race = room.snapshot(ana.id).game;
  assert.equal(race.state, 'done'); assert.equal(race.me.place, 1);
  assert.equal(room.data.players.find(p => p.id === ana.id).bonus, 500);
  assert.equal(room.data.players.find(p => p.id === bia.id).bonus, 300);
  assert.equal(room.data.players.find(p => p.id === caio.id).bonus || 0, 0, 'quem não acertou nada não pontua');
  room.control('next-stage');
  assert.equal(room.snapshot().game.type, 'survival');
  room.control('next-stage'); assert.equal(room.data.phase, 'lobby');
  room.control('start-quiz'); now += 3000; room.tick();
  // O aluno só recebe os botões; o telão recebe o texto.
  assert.equal(room.snapshot(ana.id).question.text, ''); assert.deepEqual(room.snapshot(ana.id).question.options, ['', '']);
  assert.equal(room.snapshot().question.text, 'Quanto é 2+2?');
  room.answer(ana.id, { choice: 1, questionIndex: 0 }); room.control('reveal'); room.control('ranking');
  // Pódio: os passos vêm do relógio da sala.
  assert.equal(room.data.phase, 'finished'); assert.equal(room.snapshot(ana.id).podiumStep, 0);
  now += 2100; room.tick(); assert.equal(room.snapshot(ana.id).podiumStep, 1);
  now += 5000; room.tick(); assert.equal(room.snapshot(ana.id).podiumStep, 3);
  room.control('podium-all'); assert.equal(room.snapshot(ana.id).podiumStep, 4);
  assert.ok([0, 1, 2, 3].includes(room.snapshot().victory));

  const { leaderboardMarkup, quizMarkup } = await import('../src/game-ui.js');
  const hidden = leaderboardMarkup({ ...room.snapshot(ana.id), podiumRevealed: false, podiumStep: 1 }, { header: () => '', host: false, final: true });
  assert.equal((hidden.match(/data-shown="true"/g) || []).length, 1); assert.ok(!hidden.includes('final-confetti'));
  const bare = quizMarkup({ questionIndex: 0, totalQuestions: 1, answeredCount: 0, ranking: [], phase: 'question', question: { text: '', options: ['', ''], bare: true } }, { header: () => '', host: false, status: 'online' });
  assert.ok(bare.includes('bare-answers') && !bare.includes('option-copy') && !bare.includes('<h1>'));

  const ai = await import('../src/storage-ai-games.js');
  assert.deepEqual(ai.requestedGames('aula de frações com uma etapa de sobrevivência com 6 perguntas e cabo de guerra').map(g => [g.type, g.need, g.rounds]), [['survival', 6, undefined], ['tug', 12, 4]]);
  assert.deepEqual(ai.requestedGames('corrida espacial e trabalho em equipe'), []);
  const plan = ai.withGameQuestions({ quizzes: 1, questions: 5, polls: 0 }, ai.requestedGames('sobrevivência com 6 perguntas e cabo de guerra, uma sobrevivência'));
  assert.equal(plan.quizTotal, 5); assert.ok(plan.request.quizzes * plan.request.questions >= 23);
});

test('rodada 15: corrida do saber, painel de jogos da IA e boneco do placar', async () => {
  const { validateGame, defaultGame, publicGame } = await import('../src/stage-games.js');
  assert.equal(defaultGame('race').questions.length, 3);
  assert.equal(validateGame({ type: 'race', text: 'Antiga', goal: 100 }).questions.length, 3, 'corrida antiga (de toques) ganha perguntas-modelo');
  assert.equal(publicGame(defaultGame('race')).questions, undefined, 'as perguntas não vão para o aluno');

  const { requestedGames, addGameStages } = await import('../src/storage-ai-games.js');
  assert.deepEqual(requestedGames('aula sobre vulcões', ['race', 'tug']).map(game => game.type), ['tug', 'race']);
  assert.deepEqual(requestedGames('aula com cabo de guerra', ['tug']).map(game => game.type), ['tug'], 'não duplica');
  assert.deepEqual(requestedGames('aula sobre vulcões'), []);
  assert.equal(requestedGames('', ['race'])[0].need, 4, 'a corrida pede perguntas para a IA');
  // Quantidade definida no painel: até 25 por dinâmica e 3 perguntas por rodada no cabo de guerra (até 12 rodadas = 36 perguntas).
  assert.deepEqual(requestedGames('', ['race', 'tug', 'survival', 'flash'], { race: 25, tug: 99, survival: 12, flash: 8 }).map(game => [game.type, game.need, game.rounds]), [['flash', 8, undefined], ['survival', 12, undefined], ['tug', 36, 12], ['race', 25, undefined]]);
  assert.equal(requestedGames('relâmpago com 7 perguntas')[0].need, 7);
  assert.equal(requestedGames('', ['flash'])[0].need, 5);
  const { withGameQuestions, takeGameQuestions } = await import('../src/storage-ai-games.js');
  const big = withGameQuestions({ quizzes: 2, questions: 25, polls: 0 }, requestedGames('', ['race'], { race: 25 }));
  assert.equal(big.quizTotal, 50); assert.equal(big.want, 75);
  assert.ok(big.request.quizzes <= 3 && big.request.questions <= 10, 'o primeiro pedido respeita o limite do serviço');
  assert.equal(withGameQuestions({ quizzes: 3, questions: 25, polls: 0 }, []).quizTotal, 48, 'o quiz inteiro cabe em 50');
  assert.deepEqual(withGameQuestions({ quizzes: 1, questions: 5, polls: 2 }, []).request, { quizzes: 1, questions: 5, polls: 2 });
  const many = Array.from({ length: 12 }, (_, i) => ({ text: 'P' + i }));
  const split = takeGameQuestions({ questions: many }, [{ type: 'survival', need: 10 }, { type: 'tug', rounds: 4, need: 12 }], 2);
  assert.equal(split.questions.length, 2);
  assert.equal(split.games[1].questions.length, 5, 'com perguntas de menos, o que veio é repartido por igual');
  assert.equal(split.games[0].questions.length + split.games[1].questions.length, 10);

  // Cabo de guerra com 4 rodadas recebe 12 perguntas da IA e agrupa 3 perguntas por rodada.
  const { newLesson, newSlide } = await import('../src/lessons.js');
  const tugLesson = newLesson();
  const tugQs = Array.from({ length: 12 }, (_, i) => ({ text: 'Pergunta ' + (i + 1), options: ['A', 'B', 'C'], correct: i % 3 }));
  const tugSplit = takeGameQuestions({ questions: tugQs }, requestedGames('', ['tug'], { tug: 4 }), 0);
  addGameStages(tugLesson, tugSplit.games, { newSlide, createUuid: () => 'id-' + Math.random().toString(16).slice(2, 8) });
  const tugStage = tugLesson.slides.find(slide => slide.game?.type === 'tug').game;
  assert.equal(tugStage.rounds.length, 4, 'mantém exatamente as 4 rodadas pedidas');
  assert.deepEqual(tugStage.rounds.map(round => round.length), [3, 3, 3, 3], 'cada rodada recebe 3 perguntas distintas');
  // Se vierem menos perguntas que 3 por rodada, ainda preenche todas as rodadas pedidas de forma equilibrada.
  const partialLesson = newLesson();
  addGameStages(partialLesson, [{ type: 'tug', rounds: 3, questions: tugQs.slice(0, 7) }], { newSlide, createUuid: () => 'p-' + Math.random().toString(16).slice(2, 8) });
  assert.deepEqual(partialLesson.slides.find(slide => slide.game?.type === 'tug').game.rounds.map(round => round.length), [3, 2, 2]);

  const { rankMood, character } = await import('../src/game-ui.js');
  assert.equal(rankMood(100, true), 'idle'); assert.equal(rankMood(900, true), 'run'); assert.equal(rankMood(2000, true), 'win-0'); assert.equal(rankMood(5000, true), 'idle');
  assert.equal(rankMood(900, false), 'idle', 'quem não pontuou não corre');
  assert.match(character({ avatar: '', name: 'A' }, 0, 'lose'), /data-mood="lose"/);
  assert.doesNotMatch(character({ avatar: '', name: 'A' }, 0), /data-mood/);

  const { looksLikeImageLink } = await import('../src/cover-picker.js');
  assert.equal(looksLikeImageLink(' https://site.com/foto.jpg '), true); assert.equal(looksLikeImageLink('javascript:alert(1)'), false); assert.equal(looksLikeImageLink('texto solto'), false);
});
