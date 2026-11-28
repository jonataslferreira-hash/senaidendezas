import test from 'node:test';
import assert from 'node:assert/strict';
import {newLesson,validateLesson} from '../src/lessons.js';
import {defaultGame} from '../src/stage-games.js';

test('atividade guardada não impede publicação e sobrevive à validação',()=>{
 const lesson=newLesson(),slide=lesson.slides[0];slide.title='Meu slide';slide.intro='Conteúdo preservado';slide.recoveredGame=defaultGame('flashcards');
 const draft=validateLesson(lesson,{draft:true});const published=validateLesson(draft);
 assert.equal(published.slides[0].intro,'Conteúdo preservado');assert.equal(published.slides[0].game,undefined);
 assert.deepEqual(published.slides[0].recoveredGame,defaultGame('flashcards'));
});
