import test from 'node:test';
import assert from 'node:assert/strict';
import {ClassroomApi,classroomShareUrl,quizGrade} from '../src/google-classroom.js';

test('compartilhamento preserva fragmento e parâmetros no destino oficial',()=>{
 const original='https://example.org/?presentation=portable#deck=a-b_c';
 const u=new URL(classroomShareUrl(original));assert.equal(u.origin,'https://classroom.google.com');assert.equal(u.pathname,'/share');assert.equal(u.searchParams.get('url'),original);
 assert.throws(()=>classroomShareUrl('javascript:alert(1)'));
});
test('notas usam acertos e rejeitam valores impossíveis',()=>{
 assert.equal(quizGrade(2,3,100),66.67);assert.equal(quizGrade(0,3,10),0);assert.equal(quizGrade(3,3,10),10);
 for(const args of [[1,0,100],[-1,3,100],[4,3,100],[1.5,3,100],[1,3,0]])assert.throws(()=>quizGrade(...args));
});
test('API pagina turmas e restringe atividades ao projeto autorizado',async()=>{
 const calls=[];const api=new ClassroomApi('token',async (url,opt)=>{calls.push([url,opt]);const u=new URL(url);return new Response(JSON.stringify(u.pathname.endsWith('courseWork')?{courseWork:[{id:'1',associatedWithDeveloper:true,workType:'ASSIGNMENT',maxPoints:100},{id:'2',associatedWithDeveloper:false,workType:'ASSIGNMENT',maxPoints:100}]}:u.searchParams.has('pageToken')?{courses:[{id:'b'}]}:{courses:[{id:'a'}],nextPageToken:'next'}),{status:200});});
 assert.deepEqual((await api.courses()).map(c=>c.id),['a','b']);assert.deepEqual((await api.activities('t/1')).map(c=>c.id),['1']);assert.equal(calls[0][1].headers.Authorization,'Bearer token');assert.match(calls[2][0],/t%2F1/);
});
test('criação publica link e envio altera apenas rascunho',async()=>{
 const calls=[];const api=new ClassroomApi('secret',async (url,opt)=>{calls.push([url,opt]);return new Response('{}',{status:200});});
 await api.create('course',{title:'Aula',description:'',link:'https://site/a'});await api.grade('course','work','submission',75);
 assert.deepEqual(JSON.parse(calls[0][1].body),{title:'Aula',description:'',materials:[{link:{url:'https://site/a'}}],workType:'ASSIGNMENT',state:'PUBLISHED',maxPoints:100});
 assert.match(calls[1][0],/updateMask=draftGrade$/);assert.deepEqual(JSON.parse(calls[1][1].body),{draftGrade:75});
});
test('erros de autorização são claros',async()=>{
 const api=new ClassroomApi('expired',async()=>new Response('{}',{status:401}));await assert.rejects(api.courses(),/expirou/);
});

test('ação de notas aparece só para professor em quiz concluído, nunca no modo demonstração',async()=>{
 const {leaderboardMarkup}=await import('../src/game-ui.js');
 const state={phase:'finished',resultScope:'quiz',totalQuestions:2,questionIndex:1,quizRanking:[{id:'p',name:'Aluno',score:1,correct:1}],ranking:[{id:'p',name:'Aluno',score:1,correct:1}],podiumStep:4,teams:[]};
 const render=(s,host=true,demo=false)=>leaderboardMarkup(s,{header:()=>'',host,demo,final:true});
 assert.match(render(state),/classroom-grades/);assert.doesNotMatch(render(state,false),/classroom-grades/);assert.doesNotMatch(render(state,true,true),/classroom-grades/);assert.doesNotMatch(render({...state,questionIndex:0}),/classroom-grades/);assert.doesNotMatch(render({...state,resultScope:'overall'}),/classroom-grades/);
});

test('sugere somente o aluno exato e não pré-seleciona quando duas pessoas usam o mesmo Google',async()=>{
 const {GoogleClassroomDialog}=await import('../src/google-classroom.js');const ui=new GoogleClassroomDialog();ui.activity='work';ui.activities=[{id:'work',maxPoints:100}];ui.students=[{userId:'12345',profile:{name:{fullName:'Ana'}}}];ui.submissions=[{id:'sub',userId:'12345'}];ui.context.quiz={total:2,players:[{name:'Jogador',correct:1,googleUserId:'12345'}]};
 assert.match(ui.mappingMarkup(),/value="sub" selected/);
 ui.context.quiz.players.push({name:'Outra pessoa',correct:1,googleUserId:'12345'});assert.doesNotMatch(ui.mappingMarkup(),/value="sub" selected/);
 ui.context.quiz.players=[{name:'Ana',correct:1}];assert.doesNotMatch(ui.mappingMarkup(),/value="sub" selected/);
});
test('upload envia bytes ao Drive e publica referência como material visualizável',async()=>{
 const calls=[];const api=new ClassroomApi('token',async (url,opt)=>{calls.push({url,opt});return Response.json(url.includes('upload/drive')?{id:'file-id'}:{id:'work-id'});});
 const file=await api.uploadFile({name:'Aula.pdf',blob:new Blob(['%PDF-dados'],{type:'application/pdf'})});await api.create('curso',{title:'Aula',description:'',fileId:file.id});
 assert.match(calls[0].url,/uploadType=multipart/);assert.match(calls[0].opt.headers['Content-Type'],/^multipart\/related; boundary=/);assert.equal(calls[0].opt.headers.Authorization,'Bearer token');assert.match(await calls[0].opt.body.text(),/%PDF-dados/);
 assert.deepEqual(JSON.parse(calls[1].opt.body).materials,[{driveFile:{driveFile:{id:'file-id'},shareMode:'VIEW'}}]);
 const blocked=new ClassroomApi('token',async()=>Response.json({error:{message:'Drive desativado'}},{status:403}));await assert.rejects(blocked.uploadFile({name:'x',blob:new Blob(['x'],{type:'application/pdf'})}),/Drive desativado/);
});
