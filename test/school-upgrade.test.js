import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../src/room.js';
import {newLesson,newQuestion,validateLesson} from '../src/lessons.js';
import {newElement,normalizeElements} from '../src/canvas-data.js';
import {
  projectile,mixturePH,waveProperties,matterState,osmosisState,logisticPopulation,
  quadraticMetrics,trigValues,seasonInfo,historicalEra,narrativeStage,colorMixInfo,evaluateGate,
  leverBalance,mendelCross,diceProbability,compoundInterest,greenhouseBalance,
  simulationIds,simulationGroups,simulationNames,simulationSubjects,simulationMarkup,simulationChallenges
} from '../src/simulations.js';
import {canvasMarkup} from '../src/canvas-view.js';
import {styles} from '../src/personalization.js';
import {handleChatAudio} from '../cloudflare/chat-audio-worker.js';

test('classificação é uma etapa depois da resposta e a última questão abre o grande resultado',()=>{
 let now=1000;const lesson=newLesson();lesson.questions=[newQuestion(),newQuestion()];const room=new Room('123456',null,()=>now,lesson),player=room.join({name:'Ana',avatar:'🤖'});room.control('quiz');room.control('start-quiz');now+=3001;room.tick();room.answer(player.id,{choice:0,questionIndex:0});room.control('reveal');assert.equal(room.snapshot().ranking[0].streak,1);room.control('ranking');assert.equal(room.data.phase,'leaderboard');assert.equal(room.snapshot(player.id).question.correct,0);room.control('next');room.answer(player.id,{choice:0,questionIndex:1});room.control('reveal');room.control('ranking');assert.equal(room.data.phase,'finished');assert.equal(room.snapshot().ranking[0].streak,2);assert.equal(room.snapshot().podiumRevealed,false);room.control('podium-all');assert.equal(room.snapshot().podiumRevealed,true);
});
test('editar participante mantém ID e pontos, remover invalida a credencial antiga',()=>{const room=new Room('123456'),player=room.join({name:'Ana',avatar:'🤖'});room.updateProfile(player.id,{name:'Ana editada',avatar:'🦊'});assert.equal(room.join({token:player.token}).id,player.id);assert.equal(room.snapshot().ranking.length,1);assert.equal(room.snapshot().ranking[0].name,'Ana editada');room.control('kick',player.id);assert.throws(()=>room.join({token:player.token}),/removido/);assert.equal(room.snapshot().ranking.length,0);});
test('experiências têm cálculos coerentes e sobrevivem à validação',()=>{assert.ok(Math.abs(projectile(10,45,10).range-10)<1e-10);assert.equal(mixturePH(50,50),7);assert.ok(mixturePH(50,0)<3);assert.ok(mixturePH(0,50)>11);const l=newLesson();l.slides[0].kind='canvas';l.slides[0].elements=[newElement('simulation',{simulation:'neutralization'})];l.activityOrder=['quiz','slides'];assert.equal(validateLesson(l).slides[0].elements[0].simulation,'neutralization');assert.deepEqual(validateLesson(l).activityOrder,['quiz','slides']);});
test('áudio de chat exige associação, limita formato e permite excluir somente ao autor',async()=>{
 const path='/chat-audio/dm/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222',objects=new Map(),user={id:'author'},env={FILES:{get:async key=>objects.get(key),put:async(key,body,meta)=>objects.set(key,{body,...meta}),delete:async key=>objects.delete(key)}};const call=async(request,allowed=true,who=user)=>handleChatAudio(request,env,who,{},async(name,args)=>{assert.equal(name,'sl_chat_audio_access');assert.equal(args.p_scope,'dm');return allowed;});
 assert.equal((await call(new Request('https://worker.test'+path),false)).status,403);
 assert.equal((await call(new Request('https://worker.test'+path,{method:'PUT',headers:{'Content-Type':'audio/webm'},body:new Uint8Array([0x1a,0x45,0xdf,0xa3,0])}))).status,200);assert.equal((await call(new Request('https://worker.test'+path))).status,200);assert.equal((await call(new Request('https://worker.test'+path,{method:'DELETE'}),true,{id:'another'})).status,403);assert.equal((await call(new Request('https://worker.test'+path,{method:'DELETE'}))).status,200);assert.equal(objects.size,0);
 assert.equal((await call(new Request('https://worker.test'+path,{method:'PUT',headers:{'Content-Type':'audio/webm'},body:'<script>'}))).status,415);
});
test('catálogo multidisciplinar de 20 simulações cobre cálculos, markup e normalização',()=>{
 assert.equal(simulationIds.length,20);
 const groupedIds=simulationGroups.flatMap(([,items])=>items.map(([id])=>id));
 assert.deepEqual(groupedIds,simulationIds);
 for(const id of simulationIds){
  assert.ok(simulationNames[id],'nome definido para '+id);
  assert.ok(simulationSubjects[id],'disciplina definida para '+id);
  const html=simulationMarkup(id);
  assert.ok(html.includes(`data-simulation="${id}"`),'markup renderiza '+id);
  assert.ok(html.includes(`<span>${simulationSubjects[id].toUpperCase()}</span>`),'badge de disciplina presente em '+id);
  const normalized=normalizeElements([newElement('simulation',{simulation:id})],false,v=>v||'');
  assert.equal(normalized[0].simulation,id,'normalizeElements preserva '+id);
 }
 assert.equal(normalizeElements([{type:'simulation',simulation:'desconhecida'}],false,v=>v||'')[0].simulation,'projectile');
 assert.deepEqual(waveProperties(2,10),{wavelength:5,period:0.5});
 assert.equal(matterState(-15).state,'Sólido');
 assert.equal(matterState(25).state,'Líquido');
 assert.equal(matterState(120).state,'Gasoso');
 assert.equal(osmosisState(100,300).tonicity,'Hipotônica');
 assert.equal(osmosisState(500,300).tonicity,'Hipertônica');
 assert.equal(osmosisState(300,300).tonicity,'Isotônica');
 assert.ok(logisticPopulation(10,0.45,500,20)>20&&logisticPopulation(10,0.45,500,20)<500);
 assert.deepEqual(quadraticMetrics(1,0,-4).roots,[-2,2]);
 assert.ok(Math.abs(trigValues(90).sin-1)<1e-6);
 assert.equal(seasonInfo(6,23.5).north,'Verão');
 assert.equal(seasonInfo(6,23.5).south,'Inverno');
 assert.equal(historicalEra(1800).era,'Idade Contemporânea');
 assert.equal(narrativeStage(60,5).phase,'Clímax');
 assert.equal(colorMixInfo(255,255,0).hex,'#FFFF00');
 assert.equal(evaluateGate('XOR',1,0).out,1);
 assert.equal(evaluateGate('XOR',1,1).out,0);
 assert.equal(leverBalance(60,20,60,20).balanced,true);
 assert.equal(leverBalance(60,20,60,10).balanced,false);
 assert.equal(leverBalance(60,20,60,10).required,20);
 assert.equal(mendelCross('Aa','Aa').dominantRate,.75);
 assert.equal(mendelCross('AA','aa').dominantRate,1);
 assert.deepEqual(Object.assign({},diceProbability(2,7)),{dice:2,target:7,hits:6,total:36,probability:1/6});
 assert.equal(diceProbability(1,1).probability,1/6);
 assert.ok(compoundInterest(1000,10,12).amount>2500);
 assert.equal(compoundInterest(1000,0,12).amount,1000);
 assert.ok(greenhouseBalance(340,30).temperature<greenhouseBalance(340,80).temperature);
});

