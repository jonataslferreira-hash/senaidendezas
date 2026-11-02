import {test,expect} from '@playwright/test';
test('editor abre no topo, sem navegação lateral nem metadados fixos; três pontos edita título e descrição',async({page})=>{
  await page.setViewportSize({width:1440,height:950});await page.goto('/');await page.locator('.lesson-card [data-studio-action=edit]').first().scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await page.locator('.lesson-card [data-studio-action=edit]').first().click();await expect(page.locator('.slide-designer')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await expect(page.locator('.studio-rail')).toHaveCount(0);
  await expect(page.locator('.editor-lesson-meta')).toHaveCount(0);await expect(page.locator('.collaboration-bar')).toHaveCount(0);
  await expect(page.locator('.editor-top-actions [data-group-action=share]')).toBeVisible();
  await page.getByLabel('Mais opções da aula',{exact:true}).click();await page.getByRole('button',{name:'Editar título e descrição',exact:true}).click();
  await page.getByLabel('Título da aula',{exact:true}).fill('Aula reorganizada');await page.getByLabel('Descrição',{exact:true}).fill('Descrição editada no menu.');
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(page.locator('.editor-title')).toHaveText('Aula reorganizada');
  await page.getByRole('button',{name:'Salvar aula',exact:true}).click();
  await page.screenshot({path:'test-results/editor-workspace.png',fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'← Voltar',exact:true}).click();await expect(page.locator('.lesson-card').first()).toContainText('Descrição editada no menu.');
  await page.locator('.lesson-card').first().locator('summary').click();await page.locator('.lesson-card').first().getByRole('button',{name:'Renomear',exact:true}).click();
  await expect(page.getByLabel('Descrição',{exact:true})).toHaveValue('Descrição editada no menu.');
});

test('Spotify aceita o link informado sem login e sem chamar o Worker de colaboração',async({page})=>{
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.route('https://open.spotify.com/oembed?*',route=>route.fulfill({json:{title:'ドタバタちょろゴンず',thumbnail_url:'https://image.example/cover.jpg'}}));
  await page.route('https://image.example/**',route=>route.fulfill({status:404}));
  await page.route('https://open.spotify.com/embed/iframe-api/v1',route=>route.fulfill({contentType:'application/javascript',body:`window.onSpotifyIframeApiReady({createController(host,options,callback){window.testSpotify=options.uri;host.textContent='Spotify';callback({addListener(event,fn){if(event==='ready')setTimeout(fn,0);},play(){},pause(){},togglePlay(){},loadUri(){}});}});`}));
  await page.goto('/');await page.locator('.create-half').click();await page.getByRole('button',{name:'Abrir músicas do editor'}).click();
  await expect(page.locator('.music-panel')).not.toContainText('Um ritmo para criar');await expect(page.locator('.music-panel')).not.toContainText('trilha sonora');
  await page.locator('#music-spotify').fill('https://open.spotify.com/intl-pt/track/05TXKw2pxqf8ETIUdvEy6C?si=afb6f2605e044be0');
  await page.getByRole('button',{name:'Adicionar',exact:true}).click();await expect(page.locator('.music-info strong')).toHaveText('ドタバタちょろゴンず');
  expect(requests.some(url=>url.includes('/music/spotify'))).toBe(false);await expect.poll(()=>page.evaluate(()=>window.testSpotify)).toBe('spotify:track:05TXKw2pxqf8ETIUdvEy6C');
});

test('limites visíveis, imagem além do slide, pop-ups acima do canvas e inspector com rolagem própria',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.locator('.create-half').click();
 const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=300;c.getContext('2d').fillRect(0,0,400,300);return c.toDataURL().split(',')[1];}),'base64');
 await page.locator('#designer-image-file').setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('.canvas-object[data-type=image]')).toHaveCount(1);
 await page.locator('[data-element-field=x]').fill('-20');await page.locator('[data-element-field=y]').fill('-10');await page.locator('[data-element-field=w]').fill('140');await page.locator('[data-element-field=h]').fill('130');
 await page.getByRole('button',{name:'Salvar aula',exact:true}).click();await page.reload();
 await page.locator('[data-designer-action=select]').last().click();await expect(page.locator('[data-element-field=x]')).toHaveValue('-20');await expect(page.locator('[data-element-field=w]')).toHaveValue('140');
 await page.getByLabel('Tema do slide',{exact:true}).selectOption('paper');
 const edge=await page.locator('.canvas-editing .slide-canvas').evaluate(e=>({edge:getComputedStyle(e,'::after').outlineColor,overflow:getComputedStyle(e).overflow,theme:e.dataset.visualTheme}));expect(edge.edge).toBe('rgb(17, 17, 17)');expect(edge.overflow).toBe('visible');expect(edge.theme).toBe('paper');
 expect(await page.locator('.designer-inspector').evaluate(e=>e.scrollHeight>e.clientHeight&&getComputedStyle(e).overflowY==='auto')).toBe(true);
 const title=await page.locator('.editor-title').boundingBox(),player=await page.locator('[data-editor-music]').boundingBox();expect(Math.abs((title.y+title.height/2)-(player.y+player.height/2))).toBeLessThan(25);
 await page.getByRole('button',{name:'♫ Áudio',exact:true}).click();await expect(page.locator('.slide-audio-popover')).toBeVisible();expect(await page.locator('.slide-audio-popover').evaluate(e=>e.matches(':popover-open'))).toBe(true);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Abrir músicas do editor'}).click();expect(await page.locator('.music-panel').evaluate(e=>e.matches(':popover-open'))).toBe(true);await page.getByRole('button',{name:'Fechar músicas',exact:true}).click();
 await expect(page.locator('.item-toolbar .save-state')).toBeVisible();await page.getByRole('button',{name:'Salvar aula',exact:true}).click();
 await page.screenshot({path:'test-results/editor-new-bounds.png',animations:'disabled'});
 await page.getByRole('button',{name:'▷ Prévia',exact:true}).click();expect(await page.locator('.canvas-presenting .slide-canvas').evaluate(e=>getComputedStyle(e).overflow)).toBe('hidden');
});

