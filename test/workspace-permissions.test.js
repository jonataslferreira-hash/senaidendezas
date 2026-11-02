import test from 'node:test';
import assert from 'node:assert/strict';
import {createR2Handler} from '../cloudflare/r2-worker.js';
const me='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',group='33333333-3333-4333-8333-333333333333',revision='44444444-4444-4444-8444-444444444444';
test('leitor pode buscar a aula mas não publicar ou remover arquivos; fotos exigem relação autorizada',async()=>{
 let editable=false,profile=false,writes=0;
 const handler=createR2Handler(async()=>({id:me,email_confirmed_at:'today'}),async(_t,_e,name)=>name==='sl_group_access'?true:name==='sl_group_edit_access'?editable:name==='sl_profile_access'?profile:name==='sl_revision_unused');
 const env={FILES:{get:async key=>({body:key,httpMetadata:{contentType:key.endsWith('avatar')?'image/gif':'application/json'}}),put:async()=>{writes++;return{};},delete:async()=>{writes++;}}};
 const req=(path,method='GET')=>new Request('https://files.test'+path,{method,headers:{Authorization:'Bearer '+('t'.repeat(30)),...(method==='PUT'?{'Content-Length':'2','Content-Type':'application/json'}:{})},...(method==='PUT'?{body:'{}'}:{})});
 const path=`/groups/${group}/${revision}`;
 assert.equal((await handler(req(path),env)).status,200);
 assert.equal((await handler(req(path,'PUT'),env)).status,403);
 assert.equal((await handler(req(path,'DELETE'),env)).status,403);assert.equal(writes,0);
 editable=true;assert.equal((await handler(req(path,'PUT'),env)).status,200);assert.equal(writes,1);
 assert.equal((await handler(req(`/people/${other}/avatar`),env)).status,403);
 profile=true;const photo=await handler(req(`/people/${other}/avatar`),env);assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/gif');assert.equal(await photo.text(),other+'/profile/avatar');
 assert.equal((await handler(req(`/people/${other}/avatar`,'PUT'),env)).status,405);
});
test('convite encaminha a permissão escolhida ao RPC protegido',async()=>{
 let args;const handler=createR2Handler(async()=>({id:me,email_confirmed_at:'today'}),async(_t,_e,name,value)=>{assert.equal(name,'sl_invite_with_role');args=value;return{token:revision,title:'Aula',email:'a@example.com'};});
 const body=JSON.stringify({documentId:group,email:'a@example.com',role:'viewer'});
 const response=await handler(new Request('https://files.test/collaboration/invite',{method:'POST',headers:{Authorization:'Bearer '+('t'.repeat(30)),'Content-Type':'application/json'},body}),{});
 assert.equal(response.status,200);assert.equal(args.p_role,'viewer');assert.equal((await response.json()).sent,false);
});
