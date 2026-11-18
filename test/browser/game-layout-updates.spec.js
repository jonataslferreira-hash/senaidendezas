import {test,expect} from '@playwright/test';

for (const size of [{width:375,height:667},{width:1440,height:850}]) {
  test(`jogos mantêm conteúdo legível e acessível em ${size.width}px`,async({page})=>{
    await page.setViewportSize(size);
    await page.goto('/');
    await page.evaluate(async()=>{
      const {Room}=await import('/src/room.js');
      const {newLesson,newSlide}=await import('/src/lessons.js');
      const {defaultGame}=await import('/src/stage-games.js');
      const {gameMarkup}=await import('/src/stage-games-view.js');
      window.testGame={Room,newLesson,newSlide,defaultGame,gameMarkup};
    });
    const build=async(type,host=false)=>page.evaluate(({type,host})=>{
      const {Room,newLesson,newSlide,defaultGame,gameMarkup}=window.testGame;
      const lesson=newLesson(),cover=newSlide(),slide=newSlide();
      const long='Uma pessoa com nome muito muito comprido';
      const q={text:'Uma pergunta longa para não cobrir as alternativas?',options:['Uma alternativa longa que precisa ficar visível inteira','Outra alternativa de resposta igualmente longa'],correct:0};
      slide.game={...defaultGame(type),seconds:45,questions:[q,q],rounds:[[q,q],[q]],options:['Equipe com nome extremamente comprido','Equipe adversária com nome extremamente comprido']};
      lesson.slides=[cover,slide];lesson.questions=[];lesson.activityBlocks=[{id:'cover',type:'slides',items:[cover.id]},{id:'game',type,items:[slide.id]}];
      const room=new Room('123123',null,()=>50000,lesson);const a=room.join({name:long}),b=room.join({name:'Outra pessoa de nome longo'});room.control('next-stage');room.control('game',{do:'next'});
      if(type==='flash'){
        room.answer(a.id,{choice:{round:0,choice:0}});room.answer(b.id,{choice:{round:0,choice:0}});room.control('game',{do:'next'});
      }
      const app=document.querySelector('#app');app.className='quiz-party';app.dataset.role=host?'presenter':'student';
      app.innerHTML=gameMarkup(room.snapshot(host?null:a.id),{host,header:()=>'',now:50000});
      window.renderedRoom=room;window.renderedPlayer=a;window.renderGame=gameMarkup;
    },{type,host});
    await build('flash');
    await expect(page.locator('.flash-board li')).toHaveCount(2);
    const flash=await page.evaluate(()=>{
      const row=document.querySelector('.flash-board li'),name=row.querySelector('.flash-board-who').getBoundingClientRect(),points=row.querySelector(':scope > strong').getBoundingClientRect(),list=document.querySelector('.flash-board').getBoundingClientRect(),status=document.querySelector('.sv-safe').getBoundingClientRect();
      return {name:{right:name.right,top:name.top,bottom:name.bottom},points:{left:points.left,top:points.top,bottom:points.bottom,right:points.right},listBottom:list.bottom,statusTop:status.top,scrollWidth:document.documentElement.scrollWidth};
    });
    expect(flash.name.right).toBeLessThanOrEqual(flash.points.left+1);
    expect(flash.points.top).toBeLessThan(flash.name.bottom);
    expect(flash.statusTop).toBeGreaterThanOrEqual(flash.listBottom-1);
    expect(flash.scrollWidth).toBeLessThanOrEqual(size.width);
    // Pódio final no telão deve poder ser visto inteiro ao rolar.
    await page.evaluate(()=>{
      const room=window.renderedRoom,a=window.renderedPlayer,b=room.data.players[1];
      room.control('game',{do:'next'});
      room.answer(a.id,{choice:{round:1,choice:0}});room.answer(b.id,{choice:{round:1,choice:0}});room.control('game',{do:'next'});
      const app=document.querySelector('#app');app.dataset.role='presenter';app.innerHTML=window.renderGame(room.snapshot(),{host:true,header:()=>'',now:50000});
    });
    const podium=await page.evaluate(()=>{
      const stage=document.querySelector('.game-stage'),p=document.querySelector('.flash-podium');
      stage.scrollTop=0; const top=p.getBoundingClientRect().top,screenTop=stage.getBoundingClientRect().top;
      stage.scrollTop=stage.scrollHeight; const bottom=p.getBoundingClientRect().bottom,screenBottom=stage.getBoundingClientRect().bottom;
      return {top,screenTop,bottom,screenBottom};
    });
    expect(podium.top).toBeGreaterThanOrEqual(podium.screenTop-1);
    expect(podium.bottom).toBeLessThanOrEqual(podium.screenBottom+1);
    await build('race');
    const race=await page.evaluate(()=>{
      const options=document.querySelector('.game-options').getBoundingClientRect(),track=document.querySelector('.race-track').getBoundingClientRect();
      return {optionsBottom:options.bottom,trackTop:track.top,width:document.documentElement.scrollWidth};
    });
    expect(race.trackTop).toBeGreaterThanOrEqual(race.optionsBottom-1);
    expect(race.width).toBeLessThanOrEqual(size.width);
    await build('tug',true);
    const tug=await page.evaluate(()=>{
      const spans=[...document.querySelectorAll('.tug-names > span')].map(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
      return {spans,width:document.documentElement.scrollWidth,text:document.querySelector('.game-stage').innerText};
    });
    expect(tug.width).toBeLessThanOrEqual(size.width);
    expect(tug.text).not.toContain('Times ímpares:');
    for(const span of tug.spans)expect(span.scroll).toBeLessThanOrEqual(span.client+1);
  });
}
