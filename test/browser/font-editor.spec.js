import {createProject} from './project-fixture.js';
import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {newLesson} from '../../src/lessons.js';
test('catálogo inteiro tem cinco colunas, acentos, recomendações e rolagem sem mover o fundo',async({page})=>{
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await page.setViewportSize({width:1440,height:900});await page.goto('/');await createProject(page);await page.locator('.font-choose').click();await expect(page.locator('.font-all [data-family]')).toHaveCount(1966);await expect(page.locator('.font-recommended [data-family]')).toHaveCount(5);await expect(page.locator('.font-all button').first()).toContainText('À É Í Ó Ú');expect((await page.locator('.font-all').evaluate(e=>getComputedStyle(e).gridTemplateColumns)).split(' ')).toHaveLength(5);await expect(page.getByText(/1959|1966 opções|Carregar mais fontes|precisam de conexão/)).toHaveCount(0);const before=await page.evaluate(()=>scrollY);await page.locator('.font-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);await expect(page.locator('.font-all button').last()).toBeVisible();await page.mouse.move(1400,880);await page.mouse.wheel(0,2000);expect(await page.evaluate(()=>scrollY)).toBe(before);await page.getByLabel('Buscar fonte',{exact:true}).fill('Bungee');await page.locator('[data-family=Bungee]').click();await expect(page.locator('.font-dialog')).toHaveCount(0);await expect(page.locator('.canvas-text').first()).toHaveCSS('font-family',/Bungee/);
});
test('fonte própria fica no projeto, sobrevive ao reload e acompanha o JSON',async({page,browser})=>{
 const path='C:/Windows/Fonts/arial.ttf';test.skip(!existsSync(path),'Fonte de teste local indisponível');await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await page.goto('/');await createProject(page);await page.locator('.font-choose').click();await page.locator('[data-font-file]').setInputFiles({name:'Minha fonte.ttf',mimeType:'font/ttf',buffer:readFileSync(path)});await expect(page.locator('.font-custom [data-family]')).toHaveCount(1);await page.locator('.font-custom [data-family]').click();await expect(page.locator('.font-choose')).toHaveText(/Minha fonte/);await page.getByRole('button',{name:'Salvar aula',exact:true}).click();await page.reload();await expect(page.locator('.font-choose')).toHaveText(/Minha fonte/);await expect.poll(()=>page.evaluate(()=>[...document.fonts].some(f=>f.family.startsWith('SLFont-')&&f.status==='loaded'))).toBe(true);const compact=await page.evaluate(()=>JSON.parse(localStorage.getItem('storage-lab-lessons-v1')).find(l=>l.customFonts?.length));expect(compact.customFonts[0].data).toBe('');expect(compact.customFonts[0].assetId).toMatch(/^asset-/);
 await page.getByLabel('Mais opções da aula',{exact:true}).click();const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar JSON',exact:true}).click();const file=await waiting,portable=JSON.parse(readFileSync(await file.path(),'utf8'));expect(portable.customFonts[0].data).toMatch(/^data:font\/ttf;base64,/);const context=await browser.newContext(),other=await context.newPage();try{await other.goto('/');await other.locator('#import-lesson-file').setInputFiles({name:'fonte.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(portable))});await expect(other.locator('.font-choose')).toHaveText(/Minha fonte/);await expect.poll(()=>other.evaluate(()=>[...document.fonts].some(f=>f.family.startsWith('SLFont-')&&f.status==='loaded'))).toBe(true);}finally{await context.close();}
});
test('menu da etapa exclui a enquete após confirmar, mantendo slides e o projeto',async({page})=>{
 await page.goto('/?reload=123456');await createProject(page);await expect(page).toHaveURL(/\?edit=[a-f0-9]{8}$/);await page.getByRole('button',{name:'Adicionar atividade',exact:true}).click();await page.locator('[data-add=poll]').click();await page.getByRole('button',{name:'Opções da etapa Enquete',exact:true}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();await expect(page.getByRole('button',{name:'Opções da etapa Enquete',exact:true})).toHaveCount(0);await expect(page.locator('.outline-actions [data-studio-action=add-slide]')).toBeVisible();await expect(page.locator('.outline-actions [data-studio-action=delete-slide] svg')).toHaveCount(1);await page.getByRole('button',{name:'Salvar aula',exact:true}).click();await page.reload();await expect(page.locator('.editor-title')).toBeVisible();await expect(page.locator('.block-tab')).toHaveCount(1);expect(page.url()).not.toContain('reload=');
});
test('endereço curto mantém slide, aba e navegação Voltar e Avançar',async({page})=>{
 await page.goto('/');await page.locator('.lesson-card [data-studio-action=edit]').first().click();await expect(page).toHaveURL(/\?edit=[a-f0-9]{8}$/);const shortcut=page.url();await page.locator('.outline-item').nth(1).click();await page.reload();await expect(page.locator('.outline-item.active')).toHaveAttribute('data-index','1');await page.getByRole('tab',{name:/Quiz/}).click();await expect(page.getByRole('tab',{name:/Quiz/})).toHaveAttribute('aria-selected','true');expect(page.url()).toBe(shortcut);await page.goBack();await expect(page.locator('.slide-designer')).toBeVisible();await expect(page.locator('.outline-item.active')).toHaveAttribute('data-index','1');await page.goForward();await expect(page.getByRole('tab',{name:/Quiz/})).toHaveAttribute('aria-selected','true');await page.reload();await expect(page.getByRole('tab',{name:/Quiz/})).toHaveAttribute('aria-selected','true');
});

test('Shift seleciona dois textos para mover e trocar fonte juntos',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await createProject(page);
  const layers=page.locator('.designer-layer-list button');
  await layers.nth(0).click();
  await layers.nth(1).click({modifiers:['Shift']});
  const group=page.locator('.canvas-editing [data-type="text"][data-selected=true]');
  await expect(group).toHaveCount(2);
  const positions=()=>group.evaluateAll(nodes=>nodes.map(node=>[parseFloat(node.style.left),parseFloat(node.style.top)]));
  const before=await positions();
  const target=await group.first().boundingBox();
  await page.mouse.move(target.x+12,target.y+12);
  await page.mouse.down();
  await page.mouse.move(target.x+70,target.y+42,{steps:4});
  await page.mouse.up();
  const after=await positions();
  expect(after[0][0]-before[0][0]).toBeGreaterThan(0);
  expect(after[1][0]-before[1][0]).toBeCloseTo(after[0][0]-before[0][0],0);
  await page.locator('.designer-inspector [data-font-action]').click();
  await page.getByRole('dialog').locator('[data-family="Georgia"]').click();
  expect(await group.evaluateAll(nodes=>nodes.every(node=>node.style.fontFamily.includes('Georgia')))).toBe(true);
});
