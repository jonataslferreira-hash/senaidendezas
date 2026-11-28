import test from 'node:test';import assert from 'node:assert/strict';
import {createR2Handler} from '../cloudflare/r2-worker.js';
import {Room} from '../src/room.js';
const nonce='7a0e974b-df3d-4143-9e54-57b1d877324b',code='123456',token='a'.repeat(30),secret='a-long-private-secret-for-classroom-identification';
const user={id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-01-01',identities:[{provider:'google',identity_data:{sub:'12345678901234567890'}}]};
const handler=createR2Handler(async()=>user);
function req(path,data,auth=true){return new Request('https://worker.example'+path,{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});}
test('prova vinculada a sala e desafio, assinada pelo servidor e sem token de acesso',async()=>{
 const env={CLASSROOM_IDENTITY_SECRET:secret};const issued=await handler(req('/classroom-identity/proof',{code,nonce,googleUserId:'999999999999'}),env);assert.equal(issued.status,200);const {proof}=await issued.json();assert.ok(!proof.includes(token));
 let result=await handler(req('/classroom-identity/verify',{code,nonce,proof},false),env);assert.equal(result.status,200);assert.deepEqual(await result.json(),{googleUserId:'12345678901234567890'});
 result=await handler(req('/classroom-identity/verify',{code:'999999',nonce,proof},false),env);assert.equal(result.status,403);
 result=await handler(req('/classroom-identity/verify',{code,nonce:'6a0e974b-df3d-4143-9e54-57b1d877324b',proof},false),env);assert.equal(result.status,403);
 result=await handler(req('/classroom-identity/verify',{code,nonce,proof:proof.slice(0,-1)+(proof.endsWith('a')?'b':'a')},false),env);assert.equal(result.status,403);
});
test('sem login, sem Google ou sem segredo não existe identificação',async()=>{
 const env={CLASSROOM_IDENTITY_SECRET:secret};assert.equal((await handler(req('/classroom-identity/proof',{code,nonce},false),env)).status,401);
 const noGoogle=createR2Handler(async()=>({...user,identities:[]}));assert.equal((await noGoogle(req('/classroom-identity/proof',{code,nonce}),env)).status,403);
 assert.equal((await handler(req('/classroom-identity/proof',{code,nonce}),{})).status,503);
});
test('identidade Google aparece apenas no estado do apresentador',()=>{
 const room=new Room(code);const {id}=room.join({name:'Ana'});room.data.players[0].googleUserId='12345678901234567890';
 assert.equal(room.snapshot().quizRanking[0].googleUserId,'12345678901234567890');assert.equal(room.snapshot(id).quizRanking[0].googleUserId,undefined);assert.ok(!JSON.stringify(room.snapshot(id)).includes('12345678901234567890'));
});
test('não aceita provas vencidas nem assinaturas de outro servidor',async()=>{
 const env={CLASSROOM_IDENTITY_SECRET:secret},encoder=new TextEncoder();const base64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 const data=base64(encoder.encode(JSON.stringify({code,nonce,sub:'12345678901234567890',exp:Date.now()-1})));const k=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=base64(new Uint8Array(await crypto.subtle.sign('HMAC',k,encoder.encode(data))));
 assert.equal((await handler(req('/classroom-identity/verify',{code,nonce,proof:data+'.'+signature},false),env)).status,403);
 const proof=(await (await handler(req('/classroom-identity/proof',{code,nonce}),env)).json()).proof;
 assert.equal((await handler(req('/classroom-identity/verify',{code,nonce,proof},false),{CLASSROOM_IDENTITY_SECRET:'different-long-secret-of-at-least-32-characters'})).status,403);
});
test('nome, foto e identidade alegados pelo convidado não se tornam identidade verificada',()=>{
 const room=new Room(code);room.join({name:'Ana',googleUserId:'12345678901234567890'});assert.equal(room.snapshot().quizRanking[0].googleUserId,undefined);
});
