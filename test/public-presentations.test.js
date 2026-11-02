import test from 'node:test';
import assert from 'node:assert/strict';
import {createR2Handler} from '../cloudflare/r2-worker.js';
import {spotifyMetadata} from '../src/spotify.js';
test('link de apresentação lê sem login, exige dono para revogar e não aceita edição pública',async()=>{
  const files=new Map(),owner='11111111-1111-4111-8111-111111111111';let uid=owner;
  const env={FILES:{put:async(key,body,options)=>{files.set(key,{body:await new Response(body).text(),customMetadata:options.customMetadata});return{key};},get:async key=>files.get(key),head:async key=>files.get(key),delete:async key=>files.delete(key)}};
  const handler=createR2Handler(async()=>({id:uid,email_confirmed_at:'now'}));
  const make=(path,method='GET',auth=false,body)=>new Request('https://files.example'+path,{method,headers:{Origin:'http://localhost:5173',...(auth?{Authorization:'Bearer '+('x'.repeat(30))}:{}),...(body?{'Content-Type':'application/json','Content-Length':String(body.length)}:{})},...(body?{body}:{})});
  assert.equal((await handler(make('/presentations','POST',false,'{}'),env)).status,401);
  const created=await handler(make('/presentations','POST',true,'{"version":1}'),env);assert.equal(created.status,201);const {token}=await created.json();
  const path='/presentations/'+token,read=await handler(make(path),env);assert.equal(read.status,200);assert.equal(await read.text(),'{"version":1}');
  assert.equal((await handler(make(path,'PUT',false,'{}'),env)).status,401);
  uid='22222222-2222-4222-8222-222222222222';assert.equal((await handler(make(path,'DELETE',true),env)).status,403);
  uid=owner;assert.equal((await handler(make(path,'DELETE',true),env)).status,200);assert.equal((await handler(make(path),env)).status,404);
});
test('Spotify importa metadados públicos sem Worker, login ou SQL e conserva o link válido se a consulta falhar',async()=>{
  const original=global.fetch,calls=[];
  try{global.fetch=async url=>{calls.push(String(url));return Response.json({title:'Faixa de teste',thumbnail_url:'https://image.example/cover.jpg'});};
    const result=await spotifyMetadata('https://open.spotify.com/intl-pt/track/05TXKw2pxqf8ETIUdvEy6C?si=abc');assert.equal(result.title,'Faixa de teste');assert.equal(calls.length,1);assert.ok(calls[0].startsWith('https://open.spotify.com/oembed?'));
    global.fetch=async()=>{throw Error('Offline');};const fallback=await spotifyMetadata('https://open.spotify.com/track/05TXKw2pxqf8ETIUdvEy6C');assert.equal(fallback.id,result.id);assert.equal(fallback.title,'ドタバタちょろゴンず');
    await assert.rejects(()=>spotifyMetadata('https://example.com/file'));
  }finally{global.fetch=original;}
});
