import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {demoLesson} from '../src/lessons.js';
import {Room} from '../src/room.js';
import {reviewQuestions,reviewMarkup} from '../src/review.js';
import {buildResultsPdf,resultsFilename} from '../src/results-pdf.js';
import {packLesson} from '../src/file-codec.js';
import {loadPublicPresentationInfo,portablePresentation} from '../src/public-presentations.js';

test('revisão reúne quiz e questões das dinâmicas, sem modificar a aula',()=>{
 const lesson=demoLesson();lesson.slides[0].game={type:'tug',rounds:[[{text:'Questão do cabo',options:['Sim','Não'],correct:0}]]};
 const original=JSON.stringify(lesson),questions=reviewQuestions(lesson);
 assert.equal(questions.length,lesson.questions.length+1);assert.equal(questions.at(-1).source,'Cabo de guerra');
 const studio={library:{lessons:[lesson]},reviewId:lesson.id,reviewChoice:1,reviewIndex:0};
 assert.match(reviewMarkup(studio),/Sem alterar placar/);assert.match(reviewMarkup(studio),/role="status"/);assert.equal(JSON.stringify(lesson),original);
});

test('histórico de quiz sobrevive à limpeza de respostas, não é enviado aos participantes e PDF é paginado',async()=>{
 const lesson=demoLesson(),room=new Room('123456',undefined,()=>1000,lesson);
 const a=room.join({name:'Ana'}),b=room.join({name:'João'});
 room.startQuestion(0);room.answer(a.id,{choice:lesson.questions[0].correct,questionIndex:0});
 room.answer(b.id,{choice:(lesson.questions[0].correct+1)%lesson.questions[0].options.length,questionIndex:0});room.reveal();
 assert.equal(room.data.quizReport.length,1);assert.equal(room.data.quizReport[0].correctCount,1);assert.equal(room.data.quizReport[0].answered,2);
 room.data.players.forEach(p=>p.answers={});room.data.phase='finished';
 assert.equal(room.snapshot().quizReport[0].answered,2);assert.equal(room.snapshot(a.id).quizReport,undefined);
 const many=Array.from({length:200},(_,i)=>({name:`Aluno ${i+1}`,score:i,correct:2}));
 const bytes=await buildResultsPdf({...room.snapshot(),ranking:many},'Aula de informática',new Date('2026-01-01'));
 const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>1);assert.equal(resultsFilename('Informática: redes'),'Informática redes resultados.pdf');
});

test('links portáteis preservam escolha do dono e links antigos não liberam cópia',async()=>{
 const lesson=demoLesson();
 const check=async input=>{const packed=await packLesson(input);globalThis.location={hash:'#deck='+portablePresentation(packed.buffer)};return loadPublicPresentationInfo('portable');};
 try {const allowed=await check({publicPresentation:1,lesson,allowCopy:true});assert.equal(allowed.allowCopy,true);assert.deepEqual(allowed.lesson.questions,lesson.questions);
 assert.equal((await check({publicPresentation:1,lesson,allowCopy:false})).allowCopy,false);assert.equal((await check(lesson)).allowCopy,false);}
 finally{delete globalThis.location;}
});
