import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../src/room.js';
import {newLesson, newSlide} from '../src/lessons.js';
import {defaultGame,gameControl} from '../src/stage-games.js';
import {gameMarkup} from '../src/stage-games-view.js';
import {leaderboardMarkup} from '../src/game-ui.js';

function setup(type, config = {}) {
  let time = 20000;
  const lesson = newLesson(), cover = newSlide(), slide = newSlide();
  slide.game = {...defaultGame(type), ...config};
  lesson.slides = [cover, slide]; lesson.questions = [];
  lesson.activityBlocks = [{id:'cover',type:'slides',items:[cover.id]}, {id:'game',type,items:[slide.id]}];
  const room = new Room('111222', null, () => time, lesson);
  const a = room.join({name:'Ana'}), b = room.join({name:'Bia'});
  room.control('next-stage');
  return {room,a,b,advance:ms=>{time+=ms;room.tick();}};
}
const question = n => ({text:`Variante ${n}`, options:['Certo','Errado'], correct:0});

test('cabo sorteia uma variante compartilhada, valida respostas e aguarda todos em cada rodada', () => {
  const {room,a,b} = setup('tug', {seconds:15, rounds:[[question(1),question(2),question(3)],[question(4),question(5)]]});
  gameControl(room,{do:'next'},()=>0.8);
  let qa=room.snapshot(a.id).game.question, qb=room.snapshot(b.id).game.question;
  assert.equal(qa.index,2); assert.deepEqual(qa,qb);
  assert.equal(room.snapshot(a.id).game.questions.length,1);
  assert.throws(()=>room.answer(a.id,{choice:{round:0,v:0,choice:0}}),/mudou/);
  room.answer(a.id,{choice:{round:0,v:2,choice:0}});
  assert.equal(room.snapshot().game.state,'open');
  assert.throws(()=>room.answer(a.id,{choice:{round:0,v:2,choice:0}}),/já respondeu/);
  room.answer(b.id,{choice:{round:0,v:2,choice:1}});
  assert.equal(room.snapshot().game.state,'between');
  gameControl(room,{do:'next'},()=>0);
  qa=room.snapshot(a.id).game.question; qb=room.snapshot(b.id).game.question;
  assert.equal(qa.index,0); assert.deepEqual(qa,qb); assert.equal(qa.text,'Variante 4');
  assert.throws(()=>room.answer(a.id,{choice:{round:0,v:2,choice:0}}),/avançou/);
  room.answer(a.id,{choice:{round:1,v:0,choice:0}});
  assert.equal(room.snapshot().game.state,'open');
  room.answer(b.id,{choice:{round:1,v:0,choice:1}});
  assert.equal(room.snapshot().game.state,'pull');
});

test('cabo mantém encerramento pelo tempo e comando manual', () => {
  const {room,a,advance} = setup('tug', {seconds:10, rounds:[[question(1),question(2)],[question(3)]]});
  gameControl(room,{do:'next'},()=>0.5);
  room.answer(a.id,{choice:{round:0,v:1,choice:0}});
  advance(10000); assert.equal(room.snapshot().game.state,'between');
  gameControl(room,{do:'next'},()=>0);
  gameControl(room,{do:'next'});
  assert.equal(room.snapshot().game.state,'pull');
  assert.deepEqual(room.data.game.tries,[2,2]);
});

test('dicas do experimento indicam direção correta e resultado aparece depois de encerrar', () => {
  const {room,a,advance} = setup('challenge', {simulation:'projectile', answer:[{k:'range',label:'Ângulo',v:'45',min:0,max:90}], tolerance:5});
  room.answer(a.id,{choice:{values:['70']}});
  assert.match(room.snapshot(a.id).game.me.guidance[0],/longe/);
  advance(2000); room.answer(a.id,{choice:{values:['65']}});
  assert.match(room.snapshot(a.id).game.me.guidance[0],/diminuir/);
  advance(2000); room.answer(a.id,{choice:{values:['45']}});
  assert.equal(room.snapshot(a.id).game.me.ok,true);
  room.control('game',{do:'end'});
  const html=gameMarkup(room.snapshot(),{host:true,header:()=>''});
  assert.match(html,/Resultados do experimento/); assert.match(html,/Ângulo = 45/); assert.match(html,/Ana/);
  assert.match(html,/game-live game-challenge-result-live/);
});

