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
  const count=JSON.parse(data.messages[1].content[0].text).count;
  return {response:{title:'Aula',slides:Array.from({length:count},()=>({title:'HDD',body:'Armazenamento'}))}};
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
 const quota=await handle(request(input),{...env,AI:{run:async()=>{throw Error('AiError: you have used up your daily free allocation');}}});
 assert.equal(quota.status,429);
 assert.equal((await quota.json()).error,'ai_quota');
 const context={slides:[{id:'slide-1',number:1,editable:true}]};
 const reviseEnv={...env,AI:{run:async(_model,data)=>{
  assert.match(data.messages[0].content,/slideOrder com todos os IDs existentes/);
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
test('Storage AI recupera um 502 do modelo sem reenviar a ação pelo navegador',async()=>{
 const handle=createR2Handler(async()=>({id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-11-01'}));
 const calls=[];
 const env={STORAGE_AI_FREE_CONFIRMED:'true',AI_LIMIT:{limit:async()=>({success:true})},AI:{run:async(model,input)=>{
  calls.push(model);
  if(calls.length===1)throw Object.assign(Error('Provider error'),{status:502});
  assert.equal(input.response_format.type,'json_object');
  return {response:{slides:[{title:'HDD',body:'Armazenamento magnético.'}]}};
 }}};
 const response=await handle(new Request('https://files.example/storage-ai',{method:'POST',headers:{Authorization:'Bearer test-token-1234567890'},body:JSON.stringify({mode:'create',prompt:'HDD',count:1})}),env);
 assert.equal(response.status,200);
 assert.equal((await response.json()).slides[0].title,'HDD');
 assert.equal(calls.length,2);
});

test('storageAI envia texto e imagem ao Gemini quando a chave do Worker está configurada',async t=>{
 const handle=createR2Handler(async()=>({id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-11-01'}));
 t.mock.method(globalThis,'fetch',async(url,{headers,body})=>{
  assert.match(url,/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.1-flash-lite:generateContent$/);
  assert.equal(headers['x-goog-api-key'],'key-for-test');
  const request=JSON.parse(body);
  assert.equal(request.generationConfig.responseMimeType,'application/json');
  assert.deepEqual(request.contents[0].parts[1],{inlineData:{mimeType:'image/jpeg',data:'YQ=='}});
  return Response.json({candidates:[{content:{parts:[{text:'{"slides":[{"title":"SSD"}]}'}]}}]});
 });
 const request=new Request('https://files.example/storage-ai',{method:'POST',headers:{Authorization:'Bearer test-token-1234567890'},body:JSON.stringify({mode:'create',prompt:'SSD',count:1,photos:['data:image/jpeg;base64,YQ==']})});
 const response=await handle(request,{GEMINI_API_KEY:'key-for-test',AI_LIMIT:{limit:async()=>({success:true})}});
 assert.equal(response.status,200);
 assert.equal((await response.json()).slides[0].title,'SSD');
});

test('storageAI usa Groq primeiro e preserva as falhas de cada serviço quando a reserva também falha',async t=>{
 const handle=createR2Handler(async()=>({id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-11-01'}));
 const request=()=>new Request('https://files.example/storage-ai',{method:'POST',headers:{Authorization:'Bearer test-token-1234567890'},body:JSON.stringify({mode:'create',prompt:'SSD',count:1,photos:['data:image/jpeg;base64,YQ==']})});
 const env={GROQ_API_KEY:'groq-test-key',GEMINI_API_KEY:'gemini-test-key',STORAGE_AI_FREE_CONFIRMED:'true',
  AI_LIMIT:{limit:async()=>({success:true})},
  AI:{run:async()=>{throw Error('AiError: you have used up your daily free allocation');}}};
 let groqOk=true;
 const fetchMock=t.mock.method(globalThis,'fetch',async(url,{headers,body})=>{
  if(url.startsWith('https://api.groq.com/')){
   assert.equal(headers.Authorization,'Bearer groq-test-key');
   const input=JSON.parse(body);
   assert.equal(input.model,'qwen/qwen3.8-27b');
   assert.equal(input.reasoning_effort,'none');
   assert.equal(input.messages[1].content[1].image_url.url,'data:image/jpeg;base64,YQ==');
   if(groqOk)return Response.json({choices:[{message:{content:'{"slides":[{"title":"SSD"}]}'}}]});
   return Response.json({}, {status:429});
  }
  assert.match(url,/generativelanguage\.googleapis\.com/);
  return Response.json({}, {status:403});
 });
 const success=await handle(request(),env);
 assert.equal(success.status,200);
 assert.equal(fetchMock.mock.callCount(),1);
 groqOk=false;
 const failed=await handle(request(),env);
 assert.equal(failed.status,502);
 assert.deepEqual(await failed.json(),{error:'ai_providers_failed',providers:[{provider:'groq',reason:'limit'},{provider:'gemini',reason:'access_denied'}]});
});

test('storageAI consulta o título do slide sem erro quando imageSearch não encontra foto',async t=>{
 const {createServer}=await import('vite');
 const previousR2=process.env.VITE_R2_API_URL;
 const previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 process.env.VITE_R2_API_URL='https://storage-lab-files.lagujf.workers.dev';
 const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
 try{
  const store=new Map();
  globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
  globalThis.document={hidden:true,createElement:()=>({style:{},content:{textContent:''}}),querySelector:()=>null};
  const searched=[];
  t.mock.method(globalThis,'fetch',async url=>{
   const target=String(url);
   if(target.endsWith('/storage-ai')){
    return Response.json({
     title:'Armazenamento Moderno',chatTitle:'HDD e SSD',description:'Comparação entre HDD e SSD',
     slides:[{title:'Disco rígido',body:'Armazenamento magnético.',imageSearch:'semresultadoxyz',theme:'ocean'}]
    });
   }
   if(target.includes('commons.wikimedia.org')){
    searched.push(new URL(target).searchParams.get('gsrsearch')||'');
    return Response.json({query:{pages:[]}});
   }
   return Response.json({query:{search:[],pages:[]},items:[]});
  });
  const {StorageAI}=await server.ssrLoadModule('/src/storage-ai.js');
  const studio={
   root:{addEventListener(){},querySelector(){return null;}},
   account:{user:{id:'u1'},client:{auth:{getSession:async()=>({data:{session:{access_token:'tok'}}})}},show(){},profile(){return '';}},
   callbacks:{render(){},toast(){}},
   library:{lessons:[],import:l=>l,save:l=>l},
   groups:{canEdit:true,isShared:()=>false},
   cloudLinks:{},cloudItems:[],linkCloud(){},cloudAction:async()=>{},view:'storage-ai'
  };
  const ai=new StorageAI(studio);
  ai.ensureSessions();
  ai.sessions[0].slideCount=1;
  await ai.create({elements:{prompt:{value:'Crie slides sobre HDD e SSD',focus(){}}}});
  assert.equal(ai.messages.some(message=>/spec is not defined/i.test(message.text||'')),false);
  assert.ok(searched.some(query=>query.includes('semresultadoxyz')));
  assert.ok(searched.some(query=>query.includes('hard disk')));
  assert.ok(searched.some(query=>query.includes('Armazenamento Moderno')));
  const preview=ai.previews.get(ai.activeChatId);
  assert.ok(preview);
  assert.equal(preview.lesson.slides.length,3);
 }finally{
  if(previousR2===undefined)delete process.env.VITE_R2_API_URL;
  else process.env.VITE_R2_API_URL=previousR2;
  if(previousStorage)Object.defineProperty(globalThis,'localStorage',previousStorage);
  else delete globalThis.localStorage;
  if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);
  else delete globalThis.document;
  await server.close();
 }
});
