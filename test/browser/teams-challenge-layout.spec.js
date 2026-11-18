import {test, expect} from '@playwright/test';
import {newLesson,newSlide} from '../../src/lessons.js';
import {defaultGame} from '../../src/stage-games.js';

test('edições de dois times e desafio cabem e permanecem sincronizados',async({page,browser})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const lesson=newLesson();lesson.title='Equipes e desafio';
  const cover=newSlide('Capa'),teams=newSlide('Times'),challenge=newSlide('Desafio');
  teams.game={...defaultGame('teams'),count:3};
  challenge.game={...defaultGame('challenge'),text:'Ajuste o experimento até chegar à meta.',simulation:'moon',answer:[{k:'range',label:'Dia',v:'14',min:0,max:29}]};
  lesson.slides=[cover,teams,challenge];lesson.questions=[];
  lesson.activityBlocks=[{id:'cover',type:'slides',items:[cover.id]},{id:'teams',type:'teams',items:[teams.id]},{id:'challenge',type:'challenge',items:[challenge.id]}];
  await page.setViewportSize({width:1440,height:850});
  await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));
  await page.goto('/?localSignal');
  await page.locator('#import-lesson-file').setInputFiles({name:'equipes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(lesson))});
  await page.getByRole('button',{name:'Apresentar ↗',exact:true}).click();
  const code=(await page.locator('.big-code').innerText()).replace(/\s/g,'');
  await page.getByRole('button',{name:'Fechar convite'}).click();
  const phoneContext=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
  const pcContext=await browser.newContext({viewport:{width:1024,height:768}});
  const phone=await phoneContext.newPage(),pc=await pcContext.newPage();
  for(const p of [phone,pc])p.on('pageerror',e=>errors.push(e.message));
  try{
    for(const [p,name] of [[phone,'Ana'],[pc,'Bia']]){
      await p.goto(`/?localSignal&s=${code}`);
      await p.getByLabel('Como podemos chamar você?').fill(name);
      await p.getByRole('button',{name:'Entrar na sala',exact:true}).click();
    }
    await expect(page.locator('.stage-people')).toContainText('2');
    await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});
    await page.locator('[data-action="next-stage"]').click();
    for(const p of [page,phone,pc])await expect(p.locator('.game-stage[data-game-type="teams"]')).toBeVisible();
    await expect(page.locator('.game-note')).toContainText('dispositivo');
    await expect(page.locator('.game-note')).not.toContainText('celular');
    await expect(page.locator('[data-team-count-select]')).toHaveValue('3');
    await page.getByRole('button',{name:'Tornar Ana líder do time'}).click();
    await page.getByRole('button',{name:'Tornar Bia líder do time'}).click();
    for(const p of [phone,pc])await expect(p.locator('.team-leader-tools')).toBeVisible();
    const layout=await phone.evaluate(()=>{
      const cards=[...document.querySelectorAll('.team-card')].map(el=>el.getBoundingClientRect());
      const note=document.querySelector('.game-note').getBoundingClientRect();
      const buttons=[...document.querySelectorAll('.team-leader-actions button')].map(el=>el.getBoundingClientRect());
      return {cards:cards.map(r=>({top:r.top,bottom:r.bottom,left:r.left,right:r.right})),noteTop:note.top,buttons:buttons.map(r=>({top:r.top,bottom:r.bottom,left:r.left,right:r.right})),width:innerWidth,scrollWidth:document.documentElement.scrollWidth};
    });
    for(let i=1;i<layout.cards.length;i++)expect(layout.cards[i].top).toBeGreaterThanOrEqual(layout.cards[i-1].bottom-1);
    expect(layout.noteTop).toBeGreaterThanOrEqual(layout.cards.at(-1).bottom-1);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
    for(const b of layout.buttons){expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(layout.width);expect(b.bottom-b.top).toBeGreaterThanOrEqual(44);}
    // As duas pessoas preparam fotos e nomes. O salvamento da segunda não pode
    // descartar o rascunho da primeira, mesmo ao receber o novo snapshot.
    const photo=await phone.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.fillStyle='#f44';x.fillRect(0,0,32,32);return c.toDataURL('image/png').split(',')[1];});
    for(const [p,name] of [[phone,'Time rascunho'],[pc,'Equipe salva']]){
      await p.locator('[data-team-name]').fill(name);
      await p.locator('[data-team-photo]').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
      await expect(p.locator('[data-team-preview] img')).toHaveAttribute('alt','Nova foto do time');
    }
    const draftSrc=await phone.locator('[data-team-preview] img').getAttribute('src');
    await pc.locator('[data-team-save]').click();
    await expect(page.locator('.team-board')).toContainText('Equipe salva');
    await expect(phone.locator('.team-board')).toContainText('Equipe salva');
    await expect(phone.locator('[data-team-name]')).toHaveValue('Time rascunho');
    await expect(phone.locator('[data-team-preview] img')).toHaveAttribute('src',draftSrc);
    await phone.locator('[data-team-save]').click();
    await expect(page.locator('.team-board')).toContainText('Time rascunho');
    await expect(page.locator('.team-card .team-photo')).toHaveCount(2);
    await expect(phone.locator('[data-team-photo-clear]')).toBeVisible();
    const savedLayout=await phone.evaluate(()=>{
      const rects=[...document.querySelectorAll('.team-leader-actions button')].map(el=>el.getBoundingClientRect());
      const header=document.querySelector('.team-card.has-photo > header') || document.querySelector('.team-card > header.has-photo');
      const [photo,name,points]=[header.querySelector('img'),header.querySelector('strong'),header.querySelector('b')].map(el=>el.getBoundingClientRect());
      return {buttons:rects.map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})), photo:photo.top,name:name.top,points:points.top};
    });
    expect(savedLayout.buttons).toHaveLength(2);
    const [a,b]=savedLayout.buttons;
    expect(a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top).toBe(true);
    expect(Math.abs(savedLayout.photo-savedLayout.name)).toBeLessThan(45);
    expect(Math.abs(savedLayout.name-savedLayout.points)).toBeLessThan(25);
    await page.locator('[data-action="next-stage"]').click();
    for(const p of [page,phone,pc])await expect(p.locator('.game-stage[data-game-type="challenge"]')).toBeVisible();
    for(const p of [phone,pc]){
      await expect(p.locator('.challenge-goal')).toHaveCount(0);
      await expect(p.locator('.challenge-team-hint.quiet')).toHaveCount(0);
      await expect(p.locator('.challenge-submit-row .character-head img')).toBeVisible();
      await expect(p.locator('[data-challenge-sim] [data-sim-play]')).toBeVisible();
      expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    const pcBounds=await pc.locator('.challenge-layout').boundingBox();
    expect(Math.abs((pcBounds.x+pcBounds.width/2)-512)).toBeLessThan(3);
    await expect(page.locator('.challenge-goal')).toHaveCSS('text-align','center');
    await expect(page.locator('.challenge-team-hint')).toHaveCount(0);
    await expect(page.locator('.challenge-live-card')).toHaveCount(2,{timeout:30000});
    await expect(page.locator('.challenge-live-sim [data-sim-play]').first()).toBeHidden();
    const svg=await page.locator('.challenge-live-card svg').last().boundingBox();
    expect(svg.height).toBeGreaterThanOrEqual(190);
    const widget=page.locator('.challenge-live-card .simulation-widget').first();
    expect(await widget.evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
    expect(errors).toEqual([]);
  }finally{await phoneContext.close();await pcContext.close();}
});
