import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomQrCache} from '../src/room-qr.js';

test('QR só carrega sob demanda e compartilha geração simultânea',async()=>{
 let loads=0,draws=0;
 const qr=createRoomQrCache(async()=>{loads++;return {default:{toDataURL:async(url,opts)=>{draws++;assert.equal(opts.width,460);return 'qr:'+url;}}};});
 assert.equal(loads,0);
 const a=qr('https://example.com/?s=123456'),b=qr('https://example.com/?s=123456');
 assert.equal(a,b);assert.equal(await a,'qr:https://example.com/?s=123456');
 assert.equal(await qr('https://example.com/?s=123456'),'qr:https://example.com/?s=123456');
 assert.equal(loads,1);assert.equal(draws,1);
});
test('falha de QR pode ser tentada novamente e cache é limitado',async()=>{
 let calls=0;const qr=createRoomQrCache(async()=>{calls++;if(calls===1)throw Error('rede');return {default:{toDataURL:async url=>url}};},2);
 await assert.rejects(qr('a'));assert.equal(await qr('a'),'a');await qr('b');await qr('c');await qr('a');assert.equal(calls,5);
});
