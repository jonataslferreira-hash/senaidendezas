// Toda etapa precisa desenhar a tela do apresentador e a do aluno sem estourar,
// com o estado vindo do motor do jogo (não de dados inventados). Foi assim que
// "Equipes" quebrava com erro invisível e o Desafio ficava sem objetivo na tela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/room.js';
import { newLesson, newSlide, validateLesson } from '../src/lessons.js';
import { defaultGame, gameSnapshot, gameInput, gameControl } from '../src/stage-games.js';
import { gameMarkup } from '../src/stage-games-view.js';
import { createSlideFromTemplate } from '../src/slide-templates.js';
import { StageEditor } from '../src/stage-editor.js';

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

test('biblioteca: Catálogo nunca aparece no cartão; "Criar com IA" só no celular', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../src/studio-workflows.css', import.meta.url), 'utf8');
  const studio = readFileSync(new URL('../src/studio.js', import.meta.url), 'utf8');
  assert.match(css, /\.library-actions \[data-studio-action="open-templates"\]\{display:none!important\}/, 'catálogo some em qualquer largura');
  // O botão nasce marcado como "só no toque" e some por padrão; o celular é
  // quem reexibe. Já foi o contrário e o botão aparecia no PC.
  assert.match(studio, /storage-ai-primary" data-only-touch/, 'botão marcado como só-celular');
  assert.match(css, /\.library-actions \[data-only-touch\]\{display:none!important\}/, '"Criar com IA" some no PC');
  assert.match(css, /@media \(max-width:900px\)\{\.library-actions \[data-only-touch\]\{display:inline-flex!important\}/, 'e volta no celular');
});

test('nada de aviso flutuante de animações na tela', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/finishing.css', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /motion-notice|maybeExplainReducedMotion/, 'sem barra de aviso no app');
  assert.doesNotMatch(css, /\.motion-notice/, 'sem estilo de aviso');
});