test('ferramentas centrais e slide inteiro visível sem rolar em telas baixas',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.locator('.create-half').click();
 const tools=await page.locator('.item-tools').boundingBox(),bar=await page.locator('.item-toolbar').boundingBox();expect(Math.abs(tools.x+tools.width/2-bar.x-bar.width/2)).toBeLessThan(3);
 const number=await page.locator('.item-number').boundingBox(),actions=await page.locator('.item-actions').boundingBox();expect(number.x).toBeLessThan(tools.x);expect(actions.x).toBeGreaterThan(tools.x+tools.width);
 for(const size of [{width:1280,height:720},{width:1700,height:813},{width:1440,height:900}]){
  await page.setViewportSize(size);await expect.poll(()=>page.locator('.designer-stage-wrap').evaluate(e=>e.clientHeight)).toBeGreaterThan(100);
  const result=await page.locator('.designer-stage-wrap').evaluate(e=>{e.scrollTop=0;const frame=e.querySelector('.slide-canvas').getBoundingClientRect(),wrap=e.getBoundingClientRect();return {top:frame.top,start:wrap.top,bottom:frame.bottom,limit:wrap.bottom,ratio:frame.width/frame.height,documentHeight:document.documentElement.scrollHeight,viewport:innerHeight};});
  expect(result.top).toBeGreaterThanOrEqual(result.start);expect(result.bottom).toBeLessThanOrEqual(result.limit+1);expect(result.ratio).toBeCloseTo(16/9,2);expect(result.documentHeight).toBeLessThanOrEqual(result.viewport+1);
  await page.locator('.designer-inspector').evaluate(e=>e.scrollTop=e.scrollHeight);expect(await page.locator('.designer-inspector').evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
 }
 await page.screenshot({path:'test-results/editor-fit-slide.png',animations:'disabled'});
});