test('desafios das simulações dão um alvo verificável e um markup com estado ao vivo',()=>{
 for(const [id,rule] of Object.entries(simulationChallenges)){
  assert.ok(simulationNames[id],'desafio em simulação existente: '+id);
  assert.ok(rule.prompt.length>8&&rule.hint.length>8,'desafio com instrução em '+id);
  const markup=simulationMarkup(id);
  assert.ok(markup.includes('data-sim-challenge'),'painel de desafio em '+id);
  assert.ok(markup.includes('Alvo alcançado')===false,'estado começa pendente em '+id);
  assert.ok(markup.includes('Ajuste os valores'),'estado inicial em '+id);
  // Simulações com sliders ganham passos +/−; as que só têm select não precisam.
  if(markup.includes('type="range"'))assert.ok(markup.includes('data-sim-step'),'passo +/− nos controles de '+id);
 }
 assert.equal(simulationChallenges.projectile.test({range:19.5}),true);
 assert.equal(simulationChallenges.projectile.test({range:21.5}),false);
 assert.equal(simulationChallenges.lever.test(leverBalance(60,20,60,20)),true);
 assert.equal(simulationChallenges.lever.test(leverBalance(60,20,60,10)),false);
 assert.equal(simulationChallenges.genetics.test(mendelCross('AA','aa')),true);
 assert.equal(simulationChallenges.probability.test(diceProbability(3,10)),true);
 assert.equal(simulationChallenges.probability.test(diceProbability(2,7)),false);
 assert.equal(simulationChallenges.interest.test(compoundInterest(1000,10,12)),true);
 assert.equal(simulationChallenges.greenhouse.test(greenhouseBalance(340,30)),true);
});
test('estilos de interface incluem Office e 8-Bit preservando IDs internos',()=>{
 assert.equal(styles.find(([id])=>id==='editorial')?.[1],'Office');
 assert.equal(styles.find(([id])=>id==='arcade')?.[1],'8-Bit');
});
test('miniaturas não interativas de simulações e canvas não emitem controles interativos aninhados',()=>{
 for(const id of simulationIds){
  const thumb=simulationMarkup(id,{interactive:false});
  assert.ok(thumb.includes('class="simulation-widget simulation-thumbnail"'),`classe thumbnail em ${id}`);
  assert.doesNotMatch(thumb,/<(button|input|select|textarea|label)\b/i,`sem controles aninhados em ${id}`);
  assert.doesNotMatch(thumb,/\btabindex=/i,`sem tabindex em ${id}`);
  const slide={id:'s1',kind:'canvas',title:'Prévia',background:'#171324',elements:[newElement('simulation',{simulation:id}),newElement('model',{model:'ssd'})]};
  const staticCanvas=canvasMarkup(slide,{interactive:false,audioTrigger:'element:x',audioHotspots:true});
  assert.doesNotMatch(staticCanvas,/<(button|input|select|textarea|label)\b/i,`canvas estático sem controles em ${id}`);
  assert.doesNotMatch(staticCanvas,/\btabindex=/i,`canvas estático sem tabindex em ${id}`);
  const editingCanvas=canvasMarkup(slide,{editing:true});
  assert.ok(editingCanvas.includes(`aria-label="Elemento: ${simulationNames[id]}"`),`aria-label descritivo em ${id}`);
 }
});


test('experimentos refeitos: cifra de César e raio-X do texto calculam de verdade',async()=>{
 const {caesarShift,letterFrequency,textMetrics,resolveSimulation}=await import('../src/simulations.js');
 assert.equal(caesarShift('HAL',1),'IBM');
 assert.equal(caesarShift('Vim, vi e venci',3),'YLP, YL H YHQFL');
 assert.equal(caesarShift(caesarShift('AÇÃO',7),-7),'ACAO');
 assert.equal(letterFrequency('banana').top,'A');
 const info=textMetrics('A casa é azul. O céu também é azul! E o mar?');
 assert.equal(info.sentences,3);
 assert.equal(info.words,12);
 assert.equal(info.repeated[0][0],'azul');
 assert.equal(textMetrics('').level,'Sem texto');
 // Slides antigos com os experimentos removidos abrem o substituto.
 assert.equal(resolveSimulation('eras'),'cipher');
 assert.equal(resolveSimulation('narrative'),'textlab');
 assert.equal(resolveSimulation('nada'),'projectile');
});
