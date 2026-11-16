import test from 'node:test';
import assert from 'node:assert/strict';

import { teamPalette, defaultGame } from '../src/stage-games.js';
import { dedupeQuestions } from '../src/question-dedupe.js';
import { takeGameQuestions } from '../src/storage-ai-games.js';
import { gameNames } from '../src/stage-games.js';

test('equipes aceitam até 10 times com cores e nomes distintos', () => {
  assert.equal(teamPalette.length, 10);
  assert.equal(new Set(teamPalette.map(([, color]) => color)).size, 10, 'cores devem ser únicas');
  assert.equal(new Set(teamPalette.map(([name]) => name)).size, 10, 'nomes devem ser únicos');
  assert.equal(defaultGame('teams').count, 2);
});

test('placar de equipes continua nomeando todos os times da paleta', () => {
  for (const [name] of teamPalette) assert.ok(name.length >= 3);
  assert.equal(gameNames.teams, 'Equipes');
});

test('dedupeQuestions descarta perguntas quase repetidas', () => {
  const list = [
    { text: 'Qual é a função do telescópio Hubble?' },
    { text: 'Qual é a função do telescópio Hubble?' },
    { text: 'Qual e a funcao do telescopio hubble?' },
    { text: 'Em que ano o homem pisou na Lua?' },
    { text: 'Por que o satélite TRMM monitora chuvas tropicais?' }
  ];
  const out = dedupeQuestions(list);
  assert.equal(out.length, 3);
  assert.equal(out[0].text, 'Qual é a função do telescópio Hubble?');
  assert.equal(out[1].text, 'Em que ano o homem pisou na Lua?');
});

test('dedupeQuestions preserva perguntas que só mudam o número', () => {
  const list = Array.from({ length: 6 }, (_, i) => ({ text: 'Pergunta ' + (i + 1) }));
  assert.equal(dedupeQuestions(list).length, 6, 'números são conteúdo, não repetição');
  const anos = [
    { text: 'Em que ano o homem pisou na Lua?' },
    { text: 'Em que ano caiu o Muro de Berlim?' }
  ];
  assert.equal(dedupeQuestions(anos).length, 2);
});

test('dedupeQuestions aceita entradas inválidas sem quebrar', () => {
  assert.deepEqual(dedupeQuestions(null), []);
  assert.deepEqual(dedupeQuestions([]), []);
  const out = dedupeQuestions([{ text: '' }, { text: 'Pergunta válida?' }]);
  assert.equal(out.length, 2);
});

test('perguntas quase repetidas não viram etapas de jogo', () => {
  const result = {
    questions: [
      { text: 'Qual é a função do telescópio Hubble?', options: ['A', 'B'], correct: 0 },
      { text: 'Qual é a função do telescópio Hubble?', options: ['A', 'B'], correct: 0 },
      { text: 'Em que ano o homem pisou na Lua?', options: ['A', 'B'], correct: 0 },
      { text: 'Por que o satélite TRMM monitora chuvas tropicais?', options: ['A', 'B'], correct: 0 }
    ]
  };
  takeGameQuestions(result, [{ type: 'flash', need: 3 }], 1);
  assert.equal(result.questions.length, 1, 'quiz fica com a primeira pergunta única');
  const gameQuestions = result.games[0].questions;
  assert.equal(gameQuestions.length, 2, 'jogo recebe só as perguntas únicas restantes');
});
