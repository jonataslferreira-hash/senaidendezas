import { unpackLesson } from '../src/file-codec.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/room.js';
import { demoLesson, validateLesson } from '../src/lessons.js';
import { compactLesson, lessonAssetIds } from '../src/assets.js';
import { validateAudio } from '../src/audio-data.js';
import { saveCloudLesson, listCloudLessons, readCloudLesson, disconnectCloud } from '../src/cloud-files.js';

test('lobby aceita novas pessoas sem iniciar o relógio; contagem depende do professor e pode ser cancelada', () => {
  let now = 10000; const room = new Room('123456', null, () => now);
  room.control('quiz'); assert.equal(room.snapshot().phase, 'lobby'); assert.equal(room.snapshot().question, null);
  assert.throws(() => room.control('start-quiz'), /participante/);
  now += 60000; room.tick(); assert.equal(room.snapshot().phase, 'lobby');
  const player = room.join({ name: 'Ana', avatar: '🦊' });
  assert.throws(() => room.answer(player.id, { choice: 1, questionIndex: 0 }));
  room.control('start-quiz'); assert.equal(room.snapshot().phase, 'countdown');
  assert.throws(() => room.join({ name: 'Muito tarde' }), /já começou/);
  now += 2999; room.tick(); assert.equal(room.snapshot().question, null);
  now++; room.tick(); assert.equal(room.snapshot().phase, 'question'); assert.equal(room.snapshot().question.startedAt, now);
  room.control('reveal'); room.control('lesson'); room.control('quiz'); room.control('start-quiz'); room.control('lesson');
  now += 5000; room.tick(); assert.equal(room.snapshot().phase, 'lesson');
});
test('música persiste sem ocupar localStorage nem expor o arquivo aos alunos; exportação preserva dados', () => {
  const assetId = 'asset-00000000-0000-4000-8000-000000000000', audio = { name: 'trilha.mp3', assetId, data: 'data:audio/mpeg;base64,YQ==', volume: .4, loop: true };
  const lesson = demoLesson(); lesson.quizAudio = audio; lesson.slides[0].audio = { ...audio, volume: 9 };
  const validated = validateLesson(lesson); assert.equal(validated.slides[0].audio.volume, 1);
  const compact = compactLesson(validated); assert.equal(compact.quizAudio.data, ''); assert.equal(compact.slides[0].audio.data, '');
  assert.ok(lessonAssetIds(compact).includes(assetId)); assert.equal(validated.quizAudio.data, audio.data);
  const room = new Room('123456', null, Date.now, validated), player = room.join({ name: 'Ana' });
  assert.equal(room.snapshot(player.id).lesson.quizAudio, undefined); assert.equal(room.snapshot(player.id).lesson.slides[0].audio, undefined);
  assert.equal(room.snapshot().lesson.quizAudio.data, audio.data);
  assert.throws(() => validateAudio({ data: 'https://evil.test/file' }), /Use MP3/);
  assert.throws(() => validateAudio({ assetId: '../arquivo' }), /Referência/);
});
test('nuvem usa sessão, limita acesso à pasta da conta e rejeita resultados após logout', async () => {
  const uid = '11111111-1111-4111-8111-111111111111', lesson = demoLesson(), requests = [];
  let session = { user: { id: uid } };
  const client = {
    auth: { getSession: async () => ({ data: { session } }) },
    storage: { from(bucket) { assert.equal(bucket, 'storage-lab-lessons'); return {
      upload: async (path, blob) => { requests.push(path); assert.equal((await unpackLesson(blob)).title, lesson.title); return {}; },
      download: async path => { requests.push(path); return { data: new Blob([JSON.stringify(lesson)]) }; }
    }; } },
    from(table) { assert.equal(table, 'lesson_files'); return {
      upsert: async row => { assert.equal(row.user_id, uid); assert.match(row.path, new RegExp('^' + uid + '/lessons/')); return {}; },
      select: () => ({ eq: (key, value) => { assert.equal(key, 'user_id'); assert.equal(value, uid); return { order: () => ({ limit: async () => ({ data: [] }) }) }; } })
    }; }
  };
  await saveCloudLesson(client, lesson); assert.equal(requests.length, 1);
  assert.deepEqual(await listCloudLessons(client), []);
  assert.equal((await readCloudLesson(client, requests[0])).title, lesson.title);
  await assert.rejects(readCloudLesson(client, '22222222-2222-4222-8222-222222222222/lessons/test.json'), /pertence/);
  session = null; await assert.rejects(saveCloudLesson(client, lesson), /Entre na sua conta/);
  session = { user: { id: uid } }; client.storage.from = () => ({ download: async () => { await disconnectCloud(); return { data: new Blob(['{}']) }; } });
  await assert.rejects(readCloudLesson(client, requests[0]), /conta mudou/);
});
