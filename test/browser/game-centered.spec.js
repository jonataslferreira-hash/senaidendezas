import { test, expect } from '@playwright/test';
for (const size of [{width:1440,height:850},{width:1172,height:455},{width:375,height:667}]) {
 test(`placar e corrida visíveis sem rolagem ${size.width}x${size.height}`,async({page})=>{
  await page.setViewportSize(size); await page.addInitScript(()=>localStorage.setItem('sl-tour','done')); await page.goto('/');
  await page.evaluate(async()=>{
   const {Room}=await import('/src/room.js'); const {newLesson,newSlide}=await import('/src/lessons.js');
   const {defaultGame}=await import('/src/stage-games.js'); const {gameMarkup}=await import('/src/stage-games-view.js');
   window.fixture=(type,phase)=>{
    const l=newLesson(),a=newSlide(),b=newSlide(); b.game={...defaultGame(type),seconds:15,questions:[{text:'Teste?',options:['Sim','Não'],correct:0},{text:'Outra?',options:['Sim','Não'],correct:0}]}; l.slides=[a,b];l.questions=[];l.activityBlocks=[{id:'a',type:'slides',items:[a.id]},{id:'b',type,items:[b.id]}];
    const room=new Room('123123',null,()=>50000,l);const players=['Ana','Bia','Caio','Dani'].map(name=>room.join({name}));room.control('next-stage');
    if(type==='flash'){room.control('game',{do:'next'});for(const p of players)room.answer(p.id,{choice:{round:0,choice:0}});if(phase==='leaderboard')room.control('game',{do:'next'}); if(phase==='done')room.control('game',{do:'end'});}
    const app=document.querySelector('#app');app.className='quiz-party';app.dataset.role='presenter';app.innerHTML=gameMarkup(room.snapshot(),{host:true,header:()=>'<header class="header">Storage Lab</header>',now:50000});
   };
  });
  for(const [type,phase,selector] of [['flash','leaderboard','.flash-board'],['flash','done','.flash-podium'],['race','ready','.race-track'],['tug','ready','.tug-scene']]){
   await page.evaluate(([t,p])=>window.fixture(t,p),[type,phase]);
   const boxes=await page.evaluate(selector=>{const stage=document.querySelector('.game-stage'), target=document.querySelector(selector),buttons=document.querySelector('.game-actions'),r=el=>{const b=el.getBoundingClientRect();return {top:b.top,bottom:b.bottom,left:b.left,right:b.right}}; return {stage:r(stage),target:r(target),buttons:r(buttons),scrollHeight:stage.scrollHeight,clientHeight:stage.clientHeight};},selector);
   expect(boxes.target.top,JSON.stringify(boxes)).toBeGreaterThanOrEqual(boxes.stage.top-2);
   expect(boxes.buttons.bottom,JSON.stringify(boxes)).toBeLessThanOrEqual(boxes.stage.bottom+2);
   expect(boxes.scrollHeight,JSON.stringify(boxes)).toBeLessThanOrEqual(boxes.clientHeight+2);
  }
 });
}

test('pódio geral mantém integrantes de cada time lado a lado',async({page})=>{
 await page.setViewportSize({width:1440,height:850});await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));await page.goto('/');
 const boxes=await page.evaluate(async()=>{
  const {leaderboardMarkup}=await import('/src/game-ui.js');
  const a={id:'a',name:'Ana',avatar:'🐱',score:100}, b={id:'b',name:'Bia',avatar:'🚀',score:50};
  const state={resultScope:'overall',podiumStep:4,podiumRevealed:true,activity:{hasNext:false},ranking:[a,b],teams:[{name:'Um',color:'#38bdf8',score:150,members:[a,b]},{name:'Dois',color:'#22c55e',score:20,members:[]}],me:{id:'a'}};
  const app=document.querySelector('#app');app.className='quiz-party';app.dataset.role='presenter';app.innerHTML=leaderboardMarkup(state,{host:true,final:true,header:()=>'<header class="header">Storage Lab</header>'});
  const crew=app.querySelector('.final-team-champion .team-podium-crew');
  return [...crew.querySelectorAll('.team-podium-member')].map(node=>{const b=node.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top};});
 });
 expect(boxes).toHaveLength(2);expect(boxes[1].left).toBeGreaterThanOrEqual(boxes[0].right-1);expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(3);
});
