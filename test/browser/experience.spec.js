import {test,expect} from '@playwright/test';
test('biblioteca inicia sozinha e mantem navegacao do editor',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  const demo=page.locator('[data-showcase]');await expect(demo).toHaveAttribute('data-playing','true');await expect(page.locator('[data-showcase-play]')).toHaveCount(0);
  await expect(demo).toHaveAttribute('data-step','2',{timeout:11000});await expect(demo).toHaveClass(/demo-correct/);await expect(demo).toHaveAttribute('data-step','0',{timeout:7000});
  await page.locator('.lesson-card [data-studio-action=edit]').first().click();await expect(page.locator('.slide-designer')).toBeVisible();await page.goBack();await expect(page.locator('.studio-library')).toBeVisible();
  await page.locator('.experience-feature').scrollIntoViewIfNeeded();await expect(demo).toHaveAttribute('data-playing','true');expect(errors).toEqual([]);
});
test('digitacao alinhada segura o texto por 4,5 segundos e apaga antes de trocar fonte',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.install({time:new Date('2026-11-02T12:00:00Z')});await page.goto('/');
  const text=page.locator('.living-title'),current=page.locator('.living-title-current');await expect(current).toBeAttached();await page.clock.pauseAt(new Date('2026-11-02T12:01:00Z'));
  const font=await text.getAttribute('data-font');for(let i=0;i<15&&await current.textContent()!=='ganhar vida';i++)await page.clock.runFor(60);
  await expect(current).toHaveText('ganhar vida');
  expect(Math.abs(await current.evaluate(el=>el.getBoundingClientRect().left-el.closest('h2').getBoundingClientRect().left))).toBeLessThan(2);
  await page.clock.runFor(4300);await expect(current).toHaveText('ganhar vida');await expect(text).toHaveAttribute('data-font',font);
  await page.clock.runFor(240);const deleting=await current.textContent();expect(deleting.length).toBeLessThan(12);expect(deleting.length).toBeGreaterThan(0);
  await page.clock.runFor(500);expect(await text.getAttribute('data-font')).not.toBe(font);expect((await current.textContent()).length).toBeGreaterThan(0);
  await page.clock.resume();await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(Math.abs(await current.evaluate(el=>el.getBoundingClientRect().left-el.closest('h2').getBoundingClientRect().left))).toBeLessThan(2);
  await page.screenshot({path:'test-results/typing-mobile.png',animations:'disabled'});
});
test('flutuacao visivel, transicao sobreposta e conta animada',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await expect(page.locator('[data-showcase]')).toHaveAttribute('data-playing','true');
  const board=page.locator('.demo-board'),start=await board.evaluate(el=>parseFloat(getComputedStyle(el).translate.split(' ')[1]));
  await expect.poll(()=>board.evaluate(el=>parseFloat(getComputedStyle(el).translate.split(' ')[1])),{timeout:3000}).toBeLessThan(start-12);
  await page.locator('.showcase-steps [data-showcase-step="1"]').click();await expect(page.locator('.stage-leaving')).toHaveCount(1);await expect(page.locator('.stage-leaving')).toHaveCount(0);
  await page.locator('.showcase-steps [data-showcase-step="0"]').click();await page.locator('.showcase-steps [data-showcase-step="2"]').click();await expect(page.locator('.demo-board-stage:not(.stage-leaving)')).toHaveCount(1);
  await page.getByRole('button',{name:'Entrar / Criar conta',exact:true}).click();await expect.poll(()=>page.locator('.account-dialog').evaluate(el=>el.getAnimations().some(a=>a.currentTime>20&&a.currentTime<450))).toBe(true);
  await page.getByRole('button',{name:'Fechar conta',exact:true}).click();await expect(page.locator('.account-dialog')).toHaveCount(0);
});
test('movimento reduzido preserva digitacao e ciclo sem flutuacao',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('.demo-board')).toHaveCSS('animation-name','none');await expect(page.locator('.living-title-current')).toHaveText('ganhar vida',{timeout:1800});await expect(page.locator('[data-showcase]')).toHaveAttribute('data-step','1',{timeout:6000});
});
