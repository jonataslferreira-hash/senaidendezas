import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublicRoomLink,shortRoomLink,roomFragmentUrl,ROOM_LINK_BASE} from '../src/room-short-link.js';

test('link curto fixo inclui o código apenas para o endereço público exato',()=>{
 const base='https://jonataslferreira-hash.github.io/senaidendezas/';
 assert.equal(isPublicRoomLink(base+'?s=123456'),true);
 assert.equal(shortRoomLink(base+'?s=123456'),ROOM_LINK_BASE+'#s=123456');
 for(const bad of [base+'?s=123456&invite=secret',base+'?s=123456&s=654321',base+'?s=123456#secret',base+'?s=12',base+'?localSignal=&s=123456','http://localhost:5173/?s=123456','https://jonataslferreira-hash.github.io.evil.com/senaidendezas/?s=123456','https://user:pass@jonataslferreira-hash.github.io/senaidendezas/?s=123456']){
  assert.equal(isPublicRoomLink(bad),false,bad);assert.equal(shortRoomLink(bad),null,bad);
 }
});
test('fragmento válido vira parâmetro de sala sem sobrescrever outras rotas',()=>{
 const base='https://jonataslferreira-hash.github.io/senaidendezas/';
 assert.equal(roomFragmentUrl(base+'#s=123456'),base+'?s=123456');
 assert.equal(roomFragmentUrl('http://localhost:5173/?localSignal#s=123456'),'http://localhost:5173/?localSignal=&s=123456');
 for(const bad of [base+'#s=12345',base+'#s=123456&deck=secret',base+'#deck=123456',base+'?s=654321#s=123456',base+'?invite=secret#s=123456',base+'?page=editor#s=123456','not a url'])assert.equal(roomFragmentUrl(bad),null,bad);
});
