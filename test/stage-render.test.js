// Toda etapa precisa desenhar a tela do apresentador e a do aluno sem estourar,
// com o estado vindo do motor do jogo (não de dados inventados). Foi assim que
// "Equipes" quebrava com erro invisível e o Desafio ficava sem objetivo na tela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/room.js';
import { newLesson, newSlide, validateLesson } from '../src/lessons.js';
import { defaultGame } from '../src/stage-games.js';
import { gameMarkup } from '../src/stage-games-view.js';
import { createSlideFromTemplate } from '../src/slide-templates.js';

function challengeSlide() {
  const slide = newSlide('Desafio');
  slide.game = { ...defaultGame('challenge'), text: 'Mire na meta', simulation: 'projectile',
    answer: [{ k: 'range', label: 'Ângulo', v: '45', min: 0, max: 90 }], tolerance: 5 };
  return slide;
}

function gamesLesson() {
  const lesson = newLesson('Aula das etapas');
  const slides = ['teams', 'flash', 'survival', 'raffle', 'tug', 'race'].map(type => {
    const slide = newSlide(type);
    slide.game = { ...defaultGame(type), seconds: 12 };
    return slide;
  });
  const challenge = challengeSlide();
  const cover = newSlide('Capa');
  lesson.slides = [cover, ...slides, challenge];
  lesson.questions = [];
  lesson.activityBlocks = [
    { id: 'b-cover', type: 'slides', items: [cover.id] },
    ...slides.map((slide, i) => ({ id: 'b-' + i, type: slide.game.type, items: [slide.id] })),
    { id: 'b-challenge', type: 'challenge', items: [challenge.id] }
  ];
  return validateLesson(lesson);
}

test('todas as etapas renderizam para o telão e para o aluno sem "undefined"', () => {
  let now = 10_000;
  const room = new Room('909090', null, () => now, gamesLesson());
  const ana = room.join({ name: 'Ana' });
  room.join({ name: 'Bia' });
  const types = [];
  for (let step = 0; step < 9; step += 1) {
    try { room.control('next-stage'); } catch { break; }
    const state = room.snapshot();
    if (state.phase !== 'game' || !state.game) continue;
    const type = state.game.type;
    if (types.includes(type)) continue;
    types.push(type);
    for (const playerId of [null, ana.id]) {
      const snap = room.snapshot(playerId);
      const html = gameMarkup(snap, { header: () => '<header></header>', host: true, now });
      assert.ok(html.includes(`data-game-type="${type}"`), `${type}: palco montado`);
      assert.ok(!/>undefined</.test(html), `${type}: sem "undefined" na tela`);
      assert.ok(!/\bundefined m\b/.test(html), `${type}: sem números quebrados`);
    }
  }
  for (const type of ['teams', 'flash', 'survival', 'challenge', 'raffle', 'tug', 'race']) {
    assert.ok(types.includes(type), `etapa ${type} visitada`);
  }
});

test('desafio mostra o objetivo escrito e como jogar', () => {
  let now = 10_000;
  const room = new Room('919191', null, () => now, gamesLesson());
  const ana = room.join({ name: 'Ana' });
  while (room.snapshot().phase !== 'game' || room.snapshot().game.type !== 'challenge') {
    room.control('next-stage');
    if (room.snapshot().phase === 'finished') break;
  }
  const html = gameMarkup(room.snapshot(ana.id), { header: () => '', host: true, now });
  assert.match(html, /challenge-goal/, 'objetivo em destaque');
  assert.match(html, /Mire na meta/, 'texto do objetivo na tela');
});

test('sobrevivência não repete o título da regra no meio do palco', () => {
  let now = 10_000;
  const room = new Room('929292', null, () => now, gamesLesson());
  const ana = room.join({ name: 'Ana' });
  while (room.snapshot().phase !== 'game' || room.snapshot().game.type !== 'survival') {
    room.control('next-stage');
    if (room.snapshot().phase === 'finished') break;
  }
  const html = gameMarkup(room.snapshot(ana.id), { header: () => '', host: true, now });
  assert.doesNotMatch(html, /<h1[^>]*>\s*Uma vida só/i, 'título redundante fora do palco');
});

test('título que só repete a regra não vira cabeçalho gigante', () => {
  const html = gameMarkup({ phase: 'game', me: { id: 'p1' }, teams: [], game: {
    id: 'g1', type: 'survival', state: 'open', text: 'Uma vida só. Quem sobrevive?', rounds: 3, seconds: 15,
    round: 0, total: 1, answered: 0, players: [], winners: [], alive: 1, question: null, points: 500
  } }, { header: () => '', host: true });
  assert.doesNotMatch(html, /game-hero-title[^>]*>\s*<span[^>]*>[^<]*<\/span>Uma vida só/i, 'sem herói repetido');
  assert.match(html, /game-head-row|sv-hud/, 'cabeçalho segue presente');
});

