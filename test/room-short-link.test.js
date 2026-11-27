import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublicRoomLink,validShortRoomLink} from '../src/room-short-link.js';

test('só compartilha endereço público da sala e nenhum convite privado',()=>{
 const base='https://jonataslferreira-hash.github.io/senaidendezas/';
 assert.equal(isPublicRoomLink(base+'?s=123456'),true);
 for(const bad of [base+'?s=123456&invite=secret',base+'?s=123456&s=654321',base+'?s=123456#secret',base+'?s=12',base+'?localSignal=&s=123456','http://localhost:5173/?s=123456','https://jonataslferreira-hash.github.io.evil.com/senaidendezas/?s=123456','https://user:pass@jonataslferreira-hash.github.io/senaidendezas/?s=123456'])assert.equal(isPublicRoomLink(bad),false,bad);
});
test('aceita apenas retorno HTTPS do is.gd com caminho simples',()=>{
 assert.equal(validShortRoomLink('https://is.gd/Fe2ZN3'),'https://is.gd/Fe2ZN3');
 for(const bad of ['https://is.gd.evil.com/abcde','http://is.gd/abcde','https://evil.com/abcde','https://is.gd/abcde?x=y','https://is.gd/abcde#frag','https://u:p@is.gd/abcde','not a url'])assert.equal(validShortRoomLink(bad),null,bad);
});
