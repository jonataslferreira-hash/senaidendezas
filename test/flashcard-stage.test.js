import test from 'node:test';
import assert from 'node:assert/strict';
import {newLesson,newSlide,validateLesson} from '../src/lessons.js';
import {Room} from '../src/room.js';
import {defaultGame,publicGame,validateGame} from '../src/stage-games.js';
import {canvasFromSlide} from '../src/canvas-data.js';

function lessonWithCards(){
 const lesson=newLesson(), stage=newSlide(),end=newSlide();
 stage.game={type:'flashcards',text:'Memória',cards:[{front:'Qual é a função da RAM?',back:'Armazenar dados temporários.'},{front:'O que é SSD?',back:'Armazenamento em memória flash.'}]};stage.title='Memória';
 lesson.slides.push(stage,end);lesson.questions=[];
 lesson.activityBlocks=[{id:'slides',type:'slides',items:[lesson.slides[0].id]},{id:'cards',type:'flashcards',items:[stage.id]},{id:'end',type:'slides',items:[end.id]}];
 return lesson;
}
test('etapa aceita cartões, valida rascunho e mantém dados na aula e compartilhamento',()=>{
 const empty=defaultGame('flashcards');assert.equal(validateGame(empty,true).cards.length,1);assert.throws(()=>validateGame(empty),/preencha a frente e o verso/i);
 const lesson=validateLesson(lessonWithCards());assert.deepEqual(lesson.activityBlocks.map(b=>b.type),['slides','flashcards','slides']);assert.equal(lesson.slides[1].game.cards[0].back,'Armazenar dados temporários.');
 const publicDeck={...lesson,slides:lesson.slides.map(s=>({...canvasFromSlide(s),note:''}))};assert.equal(validateLesson(publicDeck).slides[1].game.cards[1].front,'O que é SSD?');
 assert.deepEqual(publicGame(lesson.slides[1].game),{type:'flashcards',text:'Memória',cardCount:2});
});
test('professor controla os cartões, participantes veem só o atual e sem pontuar',()=>{
 const room=new Room('123456',undefined,()=>1000,lessonWithCards()),player=room.join({name:'Ana'});
 assert.equal(room.data.phase,'lesson');room.control('next-stage');
 assert.equal(room.data.phase,'game');assert.equal(room.data.game.type,'flashcards');
 let snap=room.snapshot(player.id);assert.equal(snap.game.front,'Qual é a função da RAM?');assert.equal(snap.game.flipped,false);assert.ok(!('back' in snap.game));
 const publicText=JSON.stringify(snap.lesson);assert.ok(!publicText.includes('Armazenar dados temporários.'));assert.ok(!publicText.includes('O que é SSD?'));
 room.control('game',{do:'card-flip'});snap=room.snapshot(player.id);assert.equal(snap.game.back,'Armazenar dados temporários.');assert.equal(snap.game.flipped,true);
 room.control('game',{do:'card-next'});snap=room.snapshot(player.id);assert.equal(snap.game.front,'O que é SSD?');assert.equal(snap.game.flipped,false);assert.ok(!('back' in snap.game));
 const late=room.join({name:'João'});assert.equal(room.snapshot(late.id).game.front,'O que é SSD?');
 assert.throws(()=>room.control('game',{do:'card-next'}),/Não há outro cartão/);
 room.control('game',{do:'card-prev'});assert.equal(room.snapshot(player.id).game.front,'Qual é a função da RAM?');
 assert.equal(room.snapshot().hasScoredStages,false);assert.deepEqual(room.data.players.map(p=>p.score+(p.bonus||0)),[0,0]);
 room.control('next-stage');assert.equal(room.data.phase,'lesson');assert.equal(room.data.slide,2);
});
test('é possível iniciar diretamente em etapa de flashcards e restaurar o cartão atual',()=>{
 const lesson=lessonWithCards(),room=new Room('123456',undefined,()=>1000,lesson,1);assert.equal(room.data.phase,'game');
 room.control('game',{do:'card-next'});room.control('game',{do:'card-flip'});
 const restored=new Room('123456',structuredClone(room.data),()=>1000,lesson);assert.equal(restored.snapshot().game.index,1);assert.equal(restored.snapshot().game.back,'Armazenamento em memória flash.');
});
