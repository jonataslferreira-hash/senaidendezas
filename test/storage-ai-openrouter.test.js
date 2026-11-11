import test from 'node:test';
import assert from 'node:assert/strict';
import { createR2Handler } from '../cloudflare/r2-worker.js';

const user={id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-11-01'};
const auth={Authorization:'Bearer test-token-1234567890'};

function memoryCache(){
  const store=new Map();
  globalThis.caches={default:{
    match:async url=>store.get(url.toString())||null,
    put:async(url,response)=>{store.set(url.toString(),response.clone());}
  }};
  return store;
}

// Cada teste usa uma chave diferente porque a cota do OpenRouter é da conta,
// não da pessoa: o Worker guarda a leitura por um minuto para não gastar
// requisições do endpoint de chave.
test('OpenRouter guarda a cota do dia e não chama o modelo quando ela acabou',async t=>{
  const handle=createR2Handler(async()=>user);
  let completions=0;
  t.mock.method(globalThis,'fetch',async(url)=>{
    if(String(url).includes('/api/v1/key'))return Response.json({data:{free_model_daily_requests:{used:50,limit:50,remaining:0}}});
    if(String(url).includes('/api/v1/chat/completions')){completions++;return Response.json({choices:[{message:{content:'{"slides":[]}'}}]});}
    throw Error('chamada inesperada: '+url);
  });
  const response=await handle(new Request('https://files.example/storage-ai',{method:'POST',headers:auth,body:JSON.stringify({mode:'create',prompt:'HDD',count:1})}),
    {OPENROUTER_API_KEY:'or-key-gasto',AI_LIMIT:{limit:async()=>({success:true})}});
  assert.equal(response.status,429);
  const body=await response.json();
  assert.equal(body.error,'ai_quota');
  assert.equal(body.provider,'openrouter');
  assert.equal(body.remaining,0);
  assert.match(body.notice,/cota/i);
  assert.equal(completions,0,'o modelo não deve ser chamado sem cota');
});

test('OpenRouter monta slides em português e reaproveita a resposta repetida',async t=>{
  const handle=createR2Handler(async()=>user);
  memoryCache();
  const calls=[];
  t.mock.method(globalThis,'fetch',async(url,options={})=>{
    const target=String(url);
    if(target.includes('/api/v1/key'))return Response.json({data:{free_model_daily_requests:{used:3,limit:50,remaining:47}}});
    if(target.includes('/api/v1/chat/completions')){
      calls.push(JSON.parse(options.body));
      return Response.json({choices:[{message:{content:'{"title":"Armazenamento","slides":[{"title":"HDD","body":"Guarda os dados."}]}'}}]});
    }
    throw Error('chamada inesperada: '+target);
  });
  const env={OPENROUTER_API_KEY:'or-key-ok',AI_LIMIT:{limit:async()=>({success:true})}};
  const request=()=>new Request('https://files.example/storage-ai',{method:'POST',headers:auth,body:JSON.stringify({mode:'create',prompt:'HDD',count:1})});
  const first=await handle(request(),env);
  assert.equal(first.status,200);
  assert.equal((await first.json()).slides[0].title,'HDD');
  assert.equal(calls.length,1);
  assert.equal(calls[0].model,'openrouter/free');
  assert.equal(calls[0].response_format.type,'json_object');
  // O mesmo pedido de novo não consome outra chamada da cota.
  const second=await handle(request(),env);
  assert.equal(second.status,200);
  assert.equal(calls.length,1,'a repetição deve vir do cache do Worker');
});

test('a rota de cota informa quanto resta das chamadas gratuitas',async t=>{
  const handle=createR2Handler(async()=>user);
  t.mock.method(globalThis,'fetch',async(url)=>{
    if(String(url).includes('/api/v1/key'))return Response.json({data:{free_model_daily_requests:{used:12,limit:50,remaining:38}}});
    throw Error('chamada inesperada: '+url);
  });
  const response=await handle(new Request('https://files.example/storage-ai/quota',{headers:auth}),{OPENROUTER_API_KEY:'or-key-info',AI_LIMIT:{limit:async()=>({success:true})}});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.provider,'openrouter');
  assert.equal(body.remaining,38);
  assert.equal(body.limit,50);
  assert.match(body.notice,/38/);
});

test('a cota esgotada também vale para editar slides e informa a renovação',async t=>{
  const handle=createR2Handler(async()=>user);
  t.mock.method(globalThis,'fetch',async(url)=>{
    if(String(url).includes('/api/v1/key'))return Response.json({data:{free_model_daily_requests:{used:50,limit:50,remaining:0}}});
    throw Error('chamada inesperada: '+url);
  });
  const response=await handle(new Request('https://files.example/storage-ai',{method:'POST',headers:auth,body:JSON.stringify({mode:'edit',prompt:'mude o título',context:{slides:[{id:'s1'}]}})}),
    {OPENROUTER_API_KEY:'or-key-edicao',AI_LIMIT:{limit:async()=>({success:true})}});
  assert.equal(response.status,429);
  const body=await response.json();
  assert.equal(body.error,'ai_quota');
  assert.ok(body.resetAt>Date.now(),'a renovação da cota precisa ser informada');
});

test('o limite de 20 chamadas por minuto vira aviso de ocupado, não de cota',async t=>{
  const handle=createR2Handler(async()=>user);
  t.mock.method(globalThis,'fetch',async(url)=>{
    if(String(url).includes('/api/v1/key'))return Response.json({data:{free_model_daily_requests:{used:5,limit:50,remaining:45}}});
    if(String(url).includes('/api/v1/chat/completions'))return Response.json({error:{code:429,message:'Rate limit exceeded: 20 free model requests per minute'}},{status:429,headers:{'X-RateLimit-Remaining':'12'}});
    throw Error('chamada inesperada: '+url);
  });
  const response=await handle(new Request('https://files.example/storage-ai',{method:'POST',headers:auth,body:JSON.stringify({mode:'create',prompt:'HDD',count:1})}),
    {OPENROUTER_API_KEY:'or-key-minuto',AI_LIMIT:{limit:async()=>({success:true})}});
  assert.equal(response.status,429);
  assert.equal((await response.json()).error,'ai_capacity');
});
