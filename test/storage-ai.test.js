import test from 'node:test';
import assert from 'node:assert/strict';
import { createR2Handler } from '../cloudflare/r2-worker.js';

test('Storage AI passa apenas dados validados ao modelo e exige login e limites', async()=>{
 const handle=createR2Handler(async()=>({id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-11-01'}));
 const photo='data:image/jpeg;base64,YQ==';
 const request=(body,token=true)=>new Request('https://files.example/storage-ai',{
  method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer test-token-1234567890'}:{})},
  body:JSON.stringify(body)
 });
 const input={mode:'create',prompt:'Sobre HDD e SSD',count:1,photos:[photo]};
 const keys=[];
 const env={STORAGE_AI_FREE_CONFIRMED:'true',AI_LIMIT:{limit:async({key})=>{keys.push(key);return {success:true};}},AI:{run:async(model,data)=>{
  assert.match(model,/qwen/);
  assert.equal(data.messages[1].content[1].image_url.url,photo);
  return {choices:[{message:{content:'{"title":"Aula","slides":[{"title":"HDD","body":"Armazenamento"}]}'}}]};
 }}};
 assert.equal((await handle(request(input,false),env)).status,401);
 assert.equal((await handle(request(input),{...env,STORAGE_AI_FREE_CONFIRMED:undefined})).status,503);
 assert.equal((await handle(request({...input,count:99}),env)).status,400);
 assert.equal((await handle(request({...input,count:21}),env)).status,400);
 assert.equal((await handle(request({...input,count:20}),env)).status,200);
 const response=await handle(request(input),env);
 assert.equal(response.status,200);assert.equal((await response.json()).slides[0].title,'HDD');
 assert.ok(keys.includes('storage-ai:site'));
 assert.equal((await handle(request(input),{...env,AI_LIMIT:{limit:async()=>({success:false})}})).status,429);
 const context={slides:[{id:'slide-1',number:1,editable:true}]};
 const reviseEnv={...env,AI:{run:async(_model,data)=>{
  assert.match(data.messages[0].content,/Não crie, exclua ou reordene slides/);
  assert.deepEqual(JSON.parse(data.messages[1].content).context,context);
  return {response:{edits:[{slideId:'slide-1',changes:[]}]}};
 }}};
 assert.equal((await handle(request({mode:'revise',prompt:'Revise o slide',context}),reviseEnv)).status,200);
});

test('miniatura de aula fica isolada na conta e é removida com a aula', async()=>{
 const uid='11111111-1111-4111-8111-111111111111',files=new Map();
 const handle=createR2Handler(async()=>({id:uid,email_confirmed_at:'2026-11-01'}));
 const env={FILES:{
   put:async(key,body,metadata)=>files.set(key,{body,...metadata}),
   get:async key=>files.get(key),
   delete:async key=>files.delete(key)
 }};
 const body=new Uint8Array([1,2,3]),headers={Authorization:'Bearer test-token-1234567890'};
 const url='https://files.example/lessons/aula/cover';
 assert.equal((await handle(new Request(url,{method:'PUT',headers:{...headers,'Content-Type':'image/webp','Content-Length':'3'},body}),env)).status,200);
 assert.ok(files.has(uid+'/lesson-covers/aula'));
 const response=await handle(new Request(url,{headers}),env);
 assert.equal(response.headers.get('Content-Type'),'image/webp');
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),body);
 assert.equal((await handle(new Request('https://files.example/lessons/aula',{method:'DELETE',headers}),env)).status,200);
 assert.equal((await handle(new Request(url,{headers}),env)).status,404);
});
