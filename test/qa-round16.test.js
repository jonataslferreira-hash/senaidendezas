import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Room } from '../src/room.js';
import { newLesson, newSlide, validateLesson } from '../src/lessons.js';
import { defaultGame } from '../src/stage-games.js';
import { gameMarkup } from '../src/stage-games-view.js';
import { leaderboardMarkup, pickVictory } from '../src/game-ui.js';
import { audioEditor } from '../src/audio-editor.js';
import { studioIcon } from '../src/studio-icons.js';
import { GameAudio } from '../src/game-audio.js';

function makeGamesLesson() {
  const lesson = newLesson('Aula Rodada 16');
  const teamsSlide = newSlide('Equipes');
  teamsSlide.game = { ...defaultGame('teams'), count: 2 };

  const flashSlide = newSlide('Relâmpago');
  flashSlide.game = {
    ...defaultGame('flash'),
    text: 'Desafio relâmpago',
    seconds: 12,
    questions: [
      { text: 'Pergunta R1?', options: ['Certa', 'Errada'], correct: 0 },
      { text: 'Pergunta R2?', options: ['Errada', 'Certa'], correct: 1 }
    ]
  };

  const svSlide = newSlide('Sobrevivência');
  svSlide.game = {
    ...defaultGame('survival'),
    text: 'Uma vida só. Quem sobrevive?',
    seconds: 15,
    questions: [{ text: 'Capital do Brasil?', options: ['Brasília', 'Salvador'], correct: 0 }]
  };

  const tugSlide = newSlide('Cabo de guerra');
  tugSlide.game = {
    ...defaultGame('tug'),
    text: 'Cabo de guerra!',
    seconds: 15,
    rounds: [
      [
        { text: 'R1-A', options: ['Certo', 'Errado'], correct: 0 },
        { text: 'R1-B', options: ['Errado', 'Certo'], correct: 1 }
      ],
      [
        { text: 'R2-A', options: ['Certo', 'Errado'], correct: 0 },
        { text: 'R2-B', options: ['Errado', 'Certo'], correct: 1 }
      ]
    ]
  };

  const raceSlide = newSlide('Corrida');
  raceSlide.game = {
    ...defaultGame('race'),
    text: 'Corrida do saber',
    seconds: 15,
    questions: [{ text: '2 + 2?', options: ['4', '5'], correct: 0 }]
  };

  const cover = newSlide('Capa');
  lesson.slides = [cover, teamsSlide, flashSlide, svSlide, tugSlide, raceSlide];
  lesson.questions = [];
  lesson.activityBlocks = [
    { id: 'b-cover', type: 'slides', items: [cover.id] },
    { id: 'b-teams', type: 'teams', items: [teamsSlide.id] },
    { id: 'b-flash', type: 'flash', items: [flashSlide.id] },
    { id: 'b-sv', type: 'survival', items: [svSlide.id] },
    { id: 'b-tug', type: 'tug', items: [tugSlide.id] },
    { id: 'b-race', type: 'race', items: [raceSlide.id] }
  ];
  return validateLesson(lesson);
}

