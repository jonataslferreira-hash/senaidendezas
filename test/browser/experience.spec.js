import {test,expect} from '@playwright/test';
test.beforeEach(async ({page})=>{await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));});
test('biblioteca inicia a demonstração e mantém ação de criar aula',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  const demo=page.locator('[data-showcase]');await expect(demo).toHaveAttribute('data-playing','true');await expect(page.locator('[data-showcase-play]')).toHaveCount(0);
  await expect(demo).toHaveAttribute('data-step','2',{timeout:14000});await expect(demo).toHaveClass(/demo-correct/);await expect(demo).toHaveAttribute('data-step','0',{timeout:9000});
  await page.getByRole('button',{name:/Começar uma aula/}).click();await expect(page.getByLabel('Título da aula',{exact:true})).toBeVisible();expect(errors).toEqual([]);
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
test('celular flutua, apresenta o conteúdo real e sincroniza as respostas',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  const demo=page.locator('[data-showcase]'),phone=page.locator('.showcase-phone');await expect(demo).toHaveAttribute('data-playing','true');
  await expect(phone.locator('[data-showcase-phone]')).toContainText('Onde vivem os seus arquivos?');
  expect(await phone.evaluate(el=>el.getAnimations().some(a=>a.playState==='running'))).toBe(true);
  await page.getByRole('button',{name:'03 Responder quiz'}).click();
  await expect(phone).toContainText('Qual componente mantém seus arquivos salvos');
  await phone.getByRole('button',{name:'B Armazenamento (HDD ou SSD)'}).click();
  await expect(demo).toHaveClass(/demo-correct/);await expect(page.locator('[data-board-answer="1"]')).toHaveClass(/chosen/);
  await expect(phone.locator('[data-phone-feedback]')).toHaveText('✓ Resposta correta');
  await phone.getByRole('button',{name:'A Memória RAM comum'}).click();await expect(demo).toHaveClass(/demo-wrong/);
  await page.waitForTimeout(5700);await expect(demo).toHaveAttribute('data-step','2');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('movimento reduzido desativa flutuação e mantém navegação',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('.showcase-phone')).toHaveCSS('animation-name','none');
  await page.getByRole('button',{name:'02 Conectar turma'}).click();await expect(page.locator('[data-showcase-phone]')).toContainText('Conectado');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
