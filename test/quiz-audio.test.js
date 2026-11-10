import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../src/game-audio.js';
import {lobbyTracks,questionTracks,countdownTracks,resultTrack,podiumTrack,timedTracks,chooseTrack} from '../src/quiz-tracks.js';
import {validateGameSettings} from '../src/game-settings.js';
class FakeAudio extends EventTarget{
 constructor(){super();this.paused=true;this.plays=0;this.currentTime=0;}
 play(){this.paused=false;this.plays++;return Promise.resolve();}
 pause(){this.paused=true;}
 load(){}
}
const lesson={gameSettings:{lobby:'random',questions:'random',volume:.1,effects:true}};
const question=(now,seconds=20)=>({code:'123456',phase:'question',questionIndex:0,serverTime:now,question:{startedAt:now,deadline:now+seconds*1000}});
const engine=(random=()=>.9)=>new GameAudio({audioFactory:()=>new FakeAudio(),random});

test('catálogo separa as 9 faixas de lobby, 20 de pergunta e 3 contagens finais; sorteio respeita o tempo',()=>{
 assert.equal(lobbyTracks.length,9);assert.equal(questionTracks.length,20);assert.equal(countdownTracks.length,3);
 for(const seconds of [10,20,30,60,90,120])assert.ok(timedTracks(seconds).every(t=>t.seconds===seconds));
 assert.ok(timedTracks(45).every(t=>t.seconds===60));assert.ok(timedTracks(180).every(t=>t.seconds===120));
 assert.notEqual(chooseTrack(lobbyTracks,lobbyTracks[0].id,()=>0).id,lobbyTracks[0].id);
 for(const t of [...lobbyTracks,...questionTracks,...countdownTracks,resultTrack,podiumTrack])assert.equal(new URL(t.url).protocol,'https:');
 assert.equal(validateGameSettings({lobby:lobbyTracks[0].id,questions:questionTracks[0].id}).questions,questionTracks[0].id);
});
test('música de pergunta usa a duração correta, repete e o resultado toca uma vez com volume moderado',async()=>{
 const game=engine(),state=question(Date.now(),30);game.sync(state,lesson,true,true);assert.ok(timedTracks(30).some(t=>t.url===game.audio.src));assert.equal(game.audio.loop,true);assert.equal(game.audio.volume,.1);
 const reveal={...state,phase:'reveal',serverTime:Date.now()};game.sync(reveal,lesson,true,true);assert.equal(game.audio.paused,true);assert.equal(game.result.src,resultTrack.url);assert.equal(game.result.plays,1);assert.equal(game.result.volume,.2);game.sync(reveal,lesson,true,true);assert.equal(game.result.plays,1);game.stop();
});
test('contagem de 5 segundos conserva seu próprio resultado e não duplica o efeito ao acabar o tempo',async t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});const game=engine(()=>0),state=question(Date.now());game.sync(state,lesson,true,true);t.mock.timers.tick(15000);game.tick();await Promise.resolve();await Promise.resolve();assert.equal(game.five.paused,false);assert.equal(game.audio.paused,true);assert.equal(game.five.loop,false);
 t.mock.timers.tick(5000);game.sync({...state,phase:'reveal',serverTime:Date.now()},lesson,true,true);assert.equal(game.result.plays,0);assert.equal(game.five.paused,false);game.sync({...state,phase:'leaderboard',serverTime:Date.now()},lesson,true,true);assert.equal(game.five.paused,false);game.stop();assert.equal(game.five.paused,true);
});
test('revelação antecipada interrompe a contagem e toca o resultado normal',async t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});const game=engine(()=>0),state=question(Date.now());game.sync(state,lesson,true,true);t.mock.timers.tick(15500);game.tick();await Promise.resolve();await Promise.resolve();game.sync({...state,phase:'reveal',serverTime:Date.now()},lesson,true,true);assert.equal(game.five.paused,true);assert.equal(game.result.plays,1);game.stop();
});
test('pódio só inicia a trilha após as revelações, com fade, slowed e loop; sair cancela tudo',t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});const game=engine(),state={code:'123456',phase:'finished',questionIndex:2,serverTime:Date.now(),resultStartedAt:Date.now()};game.sync(state,lesson,true,true);assert.equal(game.audio.plays,0);t.mock.timers.tick(9000);assert.equal(game.audio.src,podiumTrack.url);assert.equal(game.audio.volume,0);assert.equal(game.audio.playbackRate,.85);assert.equal(game.audio.preservesPitch,false);assert.equal(game.audio.loop,true);t.mock.timers.tick(900);assert.ok(game.audio.volume>0&&game.audio.volume<.07);game.sync(state,lesson,true,true);t.mock.timers.tick(1000);assert.ok(Math.abs(game.audio.volume-.07)<1e-9);game.stop();assert.equal(game.audio.paused,true);const count=game.audio.plays;t.mock.timers.tick(20000);assert.equal(game.audio.plays,count);
});
test('revelar todos pula a espera uma vez sem cancelar o fade nas atualizações seguintes',t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});const game=engine(),state={code:'123456',phase:'finished',questionIndex:2,serverTime:Date.now(),resultStartedAt:Date.now()};game.sync(state,lesson,true,true);const all={...state,podiumRevealed:true};game.sync(all,lesson,true,true);assert.equal(game.audio.src,podiumTrack.url);assert.equal(game.audio.volume,0);t.mock.timers.tick(500);game.sync(all,lesson,true,true);t.mock.timers.tick(1500);assert.ok(Math.abs(game.audio.volume-.07)<1e-9);assert.equal(game.audio.plays,1);assert.equal(game.result.plays,1);game.stop();
});
test('uma reprodução atrasada não reinicia depois de sair nem pausa a faixa nova',async()=>{
 const game=engine(),player=game.audio;let release;player.play=()=>new Promise(resolve=>release=()=>{player.paused=false;resolve();});const old=game.play(player);game.stop();release();await old;assert.equal(player.paused,true);
 const delayed=game.play(player),releaseOld=release;player.play=()=>{player.paused=false;return Promise.resolve();};await game.play(player);releaseOld();await delayed;assert.equal(player.paused,false);game.stop();
});
test('abrir classificação e pódio não interrompe nem reinicia o efeito que já está tocando',t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});const game=engine(),state=question(Date.now());game.sync(state,lesson,true,true);game.sync({...state,phase:'reveal',serverTime:Date.now()},lesson,true,true);assert.equal(game.result.plays,1);game.sync({...state,phase:'leaderboard',serverTime:Date.now()},lesson,true,true);assert.equal(game.result.paused,false);game.sync({...state,phase:'finished',resultStartedAt:Date.now(),serverTime:Date.now()},lesson,true,true);t.mock.timers.tick(7000);assert.equal(game.result.paused,false);assert.equal(game.result.plays,1);game.stop();assert.equal(game.result.paused,true);
});
