import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Room } from '../src/room.js';
import { newLesson, newSlide, newQuestion } from '../src/lessons.js';
import { gameMarkup } from '../src/stage-games-view.js';
import { leaderboardMarkup } from '../src/game-ui.js';
import { GameAudio } from '../src/game-audio.js';
import { Classroom } from '../src/network.js';
import { showcaseMarkup } from '../src/showcase.js';

class FakeAudio extends EventTarget {
  constructor() { super(); this.paused = true; this.plays = 0; this.currentTime = 0; }
  play() { this.paused = false; this.plays++; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() {}
}

test('Showcase não contém emojis aleatórios e mantém hooks de etapas estáveis', () => {
  const html = showcaseMarkup();
  assert.doesNotMatch(html, /[🦊🤖🦉🚀✨]/u, 'remove emojis soltos do showcase');
  assert.match(html, /data-showcase-board/);
  assert.match(html, /data-showcase-step="0"/);
  assert.match(html, /data-showcase-step="2"/);
});

test('Catálogo usa tema escuro via html[data-appearance="dark"] sem superfícies brancas fixas', () => {
  const css = readFileSync(new URL('../src/template-store.css', import.meta.url), 'utf8');
  assert.match(css, /html\[data-appearance="dark"\]/);
  assert.doesNotMatch(css, /:root\[data-theme="dark"\]/);
  assert.doesNotMatch(css, /var\(--ui-surface,\s*#fff/i);
});

test('Relâmpago final exibe cabeçalho limpo com Pódio do relâmpago e divide 6+ jogadores em colunas de 5', () => {
  const lesson = newLesson();
  lesson.slides = [{
    ...newSlide(), id: 's-flash', title: 'Relâmpago',
    game: {
      type: 'flash', text: 'Desafio relâmpago', seconds: 10,
      questions: [{ text: 'Q1', options: ['A', 'B'], correct: 0 }]
    }
  }];
  lesson.activityBlocks = [{ id: 'b-flash', type: 'flash', items: ['s-flash'] }];
  let now = 10000;
  const room = new Room('112233', null, () => now, lesson);
  const players = ['Ana', 'Bia', 'Caio', 'Duda', 'Enzo', 'Fabi', 'Guga'].map(name => room.join({ name }));
  room.control('game', { do: 'next' });
  for (const p of players) { now += 200; room.answer(p.id, { choice: { choice: 0, round: 0 } }); }
  room.control('game', { do: 'next' }); // reveal -> done
  const snap = room.snapshot();
  assert.equal(snap.game.state, 'done');
  assert.equal(snap.game.board.length, 7);
  const html = gameMarkup(snap, { host: true, demo: false, header: () => '', now });
  assert.match(html, /flash-hero-bolt/);
  assert.match(html, /<h1>Pódio do relâmpago<\/h1>/);
  assert.doesNotMatch(html, /RELÂMPAGO/);
  assert.doesNotMatch(html, /Desafio relâmpago/);
  assert.doesNotMatch(html, /foi o raio da rodada/);
  assert.doesNotMatch(html, /sv-hud/);
  assert.match(html, /flash-board" data-done="true" data-multi="true"/);
});

test('Sobrevivência oculta corações no lobby, mostra resumo ao lado do selo e anima personagens maiores', () => {
  const lesson = newLesson();
  lesson.slides = [{
    ...newSlide(), id: 's-sv', title: 'Sobrevivência',
    game: {
      type: 'survival', text: 'Quem fica de pé?', seconds: 15,
      questions: [{ text: 'P1', options: ['Sim', 'Não'], correct: 0 }]
    }
  }];
  lesson.activityBlocks = [{ id: 'b-sv', type: 'survival', items: ['s-sv'] }];
  let now = 20000;
  const room = new Room('445566', null, () => now, lesson);
  room.join({ name: 'Ana' });
  room.join({ name: 'Bia' });
  const lobbyHtml = gameMarkup(room.snapshot(), { host: true, demo: false, header: () => '', now });
  assert.doesNotMatch(lobbyHtml, /sv-hearts/, 'oculta corações/contagem de pé no lobby');
  assert.match(lobbyHtml, /game-eyebrow-meta">1 pergunta · 15s cada/, 'mostra resumo ao lado de SOBREVIVÊNCIA no lobby');
  assert.match(lobbyHtml, /--scale:1\.42/, 'personagens bem maiores para poucos jogadores');
  assert.match(lobbyHtml, /--roam:/, 'personagens recebem deslocamento de passeio na arena');

  room.control('game', { do: 'next' });
  const activeHtml = gameMarkup(room.snapshot(), { host: true, demo: false, header: () => '', now });
  assert.doesNotMatch(activeHtml, /game-eyebrow-meta/, 'oculta resumo do lobby depois que começa');
  assert.match(activeHtml, /sv-hearts/, 'mostra corações ao iniciar');
});

test('Pódio final mantém 1º no centro sem 3º lugar para 2 jogadores e coloca integrantes do time vencedor sobre a barra', () => {
  // Caso 1: 2 jogadores sem equipes
  const baseTwo = {
    ranking: [
      { id: 'p1', name: 'Ana', avatar: '', score: 900, correct: 2, streak: 2 },
      { id: 'p2', name: 'Bia', avatar: '', score: 600, correct: 1, streak: 0 }
    ],
    teams: null,
    podiumRevealed: true,
    podiumStep: 4,
    victory: 0,
    activity: { hasNext: false }
  };
  const twoHtml = leaderboardMarkup(baseTwo, { header: () => '', host: true, final: true });
  assert.match(twoHtml, /place-1/);
  assert.match(twoHtml, /place-2/);
  assert.doesNotMatch(twoHtml, /place-3/, 'não renderiza 3º lugar quando só há 2 participantes');
  assert.match(twoHtml, /Baixar resultado \(PNG\)/, 'botão indica exportação em PNG');

  // Caso 2: Vitória em equipes com integrantes em cima da barra
  const teamFinal = {
    ...baseTwo,
    teams: [
      { name: 'Azul', color: '#3b82f6', index: 0, score: 825, members: [{ id: 'p2', name: 'Bia', avatar: '', online: true }] },
      { name: 'Laranja', color: '#f97316', index: 1, score: 1679, members: [{ id: 'p1', name: 'Ana', avatar: '', online: true }, { id: 'p3', name: 'Caio', avatar: '', online: true }] }
    ]
  };
  const teamHtml = leaderboardMarkup(teamFinal, { header: () => '', host: true, final: true });
  assert.match(teamHtml, /final-podium-teams/);
  assert.match(teamHtml, /team-podium-crew/);
  assert.match(teamHtml, /Time Laranja/);
  assert.match(teamHtml, /Ana, Caio/);
  assert.match(teamHtml, /final-team-champion/);
  assert.doesNotMatch(teamHtml, /place-3/, 'com 2 times não cria 3º lugar vazio');
});

test('GameAudio oferece tambor loopável para pódio, Sorteio e suspense nos resultados', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'], now: 100000 });
  const lesson = { gameSettings: { lobby: 'random', questions: 'random', volume: 0.1, effects: true } };
  const audio = new GameAudio({ audioFactory: () => new FakeAudio(), random: () => 0.9 });

  // Suspense nos resultados de rodada (leaderboard)
  audio.sync({ code: '123456', phase: 'leaderboard', questionIndex: 0, serverTime: Date.now() }, lesson, true, true);
  assert.ok(audio.drumrollTimer !== null, 'inicia rufo loopável no placar de resultados');
  assert.ok(audio.cuesPlayed.includes('suspense'));
  t.mock.timers.tick(3200);
  assert.equal(audio.drumrollTimer, null, 'encerra o suspense após o tempo do placar');

  // Tambor dedicado no Sorteio enquanto gira + confete na revelação
  const now = Date.now();
  audio.sync({
    code: '123456', phase: 'game', questionIndex: -1, serverTime: now,
    game: { id: 'r1', type: 'raffle', state: 'open', round: -1, current: { id: 'p1', name: 'Ana' }, drawAt: now, revealAt: now + 2800 }
  }, lesson, true, true);
  assert.ok(audio.drumrollTimer !== null, 'inicia tambor loopável no Sorteio');
  assert.equal(audio.drumrollMode, 'raffle');
  assert.ok(audio.cuesPlayed.includes('raffle-drumroll'));
  t.mock.timers.tick(2900);
  assert.equal(audio.drumrollTimer, null, 'para o tambor quando o sorteado é revelado');
  assert.ok(audio.cuesPlayed.includes('confetti'), 'dispara confete na revelação do Sorteio');
  audio.stop();
});

test('Classroom.end() bloqueia imediatamente broadcasts tardios ao sair como professor', () => {
  let received = 0;
  const sent = [];
  const session = new Classroom(() => { received++; }, () => {});
  session.host = true;
  session.connections = new Map([['c1', { send: msg => sent.push(msg) }]]);
  session.end();
  assert.equal(session.stopped, true, 'marca sessão como parada imediatamente');
  assert.equal(session.connections.size, 0, 'limpa mapa de conexões abertas');
  assert.deepEqual(sent, [{ type: 'ended' }], 'avisa alunos que a sala foi encerrada');
  assert.equal(received, 0, 'não devolve estado fantasma ao professor');
});

test('Celular na horizontal mostra o slide visual (phoneLayout restrito a portrait)', () => {
  const appSrc = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(appSrc, /orientation:\s*portrait/);
  const displayCss = readFileSync(new URL('../src/classroom-display.css', import.meta.url), 'utf8');
  assert.match(displayCss, /orientation:\s*landscape/);
});

test('Corrida e opções não quebram palavras ao meio (sem overflow-wrap: anywhere)', () => {
  const css = readFileSync(new URL('../src/finishing.css', import.meta.url), 'utf8');
  assert.match(css, /#app \.game-option span\{[^}]*overflow-wrap:break-word;word-break:normal/);
});
