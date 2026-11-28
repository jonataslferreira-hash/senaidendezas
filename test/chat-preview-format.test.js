import test from 'node:test';
import assert from 'node:assert/strict';
import {chatDayLabel,chatRows,sortChatMessages} from '../src/chat-format.js';
import {handleChatPreview} from '../cloudflare/chat-preview-worker.js';
import {createR2Handler} from '../cloudflare/r2-worker.js';

test('datas locais incluem ontem, anteontem e datas antigas, com ordenação e desempate estável',()=>{
 const today=new Date(2026,6,15,12),date=delta=>new Date(2026,6,15-delta,8).toISOString();
 assert.equal(chatDayLabel(date(0),today),'Hoje');assert.equal(chatDayLabel(date(1),today),'Ontem');assert.equal(chatDayLabel(date(2),today),'Anteontem');assert.equal(chatDayLabel(date(3),today),'12/07/2026');
 const rows=[{id:'b',created_at:date(0)},{id:'z',created_at:date(2)},{id:'a',created_at:date(0)}];assert.deepEqual(sortChatMessages(rows).map(r=>r.id),['z','a','b']);
 const markup=chatRows(sortChatMessages(rows),m=>`<article>${m.id}</article>`);assert.equal((markup.match(/class="chat-day"/g)||[]).length,2);assert.ok(markup.indexOf('z</article>')<markup.indexOf('a</article>'));
});

test('metadados públicos usam apenas ID e provedores permitidos, com cache e fallback',async()=>{
 let called=0,url;const fetcher=async input=>{called++;url=new URL(input);return Response.json({title:'Meu vídeo',author_name:'Canal',thumbnail_url:'https://i.vimeocdn.com/video/10.jpg'});};
 const user={id:'abc'},headers={'Access-Control-Allow-Origin':'https://example.org'};
 const request=path=>new Request('https://worker.example/chat-preview/'+path);
 const first=await handleChatPreview(request('youtube/AbCdEf12345'),user,headers,fetcher);assert.deepEqual(await first.json(),{title:'Meu vídeo',author:'Canal'});assert.equal(url.hostname,'www.youtube.com');assert.equal(url.searchParams.get('url'),'https://www.youtube.com/watch?v=AbCdEf12345');
 await handleChatPreview(request('youtube/AbCdEf12345'),user,headers,fetcher);assert.equal(called,1);
 const v=await handleChatPreview(request('vimeo/123456789'),user,headers,fetcher);assert.equal((await v.json()).thumbnail,'https://i.vimeocdn.com/video/10.jpg');assert.equal(url.hostname,'vimeo.com');
 assert.equal((await handleChatPreview(request('youtube/not-valid'),user,headers,fetcher)).status,400);assert.equal((await handleChatPreview(request('other/123456789'),user,headers,fetcher)).status,400);
 const music=await handleChatPreview(request('spotify/track-05TXKw2pxqf8ETIUdvEy6C'),user,headers,async input=>{assert.equal(new URL(input).hostname,'open.spotify.com');return Response.json({title:'Música',thumbnail_url:'https://image-cdn-fa.spotifycdn.com/image/example'});});assert.deepEqual(await music.json(),{title:'Música',author:'',thumbnail:'https://image-cdn-fa.spotifycdn.com/image/example'});
 const bad=await handleChatPreview(request('vimeo/999999999'),user,headers,async()=>Response.json({title:'Video',author_name:'Autor',thumbnail_url:'https://evil.example/track'}));assert.equal((await bad.json()).thumbnail,undefined);
 const spoof=await handleChatPreview(request('spotify/album-05TXKw2pxqf8ETIUdvEy6C'),user,headers,async()=>Response.json({title:'Álbum',thumbnail_url:'https://image-cdn-fa.spotifycdn.com.evil.example/image/x'}));assert.equal((await spoof.json()).thumbnail,undefined);
});

test('a rota de prévia exige sessão autenticada no Worker',async()=>{
 const handler=createR2Handler(async()=>({id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-01-01'}));
 const res=await handler(new Request('https://worker.example/chat-preview/youtube/AbCdEf12345'),{});assert.equal(res.status,401);
});