test('personagem usa foto do time e classificação completa usa foto pessoal', () => {
  const personal='data:image/png;base64,BBBB', team='data:image/png;base64,'+'A'.repeat(25000);
  const p={id:'a',name:'Ana',score:100,avatar:personal}, state={ranking:[p],teams:[{name:'Equipe',photo:team,members:[p]}],me:{id:'a'}};
  const html=leaderboardMarkup(state,{header:()=>'',host:false});
  assert.ok(html.includes(team));
  const list=html.split('class="standings-list"')[1];
  assert.ok(list.includes(personal)); assert.ok(!list.includes(team));
  const noTeam=leaderboardMarkup({...state,teams:[]},{header:()=>'',host:false});
  assert.ok(noTeam.includes(personal));
});

test('dicas genéricas antigas são atualizadas sem substituir dicas escritas pelo professor', async () => {
  const {validateGame}=await import('../src/stage-games.js');
  const old=['O valor certo está mais alto do que está agora.', 'Está quase: ajuste fino, pouca coisa acima.', 'O último passo é pequeno — confie no palpite do time.'];
  const base={...defaultGame('challenge'),answer:[{k:'range',label:'A',v:'30',min:0,max:100}]};
  assert.notDeepEqual(validateGame({...base,hints:old}).hints,old);
  assert.deepEqual(validateGame({...base,hints:['Dica própria']}).hints,['Dica própria']);
});

test('experimento espera todos os líderes terminarem, inclusive quem esgotou as tentativas', () => {
  const {room,a,b,advance} = setup('challenge', {answer:[{k:'range',label:'Dia',v:'14',min:0,max:29}]});
  room.data.teams=[{name:'Sol',color:'#facc15',leader:a.id},{name:'Lua',color:'#60a5fa',leader:b.id}];
  room.data.players.find(p=>p.id===a.id).team=0;
  room.data.players.find(p=>p.id===b.id).team=1;
  room.answer(a.id,{choice:{values:['14']}});
  assert.equal(room.snapshot().game.state,'open');
  for(let i=0;i<3;i++){advance(2000);room.answer(b.id,{choice:{values:['0']}});}
  assert.equal(room.snapshot().game.state,'done');
  const html=gameMarkup(room.snapshot(),{host:true,header:()=>''});
  assert.match(html,/challenge-result-card is-winner/); assert.match(html,/Time Sol/);
  assert.match(html,/challenge-result-card is-other/); assert.match(html,/data-mood="lose"/);
  assert.doesNotMatch(html,/challenge-mode-state|Só o líder mexe/);
});

test('experimento com todos liberados espera todos e só termina quando concluírem', () => {
  const {room,a,b,advance} = setup('challenge', {leaderMode:false,answer:[{k:'range',label:'Dia',v:'14',min:0,max:29}]});
  room.answer(a.id,{choice:{values:['14']}});
  assert.equal(room.snapshot().game.state,'open');
  advance(2000); room.answer(b.id,{choice:{values:['14']}});
  assert.equal(room.snapshot().game.state,'done');
});

test('foto da conta permanece no placar completo mesmo ao trocar o avatar da sala', () => {
  const lesson=newLesson();
  const room=new Room('111222',null,()=>20000,lesson);
  const photo='data:image/png;base64,AAAA', joined=room.join({name:'Ana',avatar:'🚀',accountPhoto:photo});
  room.updateProfile(joined.id,{name:'Ana',avatar:'🐱'});
  const state=room.snapshot(joined.id);
  assert.equal(state.ranking[0].avatar,'🐱');
  assert.equal(state.ranking[0].accountPhoto,photo);
  assert.equal(state.quizRanking[0].accountPhoto,photo);
  const html=leaderboardMarkup(state,{header:()=>'',host:false});
  assert.ok(html.split('class="standings-list"')[1].includes(photo));
  room.disconnect(joined.id); room.join({name:'Ana',avatar:'🐱',token:joined.token});
  assert.equal(room.snapshot().ranking[0].accountPhoto,photo);
  const invalid=room.join({name:'Bia',avatar:'🚀',accountPhoto:'https://example.test/imagem'});
  assert.equal(room.snapshot(invalid.id).ranking.find(p=>p.id===invalid.id).accountPhoto,undefined);
});
