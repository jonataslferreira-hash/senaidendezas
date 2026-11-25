import test from 'node:test';
import assert from 'node:assert/strict';
import {applyEditorPlayback} from '../src/editor-audio.js';
test('música do editor usa saída direta sem prender faixas externas em Web Audio',()=>{
 const old=globalThis.AudioContext;let made=0;globalThis.AudioContext=class{constructor(){made++;}};
 try {const audio={};applyEditorPlayback(audio,{volume:1,rate:.85});assert.equal(made,0);assert.equal(audio.volume,1);assert.equal(audio.playbackRate,.85);assert.equal(audio.preservesPitch,false);applyEditorPlayback(audio,{volume:.25,rate:1});assert.equal(audio.volume,.25);assert.equal(audio.preservesPitch,true);assert.equal(made,0);}finally{if(old)globalThis.AudioContext=old;else delete globalThis.AudioContext;}
});
