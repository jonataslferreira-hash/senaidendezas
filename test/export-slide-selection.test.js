import test from 'node:test';
import assert from 'node:assert/strict';
import {exportableSlides} from '../src/export-slide-selection.js';
test('exporta slides na sequência das etapas sem excluir capa com jogo legado',()=>{
 const slides=[{id:'a',game:{type:'flashcards'},kind:'canvas'}, {id:'b',kind:'canvas'},{id:'c',game:{type:'flashcards'}}];
 const lesson={slides,activityBlocks:[{id:'s1',type:'slides',items:['b','a']},{id:'g',type:'flashcards',items:['c']}]};
 assert.deepEqual(exportableSlides(lesson).map(s=>s.id),['a','b']); // a ordem do editor vem do array de slides, não de block.items
 assert.deepEqual(exportableSlides({slides}).map(s=>s.id),['b']);
 assert.deepEqual(exportableSlides({...lesson,activityBlocks:[{id:'g',type:'flashcards',items:['c']}]}),[]);
});

test('exporta etapas na ordem do roteiro e slides na ordem exibida em cada etapa',()=>{
 const lesson={slides:[{id:'a'},{id:'b'},{id:'c'},{id:'d'}],activityBlocks:[{id:'second',type:'slides',items:['d','b']},{id:'first',type:'slides',items:['c','a']}]};
 assert.deepEqual(exportableSlides(lesson).map(s=>s.id),['b','d','a','c']);
});
