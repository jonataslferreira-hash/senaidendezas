import test from 'node:test';
import assert from 'node:assert/strict';

import { teamPalette, defaultGame } from '../src/stage-games.js';
import { dedupeQuestions } from '../src/question-dedupe.js';
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

test('dedupeQuestions aceita entradas inválidas sem quebrar', () => {
  assert.deepEqual(dedupeQuestions(null), []);
  assert.deepEqual(dedupeQuestions([]), []);
  const out = dedupeQuestions([{ text: '' }, { text: 'Pergunta válida?' }]);
  assert.equal(out.length, 2);
});
