import {createProject} from './project-fixture.js';
import {test,expect} from '@playwright/test';
import {ids,mockAccounts as accounts} from './auth-fixture.js';

test('estilo do perfil também alcança controles do player, ações do slide, menus e fechar diálogos',async({page})=>{
 await accounts(page);await page.route('https://**.vgmtreasurechest.com/**',r=>r.fulfill({status:204}));await page.goto('/');await createProject(page);
 for(const [style,radius] of [['classic','10px'],['glass','999px'],['aero','999px'],['minimal','4px']]){
  await page.getByRole('button',{name:'Ana',exact:true}).click();await page.getByRole('button',{name:/Editar perfil/}).click();await page.getByLabel('Estilo do meu espaço',{exact:true}).selectOption(style);await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-ui-style',style);
  await expect(page.getByRole('button',{name:'Fechar conta',exact:true})).toHaveCSS('border-radius','50%');const closeBox=await page.getByRole('button',{name:'Fechar conta',exact:true}).boundingBox();expect(closeBox.width).toBeCloseTo(closeBox.height,2);await page.getByRole('button',{name:'Fechar conta',exact:true}).click();
  for(const selector of ['[data-music-action=next]','[data-designer-action=add-text]','[data-studio-action=delete-slide]','.editor-more summary'])await expect(page.locator(selector)).toHaveCSS('border-radius',radius);
  if(style==='classic'){const tab=page.getByRole('tab',{name:/Slides/});await expect(tab).toHaveCSS('height','34px');await expect(tab).toHaveCSS('padding-left','14px');}
  if(style==='glass'){await expect(page.locator('[data-music-action=next]')).toHaveCSS('backdrop-filter','blur(16px) saturate(1.7)');}
  await page.screenshot({path:'test-results/workspace-style-'+style+'.png',animations:'disabled'});
  if(style==='glass'||style==='aero'){await page.getByRole('button',{name:'Ana',exact:true}).click();await page.getByLabel('Aparência do site',{exact:true}).selectOption('dark');await page.getByRole('button',{name:'Fechar conta',exact:true}).click();await page.screenshot({path:'test-results/workspace-style-'+style+'-dark.png',animations:'disabled'});await page.getByRole('button',{name:'Ana',exact:true}).click();await page.getByLabel('Aparência do site',{exact:true}).selectOption('light');await page.getByRole('button',{name:'Fechar conta',exact:true}).click();}
  const background=await page.locator('[data-music-action=next]').evaluate(e=>getComputedStyle(e).backgroundImage);expect(background.includes('linear-gradient')).toBe(style==='aero'||style==='glass');
  await page.getByRole('button',{name:'Colaborar',exact:true}).click();await expect(page.getByRole('button',{name:'Fechar colaboração',exact:true})).toHaveCSS('border-radius','50%');await page.getByRole('button',{name:'Fechar colaboração',exact:true}).click();
 }
});
test('perfil tem cores e estilos; adicionar e trocar contas preserva sessões e preferências',async({page})=>{
  const users=await accounts(page);await page.goto('/');const initialButtonColor=await page.locator('.lesson-card .card-edit').first().evaluate(el=>getComputedStyle(el).backgroundColor);await page.getByRole('button',{name:'Ana',exact:true}).click();
  await expect(page.locator('.account-dialog')).not.toContainText('SEU ESPAÇO DE ENSINO');await page.getByRole('button',{name:/Editar perfil/}).click();
  await expect(page.locator('.account-appearance')).toHaveCount(0);await expect(page.locator('.account-dialog footer [data-account-action=account]')).toHaveCount(0);
  await expect(page.locator('[data-profile-theme]')).toHaveCount(8);await page.getByRole('button',{name:'Cor Rosa',exact:true}).click();
  await page.getByLabel('Estilo do meu espaço',{exact:true}).selectOption('glass');await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();
  const secondContext=await page.context().browser().newContext();try{const second=await secondContext.newPage(),remote=await accounts(second);remote[0].user_metadata={...users[0].user_metadata};await second.goto('/');await expect(second.locator('html')).toHaveAttribute('data-ui-style','glass');await expect(second.locator('html')).toHaveAttribute('data-theme','rose');}finally{await secondContext.close();}
  await expect(page.locator('html')).toHaveAttribute('data-ui-style','glass');await expect(page.locator('html')).toHaveAttribute('data-theme','rose');expect(users[0].user_metadata.ui_style).toBe('glass');expect(await page.locator('.lesson-card .card-edit').first().evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(initialButtonColor);
  await page.getByRole('button',{name:'+ Adicionar outra conta',exact:true}).click();await page.getByLabel('E-mail',{exact:true}).fill('bia@example.com');await page.getByLabel('Senha',{exact:true}).fill('temporary-password');await page.getByRole('button',{name:'Entrar na conta',exact:true}).click();
  await expect(page.locator('[data-account-profile]')).toContainText('Bia');await expect(page.locator('.account-switch-row')).toHaveCount(2);
  await page.locator(`[data-account-action=switch-account][data-uid="${ids[0]}"]`).click();await expect(page.locator('[data-account-profile]')).toContainText('Ana');await expect(page.locator('html')).toHaveAttribute('data-ui-style','glass');
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('temporary-password');await page.reload();await expect(page.locator('[data-account-profile]')).toContainText('Ana');await expect(page.locator('html')).toHaveAttribute('data-theme','rose');
  await page.getByRole('button',{name:'Ana',exact:true}).click();await page.getByRole('button',{name:/Editar perfil/}).click();await page.screenshot({path:'test-results/profile-style.png',animations:'disabled'});
});
test('imagem do slide amplia acima de 4×, arrasta dentro da moldura e conserva enquadramento depois de recarregar',async({page})=>{
  await page.goto('/');await createProject(page);await page.locator('[data-designer-action=image]').click();
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=300;const x=c.getContext('2d');x.fillStyle='#4a82ad';x.fillRect(0,0,400,300);x.fillStyle='#efb888';x.fillRect(140,70,100,160);return c.toDataURL().split(',')[1];});
  await page.locator('#designer-image-file').setInputFiles({name:'imagem.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.getByRole('button',{name:'Enquadrar imagem',exact:true}).click();
  for(let i=0;i<8;i++)await page.getByRole('button',{name:'Aumentar zoom da imagem',exact:true}).click();
  expect(parseInt(await page.locator('.image-crop-controls output').textContent())).toBeGreaterThan(400);
  const object=page.locator('.canvas-object[data-type=image]'),before=await object.evaluate(el=>({left:el.style.left,top:el.style.top})),box=await object.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2+100,{steps:8});await page.mouse.up();
  expect(await object.evaluate(el=>({left:el.style.left,top:el.style.top}))).toEqual(before);const transform=await object.locator('img').evaluate(el=>el.style.transform);expect(transform).not.toContain('translate(0%, 0%)');
  await page.getByRole('button',{name:'Salvar aula',exact:true}).click();await page.reload();await expect(page.locator('.canvas-object[data-type=image] img')).toBeVisible();
  expect(await page.locator('.canvas-object[data-type=image] img').evaluate(el=>el.style.transform)).toBe(transform);
  await page.locator('.canvas-object[data-type=image]').click();await page.getByRole('button',{name:'Enquadrar imagem',exact:true}).click();
  await object.scrollIntoViewIfNeeded();let frame=await object.boundingBox();await page.mouse.move(frame.x+frame.width/2,frame.y+frame.height/2);await page.mouse.wheel(0,-150);
  await expect.poll(()=>object.locator('img').evaluate(el=>el.style.transform)).not.toBe(transform);await page.getByRole('button',{name:'Desfazer',exact:true}).click();expect(await object.locator('img').evaluate(el=>el.style.transform)).toBe(transform);
  await page.setViewportSize({width:390,height:844});await object.scrollIntoViewIfNeeded();frame=await object.boundingBox();
  const touch=await page.context().newCDPSession(page);await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  const cx=frame.x+frame.width/2,cy=frame.y+frame.height/2,beforeZoom=parseInt(await page.locator('.image-crop-controls output').textContent());
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-10,y:cy,id:1},{x:cx+10,y:cy,id:2}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-22,y:cy,id:1},{x:cx+22,y:cy,id:2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(async()=>parseInt(await page.locator('.image-crop-controls output').textContent())).toBeGreaterThan(beforeZoom*1.5);
  await page.screenshot({path:'test-results/slide-image-crop.png',animations:'disabled'});
});

