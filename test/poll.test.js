import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/room.js';
import { newLesson, validateLesson } from '../src/lessons.js';

test('enquete sincroniza votos sem pontos, aceita entrada tardia e retorna ao mesmo slide', () => {
  const lesson = newLesson();
  lesson.slides[0].poll = { text: 'Como está a aula?', options: ['Entendi', 'Quero rever'] };
  lesson.slides[0].transition = 'fade';
  const room = new Room('123456', null, Date.now, lesson);
  const ana = room.join({ name: 'Ana' });
  room.control('poll'); const id = room.snapshot().poll.id;
  assert.throws(() => room.control('slide', 0));
  assert.throws(() => room.answer(ana.id, { choice: 2, questionIndex: id }));
  assert.throws(() => room.answer(ana.id, { choice: 1, questionIndex: 'old' }));
  room.answer(ana.id, { choice: 0, questionIndex: id });
  assert.throws(() => room.answer(ana.id, { choice: 1, questionIndex: id }));
  const bruno = room.join({ name: 'Bruno' });
  room.answer(bruno.id, { choice: 1, questionIndex: id });
  const snapshot = room.snapshot(ana.id);
  assert.deepEqual(snapshot.poll.counts, [1, 1]);
  assert.equal(snapshot.poll.choice, 0);
  assert.equal(snapshot.poll.total, 2);
  assert.equal(JSON.stringify(snapshot).includes(ana.token), false);
  assert.equal('votes' in snapshot.poll, false);
  assert.equal(snapshot.ranking.every(p => p.score === 0), true);
  room.control('close-poll');
  assert.throws(() => room.answer(bruno.id, { choice: 0, questionIndex: id }));
  room.control('lesson'); assert.equal(room.snapshot().slide, 0);
  assert.equal(room.snapshot().lesson.slides[0].transition, 'fade');
  room.control('poll'); assert.equal(room.snapshot().poll.total, 0);
  assert.throws(() => room.answer(ana.id, { choice: 0, questionIndex: id }));
  room.answer(ana.id, { choice: 0, questionIndex: room.snapshot().poll.id });
  const restored = new Room('123456', JSON.parse(JSON.stringify(room.data)));
  assert.deepEqual(restored.snapshot().poll.counts, [1, 0]);
});

test('aula antiga continua válida; enquete incompleta impede apresentar mas pode ser salva como rascunho', () => {
  const lesson = newLesson(); assert.equal(validateLesson(lesson).slides[0].poll, null);
  lesson.slides[0].poll = { text: '', options: ['Sim', ''] };
  assert.throws(() => validateLesson(lesson), /enquete/);
  assert.equal(validateLesson(lesson, { draft: true }).slides[0].poll.text, '');
  lesson.slides[0].poll.options = ['Só uma']; assert.throws(() => validateLesson(lesson, { draft: true }), /enquete/);
});
