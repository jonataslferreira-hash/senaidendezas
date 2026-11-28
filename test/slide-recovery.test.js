import test from 'node:test';
import assert from 'node:assert/strict';
import {newLesson,validateLesson,hasStrayEmptyFlashcard} from '../src/lessons.js';
import {createSlideFromTemplate} from '../src/slide-templates.js';
import {defaultGame} from '../src/stage-games.js';

function mixed(){const lesson=newLesson(),slide=createSlideFromTemplate('cover');slide.title='A franquia';slide.game=defaultGame('flashcards');lesson.slides=[slide];lesson.activityBlocks=[{id:'slides',type:'slides',items:[slide.id]}];return lesson;}
test('flashcard vazio indevido em slide visual fica guardado sem ocultar o slide ou impedir a apresentação',()=>{
 const lesson=mixed(),original=JSON.stringify(lesson);assert.equal(hasStrayEmptyFlashcard(lesson.slides[0],lesson.activityBlocks),true);const validated=validateLesson(lesson,{draft:true});assert.equal(JSON.stringify(lesson),original,'não altera dados de entrada');assert.equal(validated.slides[0].game,undefined);assert.deepEqual(validated.slides[0].recoveredGame,defaultGame('flashcards'));assert.equal(validated.slides[0].elements.length,lesson.slides[0].elements.length);assert.equal(validated.activityBlocks[0].items[0],validated.slides[0].id);
});
test('nunca remove cartões preenchidos, etapas reais, nem itens ambíguos',()=>{
 const lesson=mixed();lesson.slides[0].game.cards[0].front='Pergunta';assert.ok(validateLesson(lesson,{draft:true}).slides[0].game);lesson.slides[0].game=defaultGame('flashcards');lesson.activityBlocks[0].type='flashcards';assert.ok(validateLesson(lesson,{draft:true}).slides[0].game);
 lesson.activityBlocks[0].type='slides';lesson.slides[0].keepMixedGame=true;assert.equal(validateLesson(lesson,{draft:true}).slides[0].keepMixedGame,true);assert.ok(validateLesson(lesson,{draft:true}).slides[0].game);
 delete lesson.slides[0].keepMixedGame;lesson.slides[0].title='Flashcards';assert.ok(validateLesson(lesson,{draft:true}).slides[0].game);
});
test('atividade guardada não impede publicação e sobrevive à validação',()=>{
 const lesson=newLesson(),slide=lesson.slides[0];slide.title='Meu slide';slide.intro='Conteúdo preservado';slide.recoveredGame=defaultGame('flashcards');
 const draft=validateLesson(lesson,{draft:true});const published=validateLesson(draft);
 assert.equal(published.slides[0].intro,'Conteúdo preservado');assert.equal(published.slides[0].game,undefined);
 assert.deepEqual(draft.slides[0].recoveredGame,defaultGame('flashcards'));assert.equal(published.slides[0].recoveredGame,undefined);
});
