import test from 'node:test';
import assert from 'node:assert/strict';
import { compressJSONText, unpackLesson } from '../src/codec-core.js';
import { createR2Handler } from '../cloudflare/r2-worker.js';
test('compressão reduz JSON repetido e recupera o conteúdo sem perder texto ou mídia', async () => {
  const lesson = { title: 'Aula de ciência', notes: 'Uma explicação. '.repeat(2000), media: 'data:image/png;base64,YQ==' };
  const packed = await compressJSONText(JSON.stringify(lesson));
  assert.equal(packed.compressed, true); assert.ok(packed.buffer.byteLength < packed.originalBytes / 2);
  assert.deepEqual(await unpackLesson(new Blob([packed.buffer])), lesson);
  assert.deepEqual(await unpackLesson(new Blob([JSON.stringify(lesson)])), lesson);
  await assert.rejects(unpackLesson(new Blob(['not-json'])));
});
test('R2 valida sessão e origem, limita uploads e usa somente a pasta da conta verificada', async () => {
  const uid = '11111111-1111-4111-8111-111111111111', files = new Map(), keys = [];
  const env = { FILES: {
    async put(key, body, metadata) { keys.push(key); const bytes = await new Response(body).arrayBuffer(); files.set(key, { ...metadata, bytes }); },
    async get(key) { keys.push(key); const object = files.get(key); return object && { ...object, body: new Blob([object.bytes]).stream() }; },
    async list({ prefix }) { return { objects: [...files].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({ key, customMetadata: value.customMetadata, size: value.bytes.byteLength, uploaded: new Date() })), truncated: false }; }
  } };
  const handler = createR2Handler(async () => ({ id: uid, email_confirmed_at: '2026-11-01' }));
  const headers = { Authorization: 'Bearer verified-token-1234567890', Origin: 'http://localhost:5173', 'Content-Type': 'application/json', 'Content-Length': '2', 'X-Lesson-Title': encodeURIComponent('Minha aula') };
  assert.equal((await handler(new Request('https://files.example/lessons'), env)).status, 401);
  assert.equal((await handler(new Request('https://files.example/lessons', { headers: { ...headers, Origin: 'https://foreign.example' } }), env)).status, 403);
  assert.equal((await handler(new Request('https://files.example/lessons/aula?user_id=other', { method: 'PUT', headers, body: '{}' }), env)).status, 200);
  assert.equal(keys[0], uid + '/lessons/aula');
  const list = await handler(new Request('https://files.example/lessons', { headers }), env); assert.equal((await list.json())[0].path, 'r2:aula');
  const download = await handler(new Request('https://files.example/lessons/aula', { headers }), env); assert.equal(await download.text(), '{}');
  const packed = await compressJSONText(JSON.stringify({ notes: 'Aprender. '.repeat(100) }));
  await handler(new Request('https://files.example/lessons/comprimida', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/gzip', 'Content-Length': String(packed.buffer.byteLength) }, body: packed.buffer }), env);
  const zipped = await handler(new Request('https://files.example/lessons/comprimida', { headers }), env);
  assert.equal(zipped.headers.get('Content-Encoding'), 'gzip'); assert.equal((await unpackLesson(await zipped.blob())).notes, 'Aprender. '.repeat(100));
  assert.equal((await handler(new Request('https://files.example/profile/avatar', { method: 'PUT', headers: { ...headers, 'Content-Length': '300000' }, body: '{}' }), env)).status, 413);
  const denied = createR2Handler(async () => { throw Error('expired'); });
  assert.equal((await denied(new Request('https://files.example/lessons', { headers }), env)).status, 401);
});
