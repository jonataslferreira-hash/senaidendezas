import test from 'node:test';
import assert from 'node:assert/strict';
import {nextEditorTrack} from '../src/editor-playback-order.js';
const tracks=[{id:'a'},{id:'spotify',kind:'spotify'},{id:'b'},{id:'c'}];
test('ordem sequencial, repetir faixa, repetir lista e parar ao final',()=>{
 assert.equal(nextEditorTrack(tracks,0,{shuffle:false,repeat:'off'}).index,2);
 assert.equal(nextEditorTrack(tracks,3,{shuffle:false,repeat:'off'}).index,null);
 assert.equal(nextEditorTrack(tracks,3,{shuffle:false,repeat:'all'}).index,0);
 assert.equal(nextEditorTrack(tracks,2,{shuffle:false,repeat:'one'}).index,2);
 assert.equal(nextEditorTrack(tracks,1,{repeat:'one'}).index,null);
});
test('aleatório não repete faixa antes do fim da lista e respeita modo desligado',()=>{
 let index=0,played=[],order=[index];for(let n=0;n<3;n++){const result=nextEditorTrack(tracks,index,{shuffle:true,repeat:'off',played,random:()=>0});index=result.index;played=result.played;order.push(index);if(index===null)break;}
 assert.deepEqual(order,[0,2,3,null]);
 const repeat=nextEditorTrack(tracks,3,{shuffle:true,repeat:'all',played:['a','b'],random:()=>0});assert.equal(repeat.index,0);
 assert.equal(nextEditorTrack([{id:'a'}],0,{shuffle:true,repeat:'all',random:()=>0}).index,0);
});
