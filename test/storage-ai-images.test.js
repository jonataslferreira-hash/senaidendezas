import test from 'node:test';
import assert from 'node:assert/strict';
import { createR2Handler } from '../cloudflare/r2-worker.js';

const user={id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-11-01'};
const auth={Authorization:'Bearer test-token-1234567890'};

const commonsPayload={query:{pages:[
  {pageid:1,title:'File:Copilot on laptop.png',index:1,imageinfo:[{url:'https://upload.wikimedia.org/wikipedia/commons/1/1a/Copilot.png',thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Copilot.png/640px-Copilot.png',width:1600,height:900,mime:'image/png',extmetadata:{LicenseShortName:{value:'CC BY-SA 4.0'},Artist:{value:'Ana Fotógrafa'}}}]},
  {pageid:2,title:'File:Aeronave.png',index:2,imageinfo:[{url:'https://upload.wikimedia.org/wikipedia/commons/2/2b/Aeronave.png',thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Aeronave.png/640px-Aeronave.png',width:800,height:1200,mime:'image/png',extmetadata:{LicenseShortName:{value:'CC0'}}}]}
]}};
const wikiPayload={query:{pages:[
  {pageid:9,title:'Microsoft Copilot',pageimage:'Wikipedia Bing Chat Feature.png',fullurl:'https://pt.wikipedia.org/wiki/Microsoft_Copilot',original:{source:'https://upload.wikimedia.org/wikipedia/commons/6/6d/Wikipedia_Bing_Chat_Feature.png',width:800,height:800},thumbnail:{source:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Wikipedia_Bing_Chat_Feature.png/640px-Wikipedia_Bing_Chat_Feature.png',width:640,height:640}}
]}};
const openversePayload={results:[
  {id:'a1',title:'Microsoft Copilot AI',creator:'Ana Fotógrafa',license:'by',license_version:'4.0',license_url:'https://creativecommons.org/licenses/by/4.0/',foreign_landing_url:'https://flickr.com/photos/1/2',url:'https://live.staticflickr.com/1.jpg',thumbnail:'https://api.openverse.org/v1/images/a1/thumb/',width:1200,height:800,tags:[{name:'copilot'}]}
]};

function mockCatalogs(t){
  t.mock.method(globalThis,'fetch',async url=>{
    const target=String(url);
    if(target.includes('commons.wikimedia.org/w/api.php')&&target.includes('titles='))return Response.json({query:{pages:[{title:'File:Wikipedia Bing Chat Feature.png',imageinfo:[{extmetadata:{LicenseShortName:{value:'CC BY-SA 4.0'},Artist:{value:'Ana Fotógrafa'}}}]}]}});
    if(target.includes('commons.wikimedia.org/w/api.php'))return Response.json(commonsPayload);
    if(target.includes('wikipedia.org/w/api.php'))return Response.json(wikiPayload);
    if(target.includes('api.openverse.org'))return Response.json(openversePayload);
    throw Error('chamada inesperada: '+target);
  });
}

test('a busca de imagens devolve origem e licença de cada resultado',async t=>{
  const handle=createR2Handler(async()=>user);
  mockCatalogs(t);
  const response=await handle(new Request('https://files.example/storage-ai/images?q='+encodeURIComponent('Microsoft Copilot AI'),{headers:auth}),{});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.ok(body.items.length>=3,'a busca precisa devolver imagens');
  for(const item of body.items){
    assert.ok(item.source,'toda imagem precisa mostrar a origem');
    assert.ok(item.license,'a licença precisa vir junto quando existe');
    assert.ok(item.thumbnail&&item.url);
  }
  const first=body.items[0];
  assert.match(first.title,/copilot/i,'o resultado mais relevante vem primeiro');
});

test('a busca de imagens exige a sessão da conta',async()=>{
  const handle=createR2Handler(async()=>user);
  const response=await handle(new Request('https://files.example/storage-ai/images?q=copilot'),{});
  assert.equal(response.status,401);
});

test('o proxy do arquivo original recusa endereços fora da lista',async()=>{
  const handle=createR2Handler(async()=>user);
  const response=await handle(new Request('https://files.example/storage-ai/images/raw?url='+encodeURIComponent('https://exemplo-malicioso.test/imagem.png'),{headers:auth}),{});
  assert.equal(response.status,502);
  assert.equal((await response.json()).error,'image_unavailable');
});