test('equipes: aluno sem time escolhido ainda vê a tela (sem derrubar a etapa)', () => {
  const state = {
    phase: 'game', me: null, teams: [{ index: 0, name: 'Azul', color: '#3b82f6', score: 0, members: [] },
      { index: 1, name: 'Laranja', color: '#f97316', score: 0, members: [] }],
    game: { id: 'g1', type: 'teams', state: 'open', text: 'Times', pick: true, count: 2 }
  };
  const html = gameMarkup(state, { header: () => '', host: false });
  assert.match(html, /team-pick/, 'tela de escolha aparece');
  assert.doesNotMatch(html, /undefined/, 'sem valor indefinido na tela');
});

test('cores dos times: 4 times geram gradiente nos dois lados do cabo de guerra', () => {
  let now = 10_000;
  const room = new Room('939393', null, () => now, gamesLesson());
  while (room.snapshot().phase !== 'game' || room.snapshot().game.type !== 'tug') {
    room.control('next-stage');
    if (room.snapshot().phase === 'finished') break;
  }
  const snap = room.snapshot();
  const labels = snap.game?.labels || snap.labels;
  assert.ok(Array.isArray(labels) && labels.length === 2, 'dois lados');
  assert.ok(labels.every(label => /^#[0-9a-f]{6}$/i.test(label.color)), 'cada lado tem cor própria');
  assert.notEqual(labels[0].color, labels[1].color, 'lados com cores diferentes');
});

test('slowed da trilha vale para a faixa inteira (volume abaixa, efeito não desliga)', async () => {
  const { readFileSync } = await import('node:fs');
  const tour = readFileSync(new URL('../src/tour.js', import.meta.url), 'utf8');
  assert.match(tour, /applyAudioPlayback\(audio, \{ volume: 0\.22, rate: 0\.85, loop: true \}\)/, 'trilha já nasce slowed');
  assert.match(tour, /duckMusic\(ducked\) \{[\s\S]*?rate: 0\.85/, 'abaixar volume mantém a velocidade');
  assert.doesNotMatch(tour, /playbackRate = ducked \? 0\.85 : 1/, 'não volta ao ritmo normal quando a narração cala');
  const audio = readFileSync(new URL('../src/audio-data.js', import.meta.url), 'utf8');
  assert.match(audio, /if \(slowed\) applyReverb\(player,/, 'slowed liga reverb');
  assert.match(audio, /convolver\.buffer = impulse/, 'reverb de verdade (convolver com impulso)');
});

test('preferência de animação sem conta: guardar e ler não depende de login', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: key => (store.has(key) ? store.get(key) : null), setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key) };
  globalThis.document = { documentElement: { dataset: {} }, dispatchEvent: () => {} };
  const { MOTION_KEY, localMotion, writeLocalMotion } = await import('../src/motion-storage.js');
  assert.equal(localMotion(), 'system', 'começa seguindo o aparelho');
  writeLocalMotion('normal');
  assert.equal(store.get(MOTION_KEY), 'normal');
  assert.equal(globalThis.document.documentElement.dataset.motion, 'normal', 'aplica na hora, sem conta');
  writeLocalMotion('system');
  assert.equal(localMotion(), 'system');
  delete globalThis.localStorage;
  assert.equal(localMotion(), 'system', 'modo privado não quebra');
});

test('barra do topo: mesmos botões (conectados e ao vivo) em toda etapa', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /class="stage-people" data-action="participants"/, 'chip de conectados presente');
  assert.match(app, /class="connection[^"]*" data-action="room-invite"/, 'botão ao vivo abre convite/lista');
  assert.match(app, /case 'room-invite':if\(state\)\{if\(host\)\{shareOpen=true;render\(\);\}else manageParticipants\(state,null\);\}break;/, 'os dois botões têm ação ligada');
  const view = readFileSync(new URL('../src/stage-games-view.js', import.meta.url), 'utf8');
  assert.match(view, /header\(\)\}<main class="game-stage"/, 'todas as etapas usam a mesma barra');
});

test('convite (QR) abre em TODAS as fases, inclusive nos jogos', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /gameMarkup\(state, \{ host, demo, header, now: Date\.now\(\) \+ timerOffset, shareDialog, shareOpen \}\)/, 'jogo recebe o modal');
  assert.match(app, /leaderboardMarkup\(state,\{header,host,offset:timerOffset,shareDialog,shareOpen\}\)/, 'placar da rodada recebe o modal');
  assert.match(app, /final:true,shareDialog,shareOpen/, 'placar final recebe o modal');
  const view = readFileSync(new URL('../src/stage-games-view.js', import.meta.url), 'utf8');
  assert.match(view, /shareOpen \? shareDialog\(\) : ''/, 'jogo renderiza o convite quando aberto');
});

test('slowed é o padrão da trilha (sem seletor, já vem slowed)', async () => {
  const { readFileSync } = await import('node:fs');
  const audio = readFileSync(new URL('../src/audio-data.js', import.meta.url), 'utf8');
  assert.match(audio, /Number\(track\.rate\) \|\| 0\.85/, 'rate ausente cai em 0.85 (slowed + reverb)');
  assert.match(audio, /if \(slowed\) applyReverb\(player,/, 'reverb acompanha o slowed na faixa inteira');
});