test('troca imagem e conserva fundo, ajuste e tamanho da moldura', async ({ page }) => {
  await page.goto('/');
  await createProject(page);
  const upload = page.locator('#designer-image-file');
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 20;
    return canvas.toDataURL().split(',')[1];
  });
  const image = { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') };
  await page.locator('[data-designer-action=image]').click();
  await upload.setInputFiles(image);
  const object = page.locator('.canvas-object[data-type=image]');
  await expect(object).toHaveCount(1);
  await page.getByRole('button', { name: 'Trocar imagem', exact: true }).click();
  await upload.setInputFiles({ ...image, name: 'nova.png' });
  await expect(object).toHaveCount(1);
  await page.getByRole('button', { name: 'Diminuir zoom da imagem' }).click();
  await expect(page.locator('.image-crop-controls output')).toHaveText('80%');
  await page.getByLabel('Deslocamento Y (%)').fill('-125');
  await page.getByLabel('Ajuste na moldura').selectOption('fill');
  await page.getByRole('button', { name: 'Fundo transparente' }).click();
  await page.getByLabel('Altura (%)').fill('4');
  await page.getByRole('button', { name: 'Salvar aula', exact: true }).click();
  await page.reload();
  await expect(object).toHaveCSS('height', /.+px/);
  expect(await object.evaluate(node => node.style.height)).toBe('4%');
  await expect(object.locator('img')).toHaveCSS('object-fit', 'fill');
  await expect(object.locator('.canvas-image-window')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(await object.locator('img').evaluate(node => node.style.transform)).toBe('translate(0%, -125%) scale(0.8)');
});
