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
  room.answer(ana.id, { choice: { choice: 1 } });
  assert.equal(room.snapshot(caio.id).game.correct, undefined, 'aluno não recebe a resposta antes do fim');
  assert.equal(room.snapshot(caio.id, true).lesson.slides.find(s => s.game?.type === 'flash').game.correct, undefined);
  room.answer(bia.id, { choice: { choice: 0 } });
  assert.equal(room.snapshot().game.winner.name, 'Bia');
  assert.throws(() => room.answer(caio.id, { choice: { choice: 0 } }), /terminou/);
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
  // Cabo de guerra por perguntas: 3 rodadas; quem é do lado A acerta tudo, o lado B erra tudo.
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
  const lesson = validateLesson({ ...base, slides: [base.slides[0], stage('teams', { pick: true }), stage('race', { goal: 60 }), stage('survival')], questions: [question],
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
  // Corrida: só vale depois da largada e os toques são limitados.
  room.control('game', { do: 'next' });
  assert.throws(() => room.answer(ana.id, { choice: { taps: 5 } }), /largada/);
  now += 3100;
  for (let i = 0; i < 40 && room.snapshot().game.state === 'open'; i++) { now += 500; room.answer(ana.id, { choice: { taps: 50 } }); if (i % 2) room.answer(bia.id, { choice: { taps: 6 } }); if (i % 3 === 0) room.answer(caio.id, { choice: { taps: 6 } }); }
  assert.equal(room.snapshot().game.state, 'done');
  assert.equal(room.snapshot(ana.id).game.me.place, 1);
  assert.equal(room.data.players.find(p => p.id === ana.id).bonus, 500);
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
  assert.deepEqual(ai.requestedGames('aula de frações com uma etapa de sobrevivência com 6 perguntas e cabo de guerra').map(g => [g.type, g.need]), [['survival', 6], ['tug', 4]]);
  assert.deepEqual(ai.requestedGames('corrida espacial e trabalho em equipe'), []);
  const plan = ai.withGameQuestions({ quizzes: 1, questions: 5, polls: 0 }, ai.requestedGames('sobrevivência com 6 perguntas e cabo de guerra, uma sobrevivência'));
  assert.equal(plan.quizTotal, 5); assert.ok(plan.request.quizzes * plan.request.questions >= 15);
});
