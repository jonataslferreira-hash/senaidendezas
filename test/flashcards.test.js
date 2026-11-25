import test from 'node:test';
import assert from 'node:assert/strict';
import {cardsFromQuestions,flashcardRequest,lessonStudyText,Flashcards} from '../src/flashcards.js';

const lesson={title:'Redes',slides:[{title:'Endereços',intro:'Identificam dispositivos',note:'SEGREDO PRIVADO',elements:[{type:'text',text:'IPv4'},{type:'image',image:'data:secret'}]},{title:'Enquete',poll:{text:'Escolha'}}]};
test('pedido ao Storage AI limita quantidade, inclui texto visível e exclui notas e mídias',()=>{
 const text=lessonStudyText(lesson);assert.match(text,/IPv4/);assert.match(text,/Identificam/);assert.doesNotMatch(text,/SEGREDO|data:secret|Enquete/);
 const input=flashcardRequest('Redes IP',lesson,99);assert.equal(input.mode,'create');assert.equal(input.count,1);assert.equal(input.activities.questions,10);assert.ok(input.prompt.startsWith('Crie apenas atividades para esta aula;'));assert.ok(input.prompt.length<=2400);assert.doesNotMatch(input.prompt,/SEGREDO|data:secret/);
 assert.throws(()=>flashcardRequest('',null),/tema/);
});
test('cartões mostram apenas resposta correta válida e explicação',()=>{
 const cards=cardsFromQuestions([{text:'Qual?',options:['errada','certa'],correct:1,explanation:'Motivo.'},{text:'Inválida',options:['a'],correct:2},{text:'Sem resposta',options:[''],correct:0}]);
 assert.equal(cards.length,1);assert.equal(cards[0].front,'Qual?');assert.equal(cards[0].back,'certa\n\nMotivo.');assert.ok(!cards[0].back.includes('errada'));
});
test('cartões são isolados por conta e falha de armazenamento não apaga os dados',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},listeners={};
 const studio={root:{addEventListener:(name,fn)=>{listeners[name]=fn;}},account:{user:null},view:'flashcards',callbacks:{render(){}},library:{lessons:[]}};
 const fc=new Flashcards(studio,storage),deck={id:'one',title:'Exemplo',cards:[{id:'a',front:'F',back:'V'}]};
 fc.save([deck]);studio.account.user={id:'conta-1'};fc.accountChanged();assert.deepEqual(fc.decks,[]);fc.save([{...deck,id:'conta'}]);studio.account.user=null;fc.accountChanged();assert.equal(fc.decks[0].id,'one');
 storage.setItem('sl-flashcards-v1:ruim','{"invalido":true}');studio.account.user={id:'ruim'};fc.accountChanged();assert.match(fc.storageError,/preservados/);assert.throws(()=>fc.save([]),/preservados/);assert.equal(storage.getItem('sl-flashcards-v1:ruim'),'{"invalido":true}');
});

test('pedido de flashcards funciona com o contrato existente do Worker sem exigir um novo modo',async()=>{
 const {createR2Handler}=await import('../cloudflare/r2-worker.js');
 const handle=createR2Handler(async()=>({id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-11-01'}));
 const env={STORAGE_AI_FREE_CONFIRMED:'true',AI_LIMIT:{limit:async()=>({success:true})},AI:{run:async()=>({response:{questions:[{text:'O que é IP?',options:['Endereço','Monitor'],correct:0,explanation:'Identifica um dispositivo.'}]}})}};
 const request=new Request('https://files.example/storage-ai',{method:'POST',headers:{Authorization:'Bearer test-token-1234567890'},body:JSON.stringify(flashcardRequest('Redes',lesson,3))});
 const response=await handle(request,env);assert.equal(response.status,200);const data=await response.json();assert.equal(cardsFromQuestions(data.questions)[0].back,'Endereço\n\nIdentifica um dispositivo.');
});
