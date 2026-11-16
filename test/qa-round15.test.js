import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Room } from '../src/room.js';
import { newLesson, newSlide, validateLesson } from '../src/lessons.js';
import { gameMarkup } from '../src/stage-games-view.js';
import { leaderboardMarkup } from '../src/game-ui.js';
import { audioEditor } from '../src/audio-editor.js';
import {
  AUDIO_ACCEPT,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_INPUT_BYTES,
  isSupportedAudioFile,
  validateAudio,
  applyAudioPlayback
} from '../src/audio-data.js';

function makeMultiStageLesson({ withAfterSlide = true } = {}) {
  const lesson = newLesson();
  lesson.title = 'Aula QA Rodada 15';
  lesson.slides = [
    {
      ...newSlide(),
      id: 's-tug',
      title: 'Cabo de guerra',
      game: {
        type: 'tug',
        text: 'Batalha de times',
        options: ['Time Azul', 'Time Laranja'],
        seconds: 45,
        points: 1000,
        perPlayer: 1,
        questions: [
          { text: '2 + 2?', options: ['3', '4'], correct: 1 },
          { text: '3 + 3?', options: ['6', '7'], correct: 0 }
        ]
      }
    },
    ...(withAfterSlide ? [{ ...newSlide(), id: 's-after', title: 'Encerramento', body: 'Resumo final' }] : [])
  ];
  lesson.questions = [
    { id: 'q1', text: 'Capital da Bahia?', options: ['Salvador', 'Recife'], correct: 0, difficulty: 'Média', seconds: 20, explanation: 'Salvador.' },
    { id: 'q2', text: 'Planeta vermelho?', options: ['Vênus', 'Marte'], correct: 1, difficulty: 'Média', seconds: 20, explanation: 'Marte.' }
  ];
  lesson.activityBlocks = withAfterSlide
    ? [
        { id: 'b-tug', type: 'tug', items: ['s-tug'] },
        { id: 'b-quiz', type: 'quiz', items: ['q1', 'q2'] },
        { id: 'b-end', type: 'slides', items: ['s-after'] }
      ]
    : [
        { id: 'b-tug', type: 'tug', items: ['s-tug'] },
        { id: 'b-quiz', type: 'quiz', items: ['q1', 'q2'] }
      ];
  return validateLesson(lesson);
}

test('Sobrevivência oculta a arena de personagens nos dispositivos conectados dos alunos e mantém no telão do apresentador', () => {
  const lesson = newLesson();
  lesson.slides = [{
    ...newSlide(),
    id: 's-sv',
    title: 'Sobrevivência',
    game: {
      type: 'survival',
      text: 'Quem fica de pé?',
      seconds: 15,
      points: 500,
      questions: [{ text: '1 + 1?', options: ['1', '2'], correct: 1 }]
    }
  }];
  lesson.activityBlocks = [{ id: 'b-sv', type: 'survival', items: ['s-sv'] }];
  let now = 1000;
  const room = new Room('112233', null, () => now, validateLesson(lesson));
  const ana = room.join({ name: 'Ana' });
  room.join({ name: 'Bia' });
  room.control('game', { do: 'next' });

  const hostSnap = room.snapshot(null);
  const studentSnap = room.snapshot(ana.id);
  const hostHtml = gameMarkup(hostSnap, { host: true, demo: false, header: () => '', now });
  const studentHtml = gameMarkup(studentSnap, { host: false, demo: false, header: () => '', now });

  assert.match(hostHtml, /class="sv-arena"/, 'telão do apresentador exibe a arena com personagens');
  assert.match(hostHtml, /class="sv-player"/, 'telão do apresentador exibe os bonecos');
  assert.doesNotMatch(studentHtml, /class="sv-arena"/, 'celular conectado do aluno não exibe a arena de bonecos');
  assert.doesNotMatch(studentHtml, /class="sv-player"/, 'celular conectado do aluno não renderiza bonecos');
  assert.match(studentHtml, /class="game-options sv-options bare"/, 'aluno continua vendo os botões de resposta');
});

