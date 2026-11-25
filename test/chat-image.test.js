import test from 'node:test';
import assert from 'node:assert/strict';
import {handleChatImage} from '../cloudflare/chat-image-worker.js';
import {chatMessageBody,parseChatImage} from '../src/chat-audio.js';
const id='33333333-3333-4333-8333-333333333333',file='44444444-4444-4444-8444-444444444444',user={id:'11111111-1111-4111-8111-111111111111'};
const path=`/chat-image/doc/${id}/${file}`;
function fixture(){const objects=new Map(),env={FILES:{get:async k=>objects.get(k),put:async(k,body,meta)=>objects.set(k,{body,...meta}),delete:async k=>objects.delete(k)}};return {env,objects};}
const request=(method,body,type='image/png')=>new Request('https://worker.example'+path,{method,...(body?{body,headers:{'Content-Type':type}}:{})});
test('imagem privada exige acesso à conversa e valida conteúdo e autoria',async()=>{
 const {env,objects}=fixture(),rpc=async()=>true,headers={},png=new Uint8Array([137,80,78,71,13,10,26,10,1,2,3]);
 assert.equal((await handleChatImage(request('PUT',png),env,user,headers,async()=>false)).status,403);
 assert.equal((await handleChatImage(request('PUT',new Uint8Array([1,2,3])),env,user,headers,rpc)).status,415);
 assert.equal((await handleChatImage(request('PUT',png),env,user,headers,rpc)).status,200);
 assert.equal((await handleChatImage(request('PUT',png),env,user,headers,rpc)).status,409);
 const response=await handleChatImage(request('GET'),env,user,headers,rpc);assert.equal(response.headers.get('Content-Type'),'image/png');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 assert.equal((await handleChatImage(request('DELETE'),env,{id:'22222222-2222-4222-8222-222222222222'},headers,rpc)).status,403);
 assert.equal((await handleChatImage(request('DELETE'),env,user,headers,rpc)).status,200);assert.equal(objects.size,0);
});
test('referências de imagem só são aceitas para a conversa correta; links malformados não quebram o chat',()=>{
 const body='[storage-lab-image]'+JSON.stringify({path});assert.equal(parseChatImage(body,'doc',id).path,path);assert.equal(parseChatImage(body,'dm',id),null);
 assert.match(chatMessageBody(body,'doc',id),/data-chat-image/);assert.doesNotThrow(()=>chatMessageBody('veja https://example.com/%xx.', 'doc',id));assert.match(chatMessageBody('https://example.com/path.', 'doc',id),/href="https:\/\/example.com\/path"/);
});

test('prévia só recebe CORS quando sua origem exata está autorizada no Worker',async()=>{
 const {createR2Handler}=await import('../cloudflare/r2-worker.js');const worker=createR2Handler(),origin='https://5173-example.e2b.app';
 const req=()=>new Request('https://worker.example/lessons',{method:'OPTIONS',headers:{Origin:origin}});
 assert.equal((await worker(req(),{})).status,403);
 const allowed=await worker(req(),{ALLOWED_ORIGINS:`https://jonataslferreira-hash.github.io,${origin}`});
 assert.equal(allowed.status,204);assert.equal(allowed.headers.get('Access-Control-Allow-Origin'),origin);
});
