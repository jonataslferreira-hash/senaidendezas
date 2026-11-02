import test from 'node:test';
import assert from 'node:assert/strict';
import {Y,writeLesson,readLesson,encode,decode} from '../src/collaboration-core.js';
import {newLesson,newSlide,clone} from '../src/lessons.js';
import {createR2Handler} from '../cloudflare/r2-worker.js';
import {cropRectangle} from '../src/photo-editor.js';
import {editorTracks,spotifyTrackId} from '../src/editor-playlist.js';
import {canvasFromSlide} from '../src/canvas-data.js';
function pair(){const original=newLesson();original.title='AB';original.slides.push(newSlide());const a=new Y.Doc();writeLesson(a,original);const b=new Y.Doc();Y.applyUpdate(b,Y.encodeStateAsUpdate(a));return{a,b,original};}
function merge(a,b){const au=Y.encodeStateAsUpdate(a),bu=Y.encodeStateAsUpdate(b);Y.applyUpdate(a,bu);Y.applyUpdate(b,au);assert.deepEqual(readLesson(a),readLesson(b));}
test('colaboração combina texto simultâneo e campos diferentes, sem depender da ordem ou repetir inserções',()=>{
  const {a,b}=pair(),first=readLesson(a),second=readLesson(b);
  first.title='AxB';first.slides[0].intro='Mudança de Ana';writeLesson(a,first);
  second.title='AyB';second.slides[1].intro='Mudança de Bruno';writeLesson(b,second);
  merge(a,b);const lesson=readLesson(a);assert.match(lesson.title,/A[xy]{2}B/);assert.equal(lesson.slides[0].intro,'Mudança de Ana');assert.equal(lesson.slides[1].intro,'Mudança de Bruno');
  const backup=encode(Y.encodeStateAsUpdate(a)),restored=new Y.Doc();Y.applyUpdate(restored,decode(backup));Y.applyUpdate(restored,decode(backup));assert.deepEqual(readLesson(restored),lesson);
  a.destroy();b.destroy();restored.destroy();
});
test('mover slides enquanto outra pessoa edita mantém o texto ligado ao slide; novos elementos concorrentes convergem',()=>{
  const {a,b,original}=pair(),first=readLesson(a),second=readLesson(b);
  first.slides.reverse();writeLesson(a,first);second.slides[0].title='Texto escrito durante a mudança de ordem';writeLesson(b,second);
  merge(a,b);assert.equal(readLesson(a).slides.find(s=>s.id===original.slides[0].id).title,second.slides[0].title);assert.equal(readLesson(a).slides[0].id,original.slides[1].id);
  const av=readLesson(a),bv=readLesson(b);av.slides.push(newSlide());bv.slides.push(newSlide());writeLesson(a,av);writeLesson(b,bv);merge(a,b);assert.equal(readLesson(a).slides.length,4);
  a.destroy();b.destroy();
});
test('edições simultâneas do slide visual combinam texto mas mantêm tipos, cores e alinhamentos válidos',()=>{
  const lesson=newLesson();lesson.slides=lesson.slides.map(canvasFromSlide);
  const a=new Y.Doc();writeLesson(a,lesson);const b=new Y.Doc();Y.applyUpdate(b,Y.encodeStateAsUpdate(a));
  const first=readLesson(a),second=readLesson(b);first.slides[0].elements[0].color='#111111';second.slides[0].elements[0].color='#222222';first.slides[0].elements[0].align='center';second.slides[0].elements[0].align='right';
  writeLesson(a,first);writeLesson(b,second);merge(a,b);const element=readLesson(a).slides[0].elements[0];
  assert.ok(['#111111','#222222'].includes(element.color));assert.ok(['center','right'].includes(element.align));assert.equal(readLesson(a).slides[0].kind,'canvas');a.destroy();b.destroy();
});
test('Worker exige login e associação ao grupo para arquivos, protege revisão ativa e não declara e-mail enviado sem provedor',async()=>{
  const uid='11111111-1111-4111-8111-111111111111',group='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333',doc='44444444-4444-4444-8444-444444444444';
  let member=false,unused=false,put,deleted;
  const handler=createR2Handler(async()=>({id:uid,email_confirmed_at:'today'}),async(token,env,name,args)=>{
    if(name==='sl_group_access'||name==='sl_group_edit_access')return member;if(name==='sl_revision_unused')return unused;
    if(name==='sl_invite_collaborator')return{token:revision,email:args.p_email,title:'Aula do grupo'};
    return false;
  });
  const env={FILES:{put:async(key,body,options)=>{put={key,options};return{key};},get:async()=>({body:'{}',httpMetadata:{contentType:'application/json'}}),delete:async key=>{deleted=key;}}};
  const request=(path,method='GET',body)=>new Request('https://files.example'+path,{method,headers:{Origin:'http://localhost:5173',Authorization:'Bearer '+('t'.repeat(30)),...(body?{'Content-Type':'application/json','Content-Length':String(body.length)}:{})},...(body?{body}:{})});
  const path=`/groups/${group}/${revision}`;
  assert.equal((await handler(new Request('https://files.example'+path),env)).status,401);
  assert.equal((await handler(request(path),env)).status,403);
  member=true;assert.equal((await handler(request(path,'PUT','{}'),env)).status,200);assert.equal(put.key,`groups/${group}/${revision}`);assert.deepEqual(put.options.onlyIf,{etagDoesNotMatch:'*'});
  assert.equal((await handler(request(path,'DELETE'),env)).status,409);assert.equal(deleted,undefined);unused=true;assert.equal((await handler(request(path,'DELETE'),env)).status,200);
  const invited=await(await handler(request('/collaboration/invite','POST',JSON.stringify({documentId:doc,email:'pessoa@example.com'})),env)).json();
  assert.equal(invited.sent,false);assert.equal(new URL(invited.link).searchParams.get('invite'),revision);
});
test('recorte mantém centro, permite ampliar além de 4× e arrastar livremente; links Spotify são validados',()=>{
  for(const [w,h] of [[400,200],[200,400],[50,50]])for(const zoom of [1,2,4,20,1000]){const crop=cropRectangle(w,h,zoom);assert.ok(crop.x>=0&&crop.y>=0&&crop.x+crop.side<=w&&crop.y+crop.side<=h);assert.equal(crop.x+crop.side/2,w/2);assert.equal(crop.y+crop.side/2,h/2);}
  assert.ok(cropRectangle(400,200,20).side<cropRectangle(400,200,4).side);assert.ok(cropRectangle(400,200,2,-.5,-.5).x<0);
  assert.equal(editorTracks.length,5);assert.equal(spotifyTrackId('https://open.spotify.com/track/0123456789012345678901?si=abc'),'0123456789012345678901');assert.equal(spotifyTrackId('https://evil.example/track/0123456789012345678901'),null);
});
