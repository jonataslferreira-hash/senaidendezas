import {test,expect} from '@playwright/test';
import {pptxFixture} from '../document-fixtures.js';
import {readFile} from 'node:fs/promises';
test('PPTX entra como objetos editáveis e mantém a alteração depois de recarregar',async({page})=>{
 await page.goto('/');await page.locator('#import-slides-file').setInputFiles({name:'editavel.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await pptxFixture()});
 await expect(page.locator('.outline-item')).toHaveCount(2,{timeout:60000});await expect(page.locator('.canvas-object[data-type=text]')).toHaveCount(2);
 await page.locator('[data-designer-action=select]').nth(1).click();await page.getByLabel('Texto do elemento',{exact:true}).fill('Texto editado dentro do site');await page.getByRole('button',{name:'Salvar aula',exact:true}).click();await page.reload();await expect(page.locator('.canvas-text')).toContainText(['Texto editado dentro do site','Uma aula importada do PowerPoint.']);
});
test('modelo Netflix do usuário importa sem confundir hyperlinks com imagens externas',async({page})=>{
 test.skip(!process.env.STORAGE_LAB_PPTX_TEST_FILE,'Defina o caminho do arquivo real para a validação local.');test.setTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#import-slides-file').setInputFiles(process.env.STORAGE_LAB_PPTX_TEST_FILE);await expect(page.locator('.outline-item')).toHaveCount(14,{timeout:110000});await expect(page.locator('.slide-designer')).toBeVisible();await page.locator('[data-studio-action=select-slide][data-index="1"]').click();await page.screenshot({path:'test-results/netflix-editable-slide.png',animations:'disabled'});expect(errors).toEqual([]);
});
test('efeito por clique avança a animação antes de trocar de slide',async({page})=>{
 await page.goto('/');await page.locator('#import-slides-file').setInputFiles({name:'animado.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await pptxFixture(true)});await expect(page.locator('.outline-item')).toHaveCount(2,{timeout:60000});await page.goto('/?page=preview&lesson='+await page.evaluate(()=>history.state.editor.id));
 const body=page.locator('.canvas-presenting [data-object-id="pptx-3"]');await expect(body).toHaveCSS('opacity','0');await page.locator('[data-action=next-slide]').click();await expect(page.locator('#document-page')).toHaveValue('0');await expect(body).toHaveCSS('opacity','1');await page.locator('[data-action=next-slide]').click();await expect(page.locator('#document-page')).toHaveValue('1');
});

test('PPTX editável exportado como JSON abre com objetos e mídia em outro navegador',async({page,browser})=>{
 await page.goto('/');await page.locator('#import-slides-file').setInputFiles({name:'portatil.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await pptxFixture(true)});await expect(page.locator('.outline-item')).toHaveCount(2,{timeout:60000});
 await page.getByLabel('Mais opções da aula',{exact:true}).click();const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar JSON',exact:true}).click();const download=await waiting,json=JSON.parse(await readFile(await download.path(),'utf8'));
 expect(json.slides[0].elements.some(e=>e.type==='text')).toBe(true);expect(json.slides[0].elements.find(e=>e.type==='image').image).toMatch(/^data:image\//);expect(json.slides[0].animations.length).toBeGreaterThan(0);
 const context=await browser.newContext(),other=await context.newPage();try{await other.goto('/');await other.locator('#import-lesson-file').setInputFiles({name:'portatil.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(json))});await expect(other.locator('.canvas-object[data-type=text]')).toHaveCount(2);await expect.poll(()=>other.locator('.canvas-object img').first().evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);}finally{await context.close();}
});