test('entrada na sala: página nova com passo a passo e cartão', async () => {
  const { readFileSync } = await import('node:fs');
  const studio = readFileSync(new URL('../src/studio.js', import.meta.url), 'utf8');
  assert.match(studio, /studio-join join-v3/, 'layout novo da entrada');
  assert.match(studio, /join-eyebrow/, 'selo de aula ao vivo');
  assert.match(studio, /join-steps/, 'passo a passo');
  const css = readFileSync(new URL('../src/studio-workflows.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.join-intro :is\(h1,p\)\{display:none\}/, 'título e texto continuam no celular');
});

test('desafio em rodadas: só o líder mexe, dica libera para o time e palpite chega no telão', () => {
  let now = 20_000;
  const lesson = newLesson('Desafio');
  const slide = newSlide('Experimento');
  slide.game = { type: 'challenge', text: 'Cheguem na meta', simulation: 'projectile', tolerance: 5,
    hints: ['O ângulo é maior.', 'Falta pouco, sobe mais um tico.', 'Agora é ajuste fino.'],
    hintSeconds: 20, leaderMode: true,
    answer: [{ k: 'range', label: 'Ângulo', v: '45', min: 0, max: 90 }] };
  const cover = newSlide('Capa');
  lesson.slides = [cover, slide];
  lesson.activityBlocks = [{ id: 'a', type: 'slides', items: [cover.id] }, { id: 'b', type: 'challenge', items: [slide.id] }];
  const room = new Room('454545', null, () => now, validateLesson(lesson));
  const lia = room.join({ name: 'Lia' });   // entra primeiro e vira líder do time
  const ana = room.join({ name: 'Ana' });
  room.control('next-stage');
  room.data.players.find(p => p.id === ana.id).team = room.data.players.find(p => p.id === lia.id).team;

  assert.equal(gameSnapshot(room, lia.id).me.leader, true, 'líder do time está no comando');
  assert.equal(gameSnapshot(room, ana.id).me.leader, false, 'quem não é líder só palpita');
  assert.equal(gameSnapshot(room, ana.id).hint, '', 'sem dica antes da primeira tentativa');

  assert.throws(() => gameInput(room, ana.id, { values: ['20'] }), /Só o líder/, 'quem não é líder não mexe');
  gameInput(room, lia.id, { values: ['20'] });
  const afterTry = gameSnapshot(room, ana.id);
  assert.ok(afterTry.hint, 'dica liberada para o time');
  assert.equal(afterTry.hintCount, 3, 'três dicas cadastradas');
  assert.equal(afterTry.hintIndex, 0, 'primeira dica');

  now += 2000;
  gameInput(room, ana.id, { guess: '45 graus' });
  const tv = gameSnapshot(room, null);
  assert.equal(tv.guesses.length, 1, 'palpite aparece no telão');
  assert.equal(tv.guesses[0].guess, '45 graus');

  gameControl(room, { do: 'next-hint' });
  const dica2 = gameSnapshot(room, ana.id);
  assert.match(dica2.hint, /Falta pouco/);
  assert.equal(dica2.hintIndex, 1);

  gameControl(room, { do: 'challenge-mode', mode: 'all' });
  assert.equal(gameSnapshot(room, ana.id).me.leader, true, 'todos passam a mexer');
  gameControl(room, { do: 'challenge-mode', mode: 'leader' });
  assert.equal(gameSnapshot(room, ana.id).me.leader, false, 'volta para só o líder');
});

test('editor do desafio deixa o professor trocar as dicas e o modo de controle', () => {
  const slide = newSlide('Experimento');
  slide.game = { type: 'challenge', text: 'Meta', simulation: 'projectile', tolerance: 5,
    hints: ['Dica do professor'], hintSeconds: 45, leaderMode: false, answer: [{ k: 'range', label: 'A', v: '45', min: 0, max: 90 }] };
  const studio = { root: { querySelector: () => null, addEventListener() {} }, draft: { slides: [slide] }, index: 0,
    view: 'editor', tab: 'slides', markDirty() {}, callbacks: {}, itemToolbar: () => '' };
  const editor = new StageEditor(studio);
  const html = editor.markup();
  assert.match(html, /data-game-field="hints"/, 'campo de dicas existe');
  assert.match(html, /Dica do professor/, 'dicas atuais aparecem');
  assert.match(html, /data-game-field="hintSeconds"/, 'tempo da dica existe');
  assert.match(html, /<option value="45" selected>/, 'tempo salvo é o escolhido');
  assert.match(html, /data-game-field="leaderMode"/, 'modo de controle existe');
  assert.match(html, /<option value="0" selected>/, 'todos podem mexer aparece marcado');
});

// Usa jsdom quando ele estiver disponível (ambiente de desenvolvimento). No CI
// ele não é dependência do projeto, então o teste pula em vez de quebrar o
// build/deploy — foi exatamente isso que travou a publicação uma vez.
let challengeDom = null;
try { challengeDom = await import('jsdom'); } catch { challengeDom = null; }

test('telão do desafio espelha o experimento de cada pessoa sem estourar',
  { skip: challengeDom ? false : 'jsdom não instalado' }, async () => {
  const { JSDOM } = challengeDom;
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { pretendToBeVisual: true });
  const previous = { window: globalThis.window, document: globalThis.document, HTMLElement: globalThis.HTMLElement, Event: globalThis.Event };
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement; globalThis.Event = dom.window.Event;
  try {
    const state = { game: { id: 'g', type: 'challenge', state: 'open', text: 'Meta', simulation: 'projectile', bare: false,
      solved: [], solvedCount: 0, trying: 2, maxTries: 3, live: [], hint: '', hintIndex: 0, hintCount: 3, hintAt: 0, hintSeconds: 20,
      guesses: [], guessesCount: 0, openForGuess: true, leaderMode: true, freeForAll: false, me: null } };
    const host = gameMarkup(state, { host: true, header: () => '', demo: false });
    document.querySelector('#app').innerHTML = host;
    await new Promise(done => setTimeout(done, 20));
    assert.ok(document.querySelector('.challenge-mode'), 'telão tem os botões de controle');
    assert.match(host, /Espelho do líder|data-challenge-sim/, 'experimento aparece');
    const locked = gameMarkup({ ...state, game: { ...state.game, me: { tries: 0, ok: false, place: 0, points: 300, leader: false, guess: '' } } },
      { host: false, header: () => '', demo: false });
    document.querySelector('#app').innerHTML = locked;
    await new Promise(done => setTimeout(done, 20));
    assert.ok(document.querySelector('.challenge-team-hint'), 'quem não é líder recebe a dica');
    assert.ok(document.querySelector('[data-challenge-guess]'), 'e o campo de palpite');
    assert.equal(document.querySelector('[data-challenge-send]'), null, 'quem não é líder não tenta');
    assert.equal(document.querySelector('[data-challenge-sim]').dataset.locked, 'true', 'experimento travado no espelho');
  } finally {
    globalThis.window = previous.window; globalThis.document = previous.document;
    globalThis.HTMLElement = previous.HTMLElement; globalThis.Event = previous.Event;
  }
});

test('biblioteca: nunca esconder "Criar com IA" só no celular (o bug que foi ao ar)', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../src/studio-workflows.css', import.meta.url), 'utf8');
  // @media (max-width:900px){ ... storage-ai-primary{display:none} } deixava o
  // botão visível no PC e escondido no celular — exatamente o inverso.
  const wrongWay = /@media \(max-width:900px\)\{(?:[^{}]*\{[^{}]*\})*[^{}]*storage-ai-primary[^{}]*\{[^{}]*display:none/;
  assert.equal(wrongWay.test(css), false, 'o botão não pode ser escondido apenas no celular');
});


test('a barra manda na largura: marca cabe sem reduzir a fonte (PC e celular)', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../src/studio.css', import.meta.url), 'utf8');
  const studio = readFileSync(new URL('../src/studio.js', import.meta.url), 'utf8');

  // A fonte original (23px / 20px por breakpoint) fica intocada: o bloco da
  // marca não pode declarar font-size nem clamp/container query.
  const brandBlock = css.slice(css.indexOf('/* ===== Marca da barra lateral'));
  assert.ok(brandBlock.length > 100, 'bloco da marca presente');
  assert.equal(/font-size:|cqi|container-type/.test(brandBlock), false, 'bloco da marca não mexe no tamanho da fonte');

  // O wordmark ocupa a largura da barra e nunca passa dela.
  assert.match(css, /#app \.studio-drawer \.studio-rail \.studio-wordmark,\s*#app \.ai-drawer \.studio-rail \.studio-wordmark \{[^}]*width: 100%;[^}]*max-width: 100%;[^}]*padding: 0;/s, 'wordmark acompanha a barra');
  // A logo nunca encolhe nem é cortada; quem cede é o texto.
  const appearance = readFileSync(new URL('../src/appearance.css', import.meta.url), 'utf8');
  assert.match(appearance, /\.studio-wordmark \.lab-logo\{width:40px;height:40px\}/, 'logo inteiro no PC');
  assert.match(appearance, /^:?\.lab-logo\{width:44px;height:44px;flex-shrink:0/, 'logo nunca encolhe');
  assert.match(css, /\.ai-rail-brand \.studio-wordmark>span[,{]\s*(?:#app[^{]*)?\{[^}]*min-width: 0;[^}]*white-space: nowrap/s, 'texto fica numa linha');

  // A gaveta do celular tem a largura da BARRA (224px). Com 190px o texto era
  // cortado: logo 34 + texto 98 + gaps 16 + fechar 38 + padding 28 = 214px.
  assert.match(css, /--studio-rail-width: 224px/, 'barra tem 224px');
  assert.match(css, /#app \.studio-drawer,\s*#app \.ai-drawer \{[^}]*width: min\(var\(--studio-rail-width\), calc\(100vw - 24px\)\)/s, 'gaveta = largura da barra');
  const ai = readFileSync(new URL('../src/storage-ai-remake.css', import.meta.url), 'utf8');
  assert.match(ai, /width: min\(var\(--studio-rail-width, 224px\), calc\(100vw - 24px\)\)/, 'gaveta do Storage AI também');
  assert.equal(/calc\(100vw - 40px\)/.test(ai), false, 'sem a folga antiga de 40px');

  // A marca continua sendo um botão único com logo + texto.
  assert.match(studio, /class="studio-wordmark"[^>]*><img class="lab-logo"[^>]*><span>storage<span>lab\.<\/span><\/span>/);
});

test('barra do topo não quebra quando o snapshot ainda não chegou', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  // header() roda no editor/prévia antes de existir state; sem a guarda a tela
  // inteira caía com "Cannot read properties of undefined (reading 'ranking')".
  assert.match(app, /const connected = state\?\.ranking\?\.filter/, 'contador de conectados protegido');
  assert.match(app, /const count = state\?\.ranking\?\.filter/, 'contagem da aula protegida');
  // Nenhum acesso direto a state.ranking sem optional nem dentro de
  // Array.isArray(...) — que é justamente a guarda do rankingTable.
  const bare = [...app.matchAll(/(?<![?.\w])state\.ranking(?!\?)/g)]
    .filter(m => !/Array\.isArray\(state\?\.ranking\)\s*\?\s*$/.test(app.slice(Math.max(0, m.index - 60), m.index)));
  assert.equal(bare.length, 0, `acesso sem guarda em ${bare.length} ponto(s)`);
});

test('tela de Equipes não quebra e o convite abre em qualquer etapa', async () => {
  const { readFileSync } = await import('node:fs');
  const view = readFileSync(new URL('../src/stage-games-view.js', import.meta.url), 'utf8');
  // O seletor "Quantos times" lia state.teams.length — state.teams não existe
  // no snapshot de jogo, então a tela inteira caía com TypeError e o clique em
  // "Ao vivo" nunca chegava a pintar o QR.
  // O seletor "Quantos times" é montado dentro de teamsView, onde a lista
  // vem do jogo (g), não do snapshot da sala.
  const countControl = view.slice(view.indexOf('const countControl'), view.indexOf('const countControl') + 900);
  assert.equal(/state\.teams/.test(countControl), false, 'seletor não lê state.teams');
  assert.match(countControl, /g\.teams\?\.length \|\| 0/, 'o seletor usa a lista do jogo');
  // O convite é um bloco vivo em toda tela de jogo.
  assert.match(view, /<\/main>\$\{shareOpen \? shareDialog\(\) : ''\}/, 'convite aparece nas etapas de jogo');
});

test('espelho do experimento aplica os valores (sem ReferenceError) e não remonta a cena', async () => {
  const { readFileSync } = await import('node:fs');
  const view = readFileSync(new URL('../src/stage-games-view.js', import.meta.url), 'utf8');
  // applySimValues lia `person.values` — variável inexistente no escopo. Hoje
  // percorre o parâmetro `values`; `person.values` só aparece onde `person` é
  // de fato declarado (o laço dos cartões do telão).
  const fn = view.slice(view.indexOf('function applySimValues'), view.indexOf('function challengeView'))
    .split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
  assert.equal(/person\.values/.test(fn), false, 'applySimValues não lê person (só o parâmetro values)');
  assert.match(fn, /values\.forEach\(\(value, i\)/, 'percorre a lista recebida');
  // O bloco do experimento não pode ter o innerHTML trocado no keepGame.
  assert.match(view, /node\.querySelector\('\[data-challenge-sim\] \[data-simulation\]'\)/, 'experimento preservado entre renders');
});

test('o apresentador não vê o experimento grande (só o espelho)', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../src/finishing.css', import.meta.url), 'utf8');
  assert.match(css, /#app\[data-role=presenter\] \.challenge-layout>\.challenge-sim\{display:none\}/, 'simulador grande some no telão');
});

test('recorte de foto responde 1:1 ao dedo (sem sensibilidade alta)', async () => {
  const { readFileSync } = await import('node:fs');
  const crop = readFileSync(new URL('../src/photo-crop.js', import.meta.url), 'utf8');
  // Antes: dx * (side / bitmap.width) sem converter do espaço da TELA.
  assert.match(crop, /const imagePerScreen = box\.side \/ Math\.max\(1, canvas\.width\)/, 'converte tela -> imagem');
  assert.match(crop, /\(dx \* imagePerScreen\) \/ Math\.max\(1, bitmap\.width\)/, 'deslocamento em fração da imagem');
  assert.equal(/dx \* \(box\.side \/ bitmap\.width\)/.test(crop), false, 'sem a fórmula antiga');
  // Roda do mouse mais suave.
  assert.match(crop, /\.0009/, 'zoom da roda suavizado');
});

test('nome digitado antes de entrar não é descartado por um render', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  // Antes: todo render marcava joinNameTouched=true, mesmo com o campo vazio,
  // e o nome digitado na hora de enviar era ignorado.
  const line = app.split('\n').find(l => l.includes('draftName.trim()'));
  assert.ok(line, 'só marca o nome como tocado quando há texto');
  assert.equal(/if \(form && draftName !== undefined\) \{ joinNameDraft/.test(app), false, 'sem a marcação incondicional');
});
