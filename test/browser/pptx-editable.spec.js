import {test,expect} from '@playwright/test';
import {pptxFixture} from '../document-fixtures.js';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
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

test('baixa o slide aberto como PNG e a aula como PPTX',async({page})=>{
 await page.goto('/');
 await page.locator('#import-slides-file').setInputFiles({name:'imagem.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await pptxFixture()});
 await expect(page.locator('.outline-item')).toHaveCount(2,{timeout:60000});
 await page.getByLabel('Baixar apresentação',{exact:true}).click();
 const [download]=await Promise.all([
   page.waitForEvent('download'),
   page.getByRole('button',{name:'Baixar PNG deste slide'}).click()
 ]);
 expect(download.suggestedFilename()).toMatch(/\.png$/);
 const image=await readFile(await download.path());
 expect(image.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 const exportMenu=page.getByLabel('Baixar apresentação',{exact:true});
 if(!await page.getByRole('button',{name:'Baixar PPTX',exact:true}).isVisible())await exportMenu.click();
 const [presentation]=await Promise.all([
   page.waitForEvent('download'),
   page.getByRole('button',{name:'Baixar PPTX',exact:true}).click()
 ]);
 expect(presentation.suggestedFilename()).toMatch(/\.pptx$/);
 const archive=await readFile(await presentation.path());
 expect(archive.subarray(0,4).toString('hex')).toBe('504b0304');
 expect(archive.includes(Buffer.from('ppt/slides/slide2.xml'))).toBe(true);
});

test('PPTX editável exportado como JSON abre com objetos e mídia em outro navegador',async({page,browser})=>{
 await page.goto('/');await page.locator('#import-slides-file').setInputFiles({name:'portatil.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await pptxFixture(true)});await expect(page.locator('.outline-item')).toHaveCount(2,{timeout:60000});
 await page.getByLabel('Mais opções da aula',{exact:true}).click();const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar JSON',exact:true}).click();const download=await waiting,json=JSON.parse(await readFile(await download.path(),'utf8'));
 expect(json.slides[0].elements.some(e=>e.type==='text')).toBe(true);expect(json.slides[0].elements.find(e=>e.type==='image').image).toMatch(/^data:image\//);expect(json.slides[0].animations.length).toBeGreaterThan(0);
 const context=await browser.newContext(),other=await context.newPage();try{await other.goto('/');await other.locator('#import-lesson-file').setInputFiles({name:'portatil.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(json))});await expect(other.locator('.canvas-object[data-type=text]')).toHaveCount(2);await expect.poll(()=>other.locator('.canvas-object img').first().evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);}finally{await context.close();}
});
test('arquivo cyberbuli oferece substituição de fontes e mantém onze páginas',async({page})=>{
 test.skip(!existsSync('C:/Users/jonat/Downloads/cyberbuli.pptx'));test.setTimeout(120000);
 await page.addInitScript(()=>Object.defineProperty(navigator,'onLine',{get:()=>false}));
 await page.goto('/');await page.locator('#import-slides-file').setInputFiles('C:/Users/jonat/Downloads/cyberbuli.pptx');
 const dialog=page.locator('.pptx-font-dialog');await expect(dialog).toBeVisible({timeout:30000});await expect(dialog.locator('select')).not.toHaveCount(0);
 await dialog.getByRole('button',{name:'Aplicar em todos os slides'}).click();await expect(page.locator('.outline-item')).toHaveCount(11,{timeout:90000});
 await page.setViewportSize({width:1360,height:650});
 const outline=page.locator('.editor-outline');
 const bottom=await outline.evaluate(node=>{node.scrollTop=node.scrollHeight;return node.scrollTop;});
 expect(bottom).toBeGreaterThan(0);
 await page.locator('[data-studio-action=select-slide][data-index="9"]').click();
 await expect.poll(()=>outline.evaluate(node=>node.scrollTop)).toBe(bottom);
 await expect(page.locator('.designer-inspector .slide-activities')).toBeVisible();await page.screenshot({path:'test-results/cyberbuli-import-review.png'});
});

test('controles laterais permanecem fixos e atividades sobrevivem à seleção',async({page})=>{
 await page.goto('/');await page.locator('#import-slides-file').setInputFiles({name:'editor.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await pptxFixture()});await expect(page.locator('.outline-item')).toHaveCount(2,{timeout:60000});
 await page.locator('.designer-stage-wrap').click({position:{x:3,y:3}});
 const tabs=page.locator('.slide-settings-tabs > button');await expect(tabs).toHaveCount(3);const before=await tabs.nth(2).boundingBox();await tabs.nth(2).click();const after=await tabs.nth(2).boundingBox();expect(after.x).toBeCloseTo(before.x,0);expect(after.y).toBeCloseTo(before.y,0);
 await expect(page.locator('.slide-setting-panel [data-audio-upload="slide"]')).toBeAttached();
 await expect(page.locator('.designer-inspector .slide-activities')).toBeVisible();await page.locator('[data-designer-action=select]').last().click();await expect(page.locator('.designer-inspector .slide-activities')).toBeVisible();
 const overflow=await page.locator('.designer-stage-wrap').evaluate(e=>getComputedStyle(e).overflow);expect(overflow).toBe('hidden');
});
test('menus do editor são exclusivos e as ferramentas se alinham ao slide',async({page})=>{
 await page.setViewportSize({width:1360,height:730});
 await page.goto('/');
 await page.locator('#import-slides-file').setInputFiles({name:'menu.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await pptxFixture()});
 const sharing=page.locator('.editor-sharing'),insert=page.locator('.designer-insert-more');
 await sharing.locator('summary').click();
 await expect(sharing.getByRole('button',{name:'Compartilhar',exact:true})).toBeVisible();
 await insert.locator('summary').click();
 await expect(sharing).not.toHaveAttribute('open','');
 await expect(insert.getByRole('button',{name:'Buscar imagens'})).toBeVisible();
 const stage=await page.locator('.designer-stage').boundingBox();
 const tools=await page.locator('.designer-toolbar').boundingBox();
 expect(Math.abs((stage.x+stage.width/2)-(tools.x+tools.width/2))).toBeLessThan(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1360);
});
test('pausar durante carregamento não permite reprodução atrasada',async({page})=>{
 await page.goto('/');const state=await page.evaluate(async()=>{const {EditorMusic}=await import('/src/editor-music.js');const root=document.createElement('div');document.body.append(root);const music=new EditorMusic({root,callbacks:{render(){},toast(){}}});music.editing=true;music.paint=()=>{};let release;music.audio.play=()=>new Promise(resolve=>release=resolve);music.wantsPlay=true;const pending=music.playFile();await music.action('toggle');release();await pending;const result={wanted:music.wantsPlay,playing:music.playing,paused:music.audio.paused};music.audio.remove();root.remove();return result;});expect(state).toEqual({wanted:false,playing:false,paused:true});
});
test('reorganiza animações de objetos na lateral',async({page})=>{
 await page.goto('/');
 await page.locator('#import-slides-file').setInputFiles({name:'animado.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await pptxFixture(true)});
 await expect(page.locator('.outline-item')).toHaveCount(2);
 await page.locator('.designer-stage-wrap').click({position:{x:3,y:3}});
 const timeline=page.locator('.designer-timeline');
 await timeline.locator('summary').click();
 await expect(timeline.locator('li')).not.toHaveCount(0);
 await expect(timeline.locator('li').first()).toContainText('Clique');
 await expect(page.locator('[data-designer-action=setting-theme] svg path')).toHaveAttribute('d', /^M12 3/);
 await expect(page.locator('.slide-activities')).not.toContainText('Adicionar enquete a este slide');
});
test('busca manual mostra resultados do Commons quando Openverse falha',async({page})=>{
 await page.route('https://api.openverse.org/**',route=>route.fulfill({status:429}));
 await page.route('https://commons.wikimedia.org/w/api.php?**',route=>{
   const name=new URL(route.request().url()).searchParams.get('gsroffset')==='0'?'Jimin':'Jimin 2';
   return route.fulfill({json:{query:{pages:[{title:'File:'+name+'.jpg',imageinfo:[{thumburl:'https://upload.wikimedia.org/test.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:'+name+'.jpg',extmetadata:{LicenseShortName:{value:'CC0'}}}]}]}}});
 });
 await page.route('https://upload.wikimedia.org/test.jpg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>'}));
 await page.goto('/');
 await page.locator('#import-slides-file').setInputFiles({name:'busca.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await pptxFixture()});
 await expect(page.locator('.outline-item')).toHaveCount(2);
 await page.locator('[data-designer-action=select]').first().click();
 await page.getByRole('button',{name:'Pesquisar imagem livre'}).click();
 await page.getByRole('searchbox').fill('jimin');
 await page.getByRole('button',{name:'Pesquisar',exact:true}).click();
 await expect(page.locator('.image-search-choice')).toContainText('Jimin.jpg');
 await page.getByRole('button',{name:'Carregar mais imagens'}).click();
 await expect(page.locator('.image-search-choice .image-search-title')).toHaveText(['Jimin.jpg','Jimin 2.jpg']);
  // Cada resultado mostra a origem e a licença da imagem.
  await expect(page.locator('.image-search-choice').first()).toContainText('Wikimedia Commons');
  await expect(page.locator('.image-search-choice').first()).toContainText('CC0');
});
test('busca de logotipo ignora marcas de outro assunto',async({page})=>{
 await page.route('https://commons.wikimedia.org/w/api.php?**',route=>route.fulfill({json:{query:{pages:[]}}}));
 await page.route('https://api.openverse.org/**',route=>route.fulfill({json:{results:[
  {title:"Majora’s Mask Logo",thumbnail:'https://example.com/zelda.jpg',foreign_landing_url:'https://example.com/zelda',license:'cc0'},
  {title:'ChatGPT Logo',thumbnail:'https://example.com/chatgpt.jpg',foreign_landing_url:'https://example.com/chatgpt',license:'cc0'}
 ]}}));
 await page.goto('/');
 const titles=await page.evaluate(async()=> (await (await import('/src/storage-ai-image-search.js')).searchImageChoices('ChatGPT logo')).map(choice=>choice.title));
 expect(titles).toEqual(['ChatGPT Logo']);
});
test('PPTX mantém a camada de uma imagem girada na frente do texto',async({page})=>{
 const pptx=await import('@office-kit/pptx');
 const deck=pptx.createPresentation();
 const slide=pptx.addBlankSlide(deck);
 pptx.addSlideTextBox(slide,{x:pptx.inches(2),y:pptx.inches(1),w:pptx.inches(4),h:pptx.inches(2),text:'Texto atrás da imagem'});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
 const photo=pptx.addSlideImage(slide,png,{x:pptx.inches(2),y:pptx.inches(2),w:pptx.inches(4),h:pptx.inches(.5),format:'png',name:'Imagem girada'});
 pptx.setShapeRotation(photo,90);
 await page.goto('/');
 await page.locator('#import-slides-file').setInputFiles({name:'camadas.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:Buffer.from(await pptx.savePresentation(deck))});
 const canvas=page.locator('.designer-stage .slide-canvas');
 await expect(canvas.locator('.canvas-text')).toContainText('Texto atrás da imagem');
 const image=canvas.getByRole('group',{name:'Elemento: Imagem girada'});
 await expect(image).toBeVisible();
 const bounds=await image.boundingBox();
 expect(bounds.height).toBeGreaterThan(bounds.width*3);
 expect(await image.evaluate(node=>node.previousElementSibling?.dataset.type)).toBe('text');
});
