import test from 'node:test';
import assert from 'node:assert/strict';
import { Room, questions } from '../src/room.js';

function setup() {
  let time = 100000;
  const room = new Room('123456', null, () => time);
  const a = room.join({ name: 'Ana', avatar: '🚀' });
  const b = room.join({ name: 'Bruno', avatar: '🤖' });
  return { room, a, b, advance(ms) { time += ms; } };
}
test('sincroniza slides, modelos e camadas sem aceitar índices inválidos', () => {
  const { room } = setup(); room.control('slide', 1);
  assert.equal(room.snapshot().model, 'hdd');
  room.control('explode', true); assert.equal(room.snapshot().exploded, true);
  room.control('slide', 2); assert.equal(room.snapshot().exploded, false);
  assert.throws(() => room.control('slide', 100));
  assert.throws(() => room.control('model', '__proto__'));
});
test('tempo e dificuldade calculam pontos no apresentador, sem revelar acertos antes da hora', () => {
  const { room, a, b, advance } = setup(); room.control('quiz');
  const q = questions[0]; room.answer(a.id, { choice: q.correct, questionIndex: 0 });
  advance(q.seconds * 500); room.answer(b.id, { choice: q.correct, questionIndex: 0 });
  const hidden = room.snapshot(a.id);
  assert.equal(hidden.question.correct, undefined); assert.equal(hidden.me.answer.points, undefined);
  assert.equal(hidden.ranking[0].score, 0); assert.equal(hidden.me.answer.correct, undefined);
  room.control('reveal');
  assert.equal(room.snapshot(a.id).me.score, 1000);
  assert.equal(room.snapshot(b.id).me.score, 750);
  assert.equal(room.snapshot(a.id).question.correct, q.correct);
});
test('revelação repetida é rejeitada e não duplica pontos', () => {
  const { room, a } = setup(); room.control('quiz');
  room.answer(a.id, { choice: 1, questionIndex: 0 }); room.control('reveal');
  assert.throws(() => room.control('reveal'));
  assert.equal(room.snapshot(a.id).me.score, 1000);
});
test('erros e respostas atrasadas não pontuam; não aceita duplicatas ou pergunta antiga', () => {
  const { room, a, b, advance } = setup(); room.control('quiz');
  assert.throws(() => room.answer(a.id, { choice: '1', questionIndex: 0 }));
  room.answer(a.id, { choice: 0, questionIndex: 0 });
  assert.throws(() => room.answer(a.id, { choice: 1, questionIndex: 0 }));
  advance(18000);
  assert.throws(() => room.answer(b.id, { choice: 1, questionIndex: 0 }));
  assert.equal(room.snapshot(a.id).me.score, 0);
  assert.equal(room.snapshot().phase, 'reveal');
  room.control('next');
  assert.throws(() => room.answer(b.id, { choice: 1, questionIndex: 0 }));
});
test('reconecta pela credencial individual e não expõe credenciais a colegas', () => {
  const { room, a } = setup(); room.disconnect(a.id);
  assert.equal(room.snapshot().ranking.find(p => p.id === a.id).online, false);
  room.control('quiz');
  assert.equal(room.join({ token: a.token }).id, a.id);
  assert.throws(() => room.join({ name: 'Outra pessoa' }));
  assert.equal(JSON.stringify(room.snapshot()).includes(a.token), false);
  assert.equal(room.snapshot().ranking.length, 2);
});
test('completa cinco perguntas, aplica dificuldade e reinicia uma rodada sem pontos antigos', () => {
  const { room, a } = setup(); room.control('quiz');
  questions.forEach((q, i) => {
    room.answer(a.id, { choice: q.correct, questionIndex: i });
    room.control('reveal'); room.control('next');
  });
  assert.equal(room.snapshot().phase, 'finished');
  assert.equal(room.snapshot(a.id).me.score, 7000);
  assert.equal(room.snapshot().ranking[0].correct, 5);
  room.control('lesson'); room.control('quiz');
  assert.equal(room.snapshot(a.id).me.score, 0);
  assert.equal(room.snapshot(a.id).me.answer, null);
});
test('nomes são limitados; sala restaurada mantém resultados e expira pergunta vencida', () => {
  const { room, a, advance } = setup(); room.control('quiz');
  room.answer(a.id, { choice: 1, questionIndex: 0 }); advance(19000);
  const restored = new Room('123456', structuredClone(room.data), room.now);
  assert.equal(restored.snapshot().phase, 'reveal');
  assert.equal(restored.snapshot(a.id).me.score, 1000);
  assert.ok(restored.snapshot().ranking.every(p => !p.online));
  const other = new Room('999999');
  assert.throws(() => other.join({ name: '  ' }));
  const p = other.join({ name: 'a'.repeat(200), avatar: 'inválido' });
  assert.equal(other.snapshot(p.id).ranking[0].name.length, 24);
  assert.equal(other.snapshot(p.id).ranking[0].avatar, '🚀');
});
