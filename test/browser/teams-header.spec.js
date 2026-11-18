import {test, expect} from '@playwright/test';
import {newLesson, newSlide} from '../../src/lessons.js';
import {defaultGame} from '../../src/stage-games.js';

test('participantes e convite funcionam na etapa de equipes, no telão e no celular', async ({page, browser}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const lesson = newLesson();
  lesson.title = 'Teste dos botões das equipes';
  const cover = newSlide('Capa'), teams = newSlide('Equipes');
  teams.game = {...defaultGame('teams'), text: 'Que comecem os jogos!', count: 3};
  lesson.slides = [cover, teams];
  lesson.questions = [];
  lesson.activityBlocks = [
    {id:'cover', type:'slides', items:[cover.id]},
    {id:'teams', type:'teams', items:[teams.id]}
  ];
  await page.goto('/?localSignal');
  await page.locator('#import-lesson-file').setInputFiles({name:'teams.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(lesson))});
  await page.getByRole('button',{name:'Apresentar ↗',exact:true}).click();
  const code = (await page.locator('.big-code').innerText()).replace(/\s/g,'');
  await page.getByRole('button',{name:'Fechar convite'}).click();
  const phoneContext = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const phone = await phoneContext.newPage();
  phone.on('pageerror', error => errors.push(error.message));
  try {
    await phone.goto(`/?localSignal&s=${code}`);
    await phone.getByLabel('Como podemos chamar você?').fill('Ana');
    await phone.getByRole('button',{name:'Entrar na sala',exact:true}).click();
    await expect(page.locator('.stage-people')).toContainText('1');
    await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});
    await page.locator('[data-action="next-stage"]').click({timeout:15000});
    await expect(page.locator('.game-stage[data-game-type="teams"]')).toBeVisible();
    await expect(phone.locator('.game-stage[data-game-type="teams"]')).toBeVisible();
    const heading = page.locator('.teams-host-heading');
    await expect(heading.locator('.game-eyebrow')).toContainText('EQUIPES');
    await expect(heading.locator('h1')).toHaveText('Que comecem os jogos!');
    const positions = await heading.evaluate(el => ({label: el.querySelector('.game-eyebrow').getBoundingClientRect().bottom, title:el.querySelector('h1').getBoundingClientRect().top}));
    expect(positions.label).toBeLessThanOrEqual(positions.title);
    await expect(phone.locator('.game-stage')).not.toContainText('Que comecem os jogos!');
    await page.locator('.stage-people').click();
    await expect(page.locator('dialog.participants-sheet[open]')).toContainText('Ana');
    await page.getByRole('button',{name:'Editar times'}).click();
    await expect(page.getByRole('heading',{name:'Editar times'})).toBeVisible();
    await page.locator('dialog [name="team-count"]').selectOption('4');
    await page.getByRole('button',{name:'Salvar times'}).click();
    await expect(page.locator('.team-card')).toHaveCount(4);
    for (let i=0;i<2;i++) {
      await page.locator('[data-action="room-invite"]').click();
      await expect(page.locator('.share-modal')).toBeVisible();
      await expect(page.locator('#room-qr')).toHaveAttribute('src', /^data:image/);
      await page.getByRole('button',{name:'Fechar convite'}).click();
      await expect(page.locator('.share-modal')).toHaveCount(0);
    }
    for (const selector of ['.stage-people','[data-action="room-invite"]']) {
      await phone.locator(selector).click();
      await expect(phone.locator('dialog.participants-sheet[open]')).toContainText('Ana');
      await phone.getByRole('button',{name:'Fechar participantes'}).click();
    }
    expect(errors).toEqual([]);
  } finally { await phoneContext.close(); }
});
