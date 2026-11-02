import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../src/room.js';
import {avatarContent} from '../src/player-avatar.js';
test('foto opcional do participante aparece no ranking, com tamanho e tipos limitados',()=>{
 const photo='data:image/webp;base64,UklGRg==',room=new Room('123456');const {id}=room.join({name:'Meu apelido',avatar:photo});assert.equal(room.snapshot(id).ranking[0].avatar,photo);assert.match(avatarContent(photo),/^<img/);
 const bad=room.join({name:'Outro',avatar:'data:image/svg+xml;base64,PHN2Zz4='});assert.notEqual(room.snapshot(bad.id).ranking.find(p=>p.id===bad.id).avatar,'data:image/svg+xml;base64,PHN2Zz4=');assert.doesNotMatch(avatarContent('<img onerror=x>'),/^<img/);
});
