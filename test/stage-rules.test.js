// Regras das etapas e da sala: 3 tentativas no experimento, prévia ao vivo,
// resposta fora do telão, ofensiva do relâmpago, enquete que se encerra sozinha
// e remoção que só vira banimento na terceira vez.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameInput, gameSnapshot } from '../src/stage-games.js';
import { Room } from '../src/room.js';

const clock = () => { let t = 10000; return { now: () => t, tick: ms => t += ms }; };

const challengeRoom = () => {
  const clockRef = clock();
  return { clock: clockRef, now: clockRef.now,
  slides: [{ game: { type: 'challenge', text: 'meta', simulation: 'projectile', tolerance: 5, answer: [
    { k: 'range', label: 'Ângulo', v: '45', min: 0, max: 90 },
    { k: 'select', label: 'Peso', v: 'leve' }
  ] } }],
    data: { phase: 'game', slide: 0, players: [{ id: 'p1', name: 'Ana', online: true, score: 0 }], game: { id: 'g1', type: 'challenge', state: 'open', startedAt: 0, solved: [], tries: {}, live: {} } } };
};

test('experimento: três tentativas e só', () => {
  const room = challengeRoom();
  const wrong = { values: ['10', 'pesado'] };
  gameInput(room, 'p1', wrong);
  room.clock.tick(2000); gameInput(room, 'p1', wrong);
  room.clock.tick(2000); gameInput(room, 'p1', wrong);
  room.clock.tick(2000);
  assert.equal(room.data.game.tries.p1.n, 3);
  assert.throws(() => gameInput(room, 'p1', wrong), /3 tentativas acabaram/);
});

test('experimento: errar entrega dica de proximidade por controle', () => {
  const room = challengeRoom();
  gameInput(room, 'p1', { values: ['46', 'pesado'] }); // ângulo perto, peso longe
  assert.deepEqual(room.data.game.tries.p1.hints, ['hot', 'cold']);
  room.clock.tick(2000);
  gameInput(room, 'p1', { values: ['20', 'leve'] }); // ângulo longe, peso certo
  assert.deepEqual(room.data.game.tries.p1.hints, ['cold', 'hot']);
});

test('experimento: prévia ao vivo não gasta tentativa e aparece no telão', () => {
  const room = challengeRoom();
  gameInput(room, 'p1', { peek: true, values: ['30', 'leve'] });
  gameInput(room, 'p1', { peek: true, values: ['40', 'leve'] }); // throttle: ignorada
  assert.equal(room.data.game.tries.p1, undefined, 'peek não conta tentativa');
  assert.equal(room.data.game.live.p1.values[0], '30');
  room.clock.tick(1300);
  gameInput(room, 'p1', { peek: true, values: ['40', 'leve'] });
  assert.equal(room.data.game.live.p1.values[0], '40', 'depois do intervalo, atualiza');
  const snap = gameSnapshot(room, null);
  assert.equal(snap.live.length, 1);
  assert.equal(snap.live[0].name, 'Ana');
});

test('experimento: apresentador não recebe a resposta antes do fim', () => {
  const room = challengeRoom();
  const playing = gameSnapshot(room, null);
  assert.equal(playing.answer, undefined, 'sem resposta no telão durante o jogo');
  room.data.game.state = 'done';
  const done = gameSnapshot(room, null);
  assert.ok(done.answer, 'resposta liberada só no encerramento');
});

test('experimento: aluno que acertou vê o próprio lugar e dicas não vazam a resposta', () => {
  const room = challengeRoom();
  gameInput(room, 'p1', { values: ['45', 'leve'] });
  const snap = gameSnapshot(room, 'p1');
  assert.equal(snap.me.ok, true);
  assert.equal(snap.me.place, 1);
  assert.equal(snap.answer, undefined);
});

const flashRoom = () => ({
  now: () => 0,
  slides: [{ game: { type: 'flash', text: 'x', seconds: 10, questions: [
    { text: '1', options: ['a', 'b'], correct: 0 }, { text: '2', options: ['a', 'b'], correct: 1 }
  ] } }],
  data: { phase: 'game', slide: 0, players: [{ id: 'p1', name: 'Ana', online: true, score: 0 }], game: { id: 'g', type: 'flash', state: 'open', round: 0, startedAt: 0, deadline: 10e9, answers: {}, times: {}, gain: {}, score: {}, wins: {}, streak: {}, fastest: '' } }
});

test('relâmpago: ofensiva cresce no acerto seguido e zera no erro', () => {
  const room = flashRoom();
  gameInput(room, 'p1', { choice: 0, round: 0 });
  assert.equal(room.data.game.streak.p1, 1);
  room.data.game.state = 'open'; room.data.game.round = 1; room.data.game.answers = {}; room.data.game.deadline = 10e9;
  gameInput(room, 'p1', { choice: 0, round: 1 }); // errou (correta é 1)
  assert.equal(room.data.game.streak.p1, 0);
  const snap = gameSnapshot(room, 'p1');
  assert.equal(snap.board[0].streak, 0);
});

test('times: líder edita nome e foto mesmo com times já formados', () => {
  const room = {
    now: () => 0,
    slides: [{ game: { type: 'teams', text: 'x', count: 2, pick: false } }],
    data: { phase: 'game', slide: 0, players: [{ id: 'p1', name: 'Ana', online: true, team: 0, score: 0 }], teams: [{ name: 'Azul', color: '#3b82f6', leader: 'p1' }], game: { id: 'g', type: 'teams', state: 'done', startedAt: 0 } }
  };
  gameInput(room, 'p1', { teamCustom: { team: 0, name: 'Trovões Azuis', photo: '' } });
  assert.equal(room.data.teams[0].name, 'Trovões Azuis');
});

const pollRoom = () => ({
  now: () => 0, tick() {}, checkAutoReveal() {}, questions: [{}],
  slides: [{ poll: { text: 't', options: ['a', 'b'] } }],
  data: { phase: 'poll', slide: 0, pollId: 'k1', votes: {}, players: [{ id: 'a', online: true, token: 'ta' }, { id: 'b', online: true, token: 'tb' }] }
});

test('enquete: com todos online votando, encerra sozinha', () => {
  const room = pollRoom();
  Room.prototype.answer.call(room, 'a', { choice: 0, questionIndex: 'k1' });
  assert.equal(room.data.phase, 'poll', 'ainda falta gente');
  Room.prototype.answer.call(room, 'b', { choice: 1, questionIndex: 'k1' });
  assert.equal(room.data.phase, 'poll-results', 'todo mundo votou: encerra');
});

const kickRoom = () => ({
  data: { players: [{ id: 'a', online: true, token: 'tk' }], removedTokens: [], removedCounts: {}, votes: {} },
  checkAutoReveal() {}
});

test('remoção só vira banimento na terceira vez', () => {
  const room = kickRoom();
  Room.prototype.kick.call(room, 'a');
  room.data.players.push({ id: 'a2', online: true, token: 'tk' });
  Room.prototype.kick.call(room, 'a2');
  assert.deepEqual(room.data.removedTokens, [], 'duas remoções: pode voltar');
  room.data.players.push({ id: 'a3', online: true, token: 'tk' });
  Room.prototype.kick.call(room, 'a3');
  assert.deepEqual(room.data.removedTokens, ['tk'], 'terceira: banida');
});