test('Quiz revela automaticamente assim que todos os participantes online respondem ou quando o último pendente desconecta', () => {
  let now = 10_000;
  const lesson = newLesson();
  lesson.slides = [{ ...newSlide(), id: 's1', title: 'Capa', body: 'Oi' }];
  lesson.questions = [
    { id: 'q1', text: 'P1', options: ['A', 'B'], correct: 0, difficulty: 'Média', seconds: 20, explanation: 'A.' },
    { id: 'q2', text: 'P2', options: ['A', 'B'], correct: 1, difficulty: 'Média', seconds: 20, explanation: 'B.' }
  ];
  const room = new Room('223344', null, () => now, validateLesson(lesson));
  const ana = room.join({ name: 'Ana' });
  const bia = room.join({ name: 'Bia' });
  room.control('quiz');
  room.control('start-quiz');
  now += 3500;
  room.tick();
  assert.equal(room.snapshot().phase, 'question');
  const fullDeadline = room.data.deadline;
  assert.equal(fullDeadline, now + 20_000);

  // Só Ana responde -> ainda falta Bia, prazo não encurta
  room.answer(ana.id, { questionIndex: 0, choice: 0 });
  assert.equal(room.data.deadline, fullDeadline);

  // Bia responde -> prazo encurta para <= 350ms e revela no próximo tick
  room.answer(bia.id, { questionIndex: 0, choice: 1 });
  assert.equal(room.snapshot().phase, 'question', 'preserva estado síncrono antes do próximo tick');
  assert.ok(room.data.deadline <= now + 350, 'encurta deadline para revelação automática imediata');
  now += 400;
  room.tick();
  assert.equal(room.snapshot().phase, 'reveal', 'revela automaticamente sem esperar os 20s');

  // Segunda pergunta: Ana responde, Bia desconecta -> também auto-revela!
  room.control('next');
  assert.equal(room.snapshot().phase, 'question');
  room.answer(ana.id, { questionIndex: 1, choice: 1 });
  room.disconnect(bia.id);
  assert.ok(room.data.deadline <= now + 350, 'desconexão do último pendente dispara revelação automática');
  now += 400;
  room.tick();
  assert.equal(room.snapshot().phase, 'reveal');
});

test('Placar do Quiz isola pontos puros do quiz, exibe torres verticais ao final do quiz e remove botão Sair', () => {
  let now = 5_000;
  const lesson = makeMultiStageLesson({ withAfterSlide: true });
  const room = new Room('334455', null, () => now, lesson);
  const ana = room.join({ name: 'Ana' });
  const bia = room.join({ name: 'Bia' });

  // Simula pontuação prévia acumulada no Cabo de Guerra (bonus = 2500 para Bia)
  room.data.players.find(p => p.id === bia.id).bonus = 2500;
  room.data.teams = [
    { name: 'Azul', color: '#3b82f6', index: 0 },
    { name: 'Laranja', color: '#f97316', index: 1 }
  ];
  room.data.players.find(p => p.id === ana.id).team = 0;
  room.data.players.find(p => p.id === bia.id).team = 1;

  // Avança para o bloco do Quiz
  room.control('lesson');
  room.control('start-quiz');
  now += 3500;
  room.tick();

  // Pergunta 1: Ana acerta, Bia erra
  room.answer(ana.id, { questionIndex: 0, choice: 0 });
  room.answer(bia.id, { questionIndex: 0, choice: 1 });
  now += 400;
  room.tick();
  room.control('ranking');

  const roundSnap = room.snapshot();
  assert.equal(roundSnap.quizRanking[0].name, 'Ana', 'no placar do quiz Ana lidera pelos pontos do quiz');
  assert.ok(roundSnap.quizRanking[0].score > 0 && roundSnap.quizRanking[0].score <= 1500);
  assert.equal(roundSnap.quizRanking[1].name, 'Bia');
  assert.equal(roundSnap.quizRanking[1].score, 0, 'placar do quiz não soma os 2500 pontos do Cabo de Guerra');
  assert.equal(roundSnap.ranking[0].name, 'Bia', 'placar geral continua acumulando os 2500 pontos prévios');

  const roundHtml = leaderboardMarkup(roundSnap, { header: () => '', host: true, final: false, now });
  assert.doesNotMatch(roundHtml, /data-action="leave"/, 'botão Sair removido do placar da rodada');
  assert.match(roundHtml, /Na liderança[\s\S]*Ana/, 'liderança da rodada usa o ranking puro do quiz');

  // Pergunta 2 -> encerra etapa do Quiz (hasNext === true -> RESULTADO DO QUIZ em torres verticais!)
  room.control('next');
  room.answer(ana.id, { questionIndex: 1, choice: 1 });
  room.answer(bia.id, { questionIndex: 1, choice: 0 });
  now += 400;
  room.tick();
  room.control('next');
  const quizEndSnap = { ...room.snapshot(), podiumRevealed: true, podiumStep: 4 };
  assert.equal(quizEndSnap.phase, 'finished');
  assert.equal(quizEndSnap.resultScope, 'quiz');

  const quizEndHtml = leaderboardMarkup(quizEndSnap, { header: () => '', host: true, final: true, now: now + 10_000 });
  assert.match(quizEndHtml, /RESULTADO DO QUIZ/, 'etapa intermediária do quiz mostra título próprio');
  assert.match(quizEndHtml, /round-towers quiz-end-towers/, 'final do quiz usa torres verticais com personagens');
  assert.doesNotMatch(quizEndHtml, /data-action="leave"/, 'botão Sair removido do resultado do quiz');
  assert.doesNotMatch(quizEndHtml, /data-action="export"/, 'resultado intermediário não polui com botão de PNG');
  assert.match(quizEndHtml, /<em>Ana<\/em> venceu!/, 'vencedora do quiz é Ana pelos pontos puros do quiz');
});

