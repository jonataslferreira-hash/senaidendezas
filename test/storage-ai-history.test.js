import test from 'node:test';
import assert from 'node:assert/strict';
import {createR2Handler} from '../cloudflare/r2-worker.js';

test('histórico da IA exige login e fica isolado por conta', async()=>{
  const objects=new Map();
  const env={FILES:{get:async key=>objects.has(key)?{text:async()=>objects.get(key)}:null,put:async(key,value)=>objects.set(key,value)}};
  const handler=createR2Handler(async token=>({id:token==='account-a'?'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa':'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',email_confirmed_at:'2026-01-01',is_anonymous:false}));
  const url='https://storage.example/storage-ai/history';
  const headers=token=>({Authorization:'Bearer '+token.padEnd(24,'x')});
  // Tokens are mapped by their account prefix in this isolated test.
  const auth=createR2Handler(async token=>({id:token.startsWith('account-a')?'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa':'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',email_confirmed_at:'2026-01-01',is_anonymous:false}));
  const denied=await handler(new Request(url),env);
  assert.equal(denied.status,401);
  const payload={sessions:[{id:'chat-1',title:'Aula',messages:[{role:'user',text:'Crie slides'}]}]};
  const saved=await auth(new Request(url,{method:'PUT',headers:{...headers('account-a'),'Content-Type':'application/json'},body:JSON.stringify(payload)}),env);
  assert.equal(saved.status,200);
  const own=await auth(new Request(url,{headers:headers('account-a')}),env);
  assert.deepEqual(await own.json(),payload);
  const other=await auth(new Request(url,{headers:headers('account-b')}),env);
  assert.deepEqual(await other.json(),{sessions:[]});
});