test('Editor: contraste do botão de áudio, sem tooltip nativo, barra sem Inserir mais no PC, vídeo limpo e busca inline na imagem', () => {
  const audioHtml = audioEditor(null, 'slide', [], { expanded: true });
  assert.match(audioHtml, /<input type="file" title="" data-audio-upload="slide"/, 'suprime tooltip nativo Nenhum ficheiro selecionado');
  assert.match(audioHtml, /audio-source-btn is-primary/, 'botão principal marcado corretamente');

  const designerSrc = readFileSync(new URL('../src/slide-designer.js', import.meta.url), 'utf8');
  assert.match(designerSrc, /btn\('model',\s*studioIcon\('model'\)\+'<span>Modelo 3D<\/span>'\)/, 'Modelo 3D direto na barra principal');
  assert.match(designerSrc, /btn\('simulation',\s*studioIcon\('simulation'\)\+'<span>Simulação<\/span>'\)/, 'Simulação direta na barra principal');
  assert.doesNotMatch(designerSrc, /Ícones de objetos/, 'remove opção Ícones de objetos da barra');
  assert.doesNotMatch(designerSrc, /btn\('browse-images'/, 'remove Buscar imagens separado da barra');
  assert.match(designerSrc, /designer-insert-more mobile-only-more/, 'menu Mais existe apenas no celular');
  assert.match(designerSrc, /class="image-inline-search"/, 'janela Adicionar imagem inclui barra de pesquisa inline');
  assert.doesNotMatch(designerSrc, /vd-subtitle|vd-pills|vd-icon/, 'janela Inserir vídeo limpa sem subtítulo, pílulas ou ícone decorativo');

  assert.match(studioIcon('model'), /<svg/, 'ícone de Modelo 3D disponível');
  assert.match(studioIcon('simulation'), /<svg/, 'ícone de Simulação disponível');

  const workflowsCss = readFileSync(new URL('../src/studio-workflows.css', import.meta.url), 'utf8');
  assert.match(workflowsCss, /#app \.cover-storage svg\{width:19px;height:19px;flex:0 0 19px;color:#ffffff;stroke:#ffffff;stroke-width:1\.85;display:block\}/, 'ícones dos cartões da biblioteca têm tamanho, cor e espessura uniformes');

  const finishingCss = readFileSync(new URL('../src/finishing.css', import.meta.url), 'utf8');
  assert.match(finishingCss, /designer-inspector label\.audio-source-btn\.is-primary[\s\S]*color:var\(--ui-accent-ink,#ffffff\)!important/, 'botão Enviar áudio vence a regra genérica de label do inspetor com alto contraste');
});

test('Transições de slides no aluno: não são bloqueadas por prefers-reduced-motion durante [data-play] nem canceladas em re-render', () => {
  const expCss = readFileSync(new URL('../src/experience.css', import.meta.url), 'utf8');
  assert.match(expCss, /:root:not\(\[data-motion=normal\]\):not\(\[data-play\]\)\s+\.scene-arrive \*/, 'experience.css preserva transições de aula em dispositivos convidados com data-play');
  const appCss = readFileSync(new URL('../src/appearance.css', import.meta.url), 'utf8');
  assert.match(appCss, /:root:not\(\[data-motion=normal\]\):not\(\[data-play\]\)\s+\.poll-bar/, 'appearance.css preserva animações durante apresentação ao vivo');
  const motionSrc = readFileSync(new URL('../src/motion.js', import.meta.url), 'utf8');
  assert.match(motionSrc, /if\s*\(changed\)\s*\{\s*root\.classList\.remove\('scene-arrive'\)/, 're-render na mesma cena não cancela animação de transição ativa');
  assert.match(motionSrc, /margin:\s*'0'/, 'slide saindo alinha perfeitamente sobre o estágio sem deslocamento de margem');
});

test('Relâmpago: silencia tambor no Placar da rodada, agrupa pódio final por equipes e corrige sobreposição no celular', () => {
  // 1) Áudio: leaderboard do Relâmpago encerra o tambor e toca efeito único de resultado; apenas pull do Cabo de Guerra gira o tambor.
  const fakeAudio = () => ({ dataset: {}, loop: false, volume: 1, currentTime: 0, paused: true, src: '', play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; }, load() {}, addEventListener() {} });
  const prevAudio = globalThis.Audio, prevDoc = globalThis.document;
  globalThis.Audio = function FakeAudio() { return fakeAudio(); };
  globalThis.document = { body: { append() {} } };
  try {
    const audio = new GameAudio();
    const calls = [];
    audio.startMusic = () => calls.push('music');
    audio.startDrumroll = () => calls.push('drumroll');
    audio.stopDrumroll = () => calls.push('stopDrumroll');
    audio.playResult = () => calls.push('result');
    audio.sync({ phase: 'game', game: { id: 'tug1', type: 'tug', state: 'pull', round: 0 } }, {}, true, true);
    assert.ok(calls.includes('drumroll'), 'puxada do Cabo de Guerra ativa tambor');
    calls.length = 0;
    audio.sync({ phase: 'game', game: { id: 'fl1', type: 'flash', state: 'leaderboard', round: 0 } }, {}, true, true);
    assert.ok(!calls.includes('drumroll'), 'Placar da rodada do Relâmpago NÃO ativa tambor em loop');
    assert.ok(calls.includes('stopDrumroll'), 'Placar da rodada do Relâmpago garante parada de qualquer tambor');
    assert.ok(calls.includes('result'), 'Placar da rodada toca toque único de placar');
  } finally {
    globalThis.Audio = prevAudio;
    globalThis.document = prevDoc;
  }

  // 2) Pódio por equipes no final do Relâmpago
  let now = 10_000;
  const lesson = makeGamesLesson();
  const room = new Room('778899', null, () => now, lesson);
  const gabriel = room.join({ name: 'Gabriel (aluno)' });
  const vitoria = room.join({ name: 'Vitória (aluna)' });
  room.control('next-stage'); // teams
  room.control('game', { do: 'shuffle' }); // divide em 2 times
  room.control('next-stage'); // Relâmpago

  // Rodada 1 e 2
  room.control('game', { do: 'next' });
  room.answer(gabriel.id, { choice: { choice: 0, round: 0 } });
  room.answer(vitoria.id, { choice: { choice: 1, round: 0 } });
  room.control('game', { do: 'next' }); // reveal -> leaderboard
  room.control('game', { do: 'next' }); // leaderboard -> round 2
  room.answer(gabriel.id, { choice: { choice: 1, round: 1 } });
  room.answer(vitoria.id, { choice: { choice: 1, round: 1 } });
  room.control('game', { do: 'next' }); // reveal -> done

  const snap = room.snapshot();
  assert.equal(snap.game.state, 'done');
  assert.ok(Array.isArray(snap.game.teamBoard) && snap.game.teamBoard.length === 2, 'snapshot do Relâmpago inclui placar agrupado por equipes');
  const html = gameMarkup(snap, { header: () => '', host: true, now });
  assert.match(html, /flash-podium-teams/, 'pódio final do Relâmpago exibe equipes');
  assert.match(html, /Classificação individual/, 'abaixo do pódio por equipes mantém classificação individual');
});

test('Sobrevivência: sem barra branca, nome acima do personagem e 5 animações variadas', () => {
  let now = 20_000;
  const lesson = makeGamesLesson();
  const room = new Room('665544', null, () => now, lesson);
  for (const name of ['Gabriel (aluno)', 'Vitória (aluna)', 'Lucas', 'Marina', 'Rafael', 'Sofia']) room.join({ name });
  room.control('next-stage'); // teams
  room.control('next-stage'); // flash
  room.control('next-stage'); // survival

  const html = gameMarkup(room.snapshot(), { header: () => '', host: true, now });
  assert.doesNotMatch(html, /sv-tile/, 'remove a barra branca embaixo dos personagens na Sobrevivência');
  assert.match(html, /<figure class="sv-player"[^>]*data-sv-anim="0"[^>]*><figcaption>Gabriel \(aluno\)<\/figcaption><div class="sv-actor">/, 'nome fica acima do personagem sem barra');
  for (let i = 0; i < 5; i++) {
    assert.match(html, new RegExp(`data-sv-anim="${i}"`), `animação variada ${i} aplicada`);
  }
});

test('Cabo de Guerra e Corrida: sem títulos duplicados, rodada por rodada com placar oculto até puxar e mãos na frente da corda', () => {
  let now = 30_000;
  const lesson = makeGamesLesson();
  const room = new Room('554433', null, () => now, lesson);
  const a = room.join({ name: 'Gabriel' });
  const b = room.join({ name: 'Vitória' });
  room.control('next-stage'); // teams
  room.control('game', { do: 'shuffle' });
  room.control('next-stage'); // flash
  room.control('next-stage'); // survival
  room.control('next-stage'); // tug

  const tugReadyHtml = gameMarkup(room.snapshot(), { header: () => '', host: true, now });
  assert.match(tugReadyHtml, /game-head-single/, 'Cabo de guerra não duplica o nome no selo e no título');
  assert.doesNotMatch(tugReadyHtml, /class="game-eyebrow"/, 'não exibe selo redundante CABO DE GUERRA acima de Cabo de guerra!');

  room.control('game', { do: 'next' }); // rodada 1
  const tugOpenHtml = gameMarkup(room.snapshot(), { header: () => '', host: true, now });
  assert.match(tugOpenHtml, /tug-hidden-score/, 'oculta % durante a rodada');
  assert.match(tugOpenHtml, /tug-meter" data-hidden="true"/, 'barra centralizada sem entregar vencedor antes do fim');
  assert.doesNotMatch(tugOpenHtml, /tug-grip-hands/, 'sem mãos extras: o boneco segura a corda com os próprios braços');
  assert.doesNotMatch(tugOpenHtml, /0 acertos/, 'não exibe contagem de acertos antes do fim');

  // Responde rodada 1 -> entra em between -> avança para rodada 2 -> pull (placar ainda oculto!) -> done (revela!)
  // Cada pessoa responde TODAS as perguntas da rodada (nada de sorteio).
  for (const r of [0, 1]) {
    for (const p of [a, b]) {
      const roundQs = lesson.slides[4].game.rounds[r];
      roundQs.forEach((q, v) => room.answer(p.id, { choice: { round: r, v, choice: p.id === a.id ? q.correct : (q.correct + 1) % q.options.length } }));
    }
    if (r === 0) {
      assert.equal(room.snapshot().game.state, 'between');
      now += 2400; room.tick();
    }
  }
  assert.equal(room.snapshot().game.state, 'pull');
  const pullHtml = gameMarkup(room.snapshot(), { header: () => '', host: true, now });
  assert.match(pullHtml, /tug-hidden-score/, 'mantém porcentagens escondidas durante a puxada final para preservar o suspense');
  assert.match(pullHtml, /tug-meter" data-hidden="true"/, 'barra só se move no fim da puxada');

  now += 6000; room.tick();
  const doneHtml = gameMarkup(room.snapshot(), { header: () => '', host: true, now });
  assert.doesNotMatch(doneHtml, /tug-hidden-score/, 'revela porcentagens ao terminar a puxada');
  assert.match(doneHtml, /100%/, 'mostra porcentagem final do vencedor');
  assert.match(doneHtml, /data-victory="(chuva|fogos|baloes|estrelas|fitas)"/, 'comemoração variada no fim do Cabo de guerra');

  // Corrida: também não duplica título CORRIDA acima de Corrida do saber
  room.control('next-stage');
  const raceHtml = gameMarkup(room.snapshot(), { header: () => '', host: true, now });
  assert.match(raceHtml, /game-head-single/, 'Corrida do saber não duplica cabeçalho');
  assert.doesNotMatch(raceHtml, /class="game-eyebrow"/, 'remove selo redundante CORRIDA');
});

test('Placar Geral Final: remove banner duplicado da equipe campeã, restaura Sair e varia 5 comemorações', () => {
  const seen = new Set();
  for (let i = 0; i < 60; i++) seen.add(pickVictory(`sala-${i}-${i * 17}`));
  assert.deepEqual([...seen].sort(), ['baloes', 'chuva', 'estrelas', 'fitas', 'fogos'], 'sorteia todas as 5 comemorações distintas');

  const finalState = {
    code: '123456',
    phase: 'finished',
    podiumRevealed: true,
    podiumStep: 4,
    resultStartedAt: 1000,
    victory: 4,
    activity: { type: 'game', hasNext: false },
    teams: [
      { name: 'Azul', color: '#3b82f6', score: 1364, members: [{ id: '1', name: 'Gabriel', avatar: 'rocket' }] },
      { name: 'Laranja', color: '#f97316', score: 420, members: [{ id: '2', name: 'Vitória', avatar: 'star' }] }
    ],
    ranking: [
      { id: '1', name: 'Gabriel', avatar: 'rocket', score: 1364, color: '#3b82f6' },
      { id: '2', name: 'Vitória', avatar: 'star', score: 420, color: '#f97316' }
    ]
  };
  const hostHtml = leaderboardMarkup(finalState, { header: () => '', host: true, final: true });
  assert.doesNotMatch(hostHtml, /<section class="final-team-champion"/, 'não repete Time Azul num banner separado acima do pódio');
  assert.match(hostHtml, /team-podium-slot place-1 final-team-champion/, 'destaca diretamente o 1º lugar do pódio como campeão');
  assert.match(hostHtml, /data-victory="fitas"/, 'suporta a 5ª comemoração (fitas)');
  assert.match(hostHtml, /data-action="leave">Sair<\/button>/, 'restaura o botão Sair para o apresentador');

  const studentHtml = leaderboardMarkup({ ...finalState, me: { id: '1' } }, { header: () => '', host: false, final: true });
  assert.match(studentHtml, /data-action="leave">Sair<\/button>/, 'restaura o botão Sair para o participante');
});