test('Áudio suporta novos formatos, limite > 8 MB, slowed com tom grave e painel redesenhado', () => {
  for (const name of ['musica.mp3', 'voz.wav', 'efeito.ogg', 'nota.opus', 'faixa.m4a', 'trilha.aac', 'master.flac', 'clip.webm', 'som.aiff', 'audio.mp4', 'demo.wma', 'rec.3gp']) {
    assert.equal(isSupportedAudioFile({ name, type: '' }), true, `deve aceitar ${name}`);
  }
  assert.equal(isSupportedAudioFile({ name: 'foto.png', type: 'image/png' }), false);
  assert.equal(isSupportedAudioFile({ name: 'texto.txt', type: 'text/plain' }), false);
  assert.ok(MAX_AUDIO_BYTES >= 16 * 1024 * 1024, 'limite de armazenamento suporta mais de 8 MB');
  assert.ok(MAX_AUDIO_INPUT_BYTES >= 50 * 1024 * 1024, 'entrada suporta arquivos grandes para compressão');
  assert.match(AUDIO_ACCEPT, /\.flac/i);
  assert.match(AUDIO_ACCEPT, /\.opus/i);

  // Valida áudio > 8 MB (ex.: 10 MB em base64) e rejeita inválido
  const bigValid = 'data:audio/mpeg;base64,' + 'A'.repeat(10 * 1024 * 1024);
  assert.doesNotThrow(() => validateAudio({ data: bigValid, name: 'grande.mp3', rate: 0.75 }));
  assert.throws(() => validateAudio({ data: 'data:text/plain;base64,QQ==', name: 'x.txt' }), /Use MP3/);

  // Slowed desativa preservesPitch; velocidade >= 1x mantém pitch natural
  const player = { volume: 1, playbackRate: 1, preservesPitch: true, mozPreservesPitch: true, webkitPreservesPitch: true };
  applyAudioPlayback(player, { volume: 0.6, rate: 0.75 });
  assert.equal(player.volume, 0.6);
  assert.equal(player.playbackRate, 0.75);
  assert.equal(player.preservesPitch, false, 'slowed 0.75x abaixa o tom');
  assert.equal(player.mozPreservesPitch, false);
  assert.equal(player.webkitPreservesPitch, false);

  applyAudioPlayback(player, { volume: 0.9, rate: 1 });
  assert.equal(player.preservesPitch, true, 'velocidade normal 1.0x mantém o tom natural');

  // Painel de áudio v2 exibe presets de slowed e indicador de tom grave
  const html = audioEditor({ assetId: 'a1', name: 'Trilha.flac', duration: 125, volume: 0.8, rate: 0.85, trigger: 'slide', loop: true }, 'slide', [], { expanded: true });
  assert.match(html, /audio-editor-v2/);
  assert.match(html, /data-audio-rate-preset="0\.75"/);
  assert.match(html, /data-slowed="true"/);
  assert.match(html, /Slowed · tom grave/);
  assert.match(html, /Trilha\.flac/);
  assert.match(html, /2:05/);
});

test('Regressões de CSS e Spotify: popover ancorado, Novo slide sem sobreposição, contraste do placar e resume sem reiniciar', () => {
  const finishing = fs.readFileSync(new URL('../src/finishing.css', import.meta.url), 'utf8');
  const editorMusicCss = fs.readFileSync(new URL('../src/editor-music.css', import.meta.url), 'utf8');
  const editorMusicJs = fs.readFileSync(new URL('../src/editor-music.js', import.meta.url), 'utf8');
  const slideDesignerJs = fs.readFileSync(new URL('../src/slide-designer.js', import.meta.url), 'utf8');

  assert.doesNotMatch(editorMusicCss, /inset\s*:\s*auto\s*!important/, 'popover de música não trava em (0,0) com inset:auto!important');
  assert.match(editorMusicJs, /spotifyController\.resume/, 'Spotify tenta retomar do ponto pausado em vez de reiniciar');
  assert.match(editorMusicJs, /spotifyResumeSeek/, 'Spotify possui fallback de seek caso o embed reinicie em 0s');
  assert.match(finishing, /#app \.template-picker-dialog \.tpl-thumb[\s\S]*padding-top:56\.25%/, 'cartões de Novo slide têm altura 16:9 estável');
  assert.match(finishing, /html\[data-appearance=dark\] #app\.quiz-party \.rank-score[\s\S]*color:#f8f7ff/, 'pontuação do placar da rodada tem alto contraste no modo escuro');
  assert.match(finishing, /#app \.grand-finale \.final-podium[\s\S]*overflow:visible;container-type:normal/, 'pódio final não corta cabeças ou bases a 100% de zoom');
  assert.match(finishing, /dialog\.video-dialog\.video-dialog-v2/, 'diálogo de inserir vídeo usa o layout redesenhado v2');
  assert.match(slideDesignerJs, /data-slide-transition/, 'aba Animações unifica a transição de entrada do slide');
});
