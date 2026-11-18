import {test,expect} from '@playwright/test';

for(const size of [{width:375,height:667},{width:1360,height:768}]) {
 test(`jogos cabem na tela e não rolam para vazio ${size.width}`,async({page})=>{
  await page.setViewportSize(size); await page.addInitScript(()=>localStorage.setItem('sl-tour','done')); await page.goto('/');
  await page.evaluate(async()=>{
   const {Room}=await import('/src/room.js'),{newLesson,newSlide}=await import('/src/lessons.js');
   const {defaultGame}=await import('/src/stage-games.js'),{gameMarkup}=await import('/src/stage-games-view.js');
   window.makeScene=(type,phase,host)=>{
    let now=50000;const lesson=newLesson(),cover=newSlide(),slide=newSlide();
    const q={text:'Qual é a resposta correta?',options:['Alternativa um','Alternativa dois','Alternativa três','Alternativa quatro'],correct:0};
    slide.game={...defaultGame(type),seconds:45,questions:[q,q],rounds:[[q],[q]],options:['Equipe Vermelha','Equipe Azul']};
    lesson.slides=[cover,slide];lesson.questions=[];lesson.activityBlocks=[{id:'cover',type:'slides',items:[cover.id]},{id:'game',type,items:[slide.id]}];
    const room=new Room('123123',null,()=>now,lesson),a=room.join({name:'Ana'}),b=room.join({name:'Bia'});
    room.control('next-stage'); room.control('game',{do:'next'});
    if(phase==='done'){
     if(type==='flash'){room.answer(a.id,{choice:{round:0,choice:0}});room.answer(b.id,{choice:{round:0,choice:0}});room.control('game',{do:'end'});}
     if(type==='race'){room.control('game',{do:'end'});}
     if(type==='tug'){room.control('game',{do:'end'});}
    }
    const app=document.querySelector('#app'); app.className='quiz-party'; app.dataset.role=host?'presenter':'student';
    app.innerHTML=gameMarkup(room.snapshot(host?null:a.id),{host,header:()=>'<header class="header">Storage Lab</header>',now});
   };
  });
  for(const [type,phase,host] of [['flash','open',false],['flash','done',true],['survival','open',true],['survival','open',false],['race','open',false],['race','done',true],['tug','done',false]]) {
   await page.evaluate(args=>window.makeScene(...args),[type,phase,host]);
   if(phase==='done' && (type==='race' || type==='tug')) await page.waitForTimeout(2600); // confetes em movimento não podem criar rolagem extra
   const info=await page.evaluate(()=>{
    const stage=document.querySelector('.game-stage'),rect=stage.getBoundingClientRect();
    const items=[...stage.children].filter(el=>el.getBoundingClientRect().height>0).map(el=>({class:el.className,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}));
    const options=[...stage.querySelectorAll('.game-option')].map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};});
    return {scroll:stage.scrollHeight-stage.clientHeight,top:rect.top,bottom:rect.bottom,items,options,doc:document.documentElement.scrollWidth,inner:innerWidth};
   });
   expect(info.scroll,`${type} ${phase}: ${JSON.stringify(info)}`).toBeLessThanOrEqual(2);
   for(const item of info.items){expect(item.top,`${type}: ${item.class}`).toBeGreaterThanOrEqual(info.top-1);expect(item.bottom,`${type}: ${item.class}`).toBeLessThanOrEqual(info.bottom+1);}
   for(let i=1;i<info.items.length;i++) expect(info.items[i].top,`${type}: blocos sobrepostos`).toBeGreaterThanOrEqual(info.items[i-1].bottom-1);
   expect(info.doc).toBeLessThanOrEqual(info.inner);
   for(const option of info.options){expect(option.top).toBeGreaterThanOrEqual(info.top-1);expect(option.bottom).toBeLessThanOrEqual(info.bottom+1);}
  }
 });
}
