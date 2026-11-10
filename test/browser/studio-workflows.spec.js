import {test,expect} from '@playwright/test';
import {mockAccounts} from './auth-fixture.js';
import {createProject} from './project-fixture.js';
import {newLesson,newSlide} from '../../src/lessons.js';
import {newElement} from '../../src/canvas-data.js';

import QRCode from 'qrcode';
const cover={name:'referencia.png',mimeType:'image/png',buffer:await QRCode.toBuffer('Foto de referência',{width:180})};

test('cria aula com capa enquadrada, troca de forma e salva no mesmo projeto',async({page})=>{
 await page.goto('/');
 await page.locator('.create-half').click();
 await page.getByLabel('Título da aula',{exact:true}).fill('Aula com capa');
 await page.getByLabel('Descrição',{exact:true}).fill('Descrição da nova aula.');
 await page.locator('[data-lesson-cover-file]').setInputFiles(cover);
 await page.getByRole('button',{name:'Usar capa'}).click({timeout:6000});
 await expect(page.locator('.lesson-cover-preview')).toBeVisible();
 await page.getByRole('button',{name:'Criar aula',exact:true}).click();
 const save=page.getByRole('button',{name:'Salvar aula',exact:true});
 await expect(save).toHaveText('Salvo');
 await page.locator('[data-designer-action=shape]').click();
 await page.getByRole('button',{name:'Triângulo'}).click();
 await expect(page.locator('.designer-stage .canvas-shape-path polygon')).toHaveCount(1);
 await page.getByLabel('Largura da borda').fill('12');
 await page.getByLabel('Curvatura').fill('30');
 await expect(page.locator('.designer-stage .canvas-shape-path path')).toHaveAttribute('stroke-width','3');
 await expect(save).toHaveText('Salvar');
 await page.locator('.designer-stage [data-type=shape]').press('Delete');
 await expect(page.locator('.designer-stage .canvas-shape-path')).toHaveCount(0);
 await page.locator('[data-designer-action=shape]').click();
 await page.getByRole('button',{name:'Desenhar forma',exact:true}).click();
 const drawing=page.getByLabel('Área para desenhar');
 for(const position of [{x:70,y:30},{x:170,y:110},{x:110,y:150}])await drawing.click({position});
 await page.getByRole('button',{name:'Adicionar forma',exact:true}).click();
 await expect(page.locator('.designer-stage .canvas-shape-path polygon')).toHaveCount(1);
 await save.click();
 await page.getByRole('button',{name:'Voltar',exact:true}).click();
 const card=page.locator('.lesson-card').filter({hasText:'Aula com capa'});
 await expect(card.locator('.lesson-cover-image')).toHaveJSProperty('naturalWidth',480);
 await card.getByLabel('Mais opções: Aula com capa').click();
 await expect(card.getByRole('button',{name:'Trocar capa',exact:true})).toBeVisible();
 await expect(card.getByRole('button',{name:'Prévia',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Compartilhados',exact:true}).click();
 await expect(page).toHaveURL(/page=shared/);
 await expect(page.getByRole('heading',{name:'Compartilhados'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Minha biblioteca'})).toHaveCount(0);
});

test('Storage AI recebe foto e cria slides nativos e só modifica o elemento selecionado',async({page})=>{
 await mockAccounts(page);
 await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai/history',r=>r.fulfill({json:{sessions:[]}}));
 await page.route('https://storage-lab-files.lagujf.workers.dev/lessons',r=>r.fulfill({json:[]}));
 await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',r=>{
  const input=r.request().postDataJSON();
  expect(r.request().headers().authorization).toContain('Bearer ');
  if(input.mode==='create'){
   expect(input.photos[0]).toMatch(/^data:image\/jpeg;base64,/);
   return r.fulfill({json:{title:'Aula com IA',description:'Criação nativa',slides:[{title:'Armazenamento',body:'HDD e SSD guardam dados.',photo:0,theme:'ocean'}]}});
  }
  const {target,elements}=input.context;
  expect(target).toBe(elements.find(element=>element.type==='text'&&element.text==='Armazenamento').id);
  const body=elements.find(element=>element.type==='text'&&element.text==='HDD e SSD guardam dados.');
  return r.fulfill({json:{reply:'Título revisado.',changes:[{id:target,text:'Armazenamento digital'},{id:body.id,text:'Não deve alterar'}]}});
 });
 await page.goto('/');
 await page.getByRole('button',{name:'Criar slides com IA',exact:true}).click();
 await expect(page).toHaveURL(/page=storage-ai/);
 const dialog=page.locator('.storage-ai-page');
 await dialog.getByRole('button',{name:'Modo instantâneo'}).click();
 await dialog.getByLabel('Mensagem para Storage AI').fill('Crie uma aula sobre armazenamento.');
 await dialog.getByRole('button',{name:'Quantidade de slides'}).click();
 await dialog.getByLabel('Slides',{exact:true}).fill('1');
 await dialog.locator('input[type=file]').setInputFiles(cover);
 await dialog.getByRole('button',{name:'Enviar mensagem',exact:true}).click();
 await dialog.getByRole('button',{name:'Abrir no editor'}).click();
 await expect(page.locator('.editor-title')).toHaveText('Aula com IA');
 await expect(page.locator('.designer-stage img')).toHaveJSProperty('complete',true);
 await page.getByRole('button',{name:/^\d+ · Armazenamento$/}).click();
 await page.getByRole('button',{name:'Storage AI',exact:true}).click();
 await page.getByRole('button',{name:'Usar seleção',exact:true}).click();
 await page.getByLabel('Pedido para Storage AI').fill('Ajuste o título.');
 await page.locator('#storage-ai-edit').getByRole('button',{name:'Enviar pedido'}).click();
 await expect(page.locator('.designer-stage')).toContainText('Armazenamento digital');
 await expect(page.locator('.designer-stage')).toContainText('HDD e SSD guardam dados.');
 await expect(page.locator('.storage-ai-messages')).toContainText('Título revisado.');
 await page.getByRole('button',{name:'Salvar aula',exact:true}).click();
 await page.getByRole('button',{name:'Voltar',exact:true}).click();
 await expect(page.locator('.lesson-card').filter({hasText:'Aula com IA'}).getByLabel(/Gerada por IA/)).toBeVisible();
});

test('entrada móvel mostra controles lado a lado e usa a conta quando logada',async({page})=>{
 await page.setViewportSize({width:375,height:667});
 await page.goto('/?page=join');
 const tools=page.locator('.join-utilities button');
 await expect(tools).toHaveCount(3);
 const heights=await tools.evaluateAll(buttons=>buttons.map(b=>b.getBoundingClientRect().top));
 expect(new Set(heights).size).toBe(1);
 expect(await page.getByRole('button',{name:'Entrar na sala',exact:true}).evaluate(b=>b.getBoundingClientRect().bottom)).toBeLessThanOrEqual(667);
 await mockAccounts(page);
 await page.reload();
 await expect(page.getByLabel('Como podemos chamar você?')).toHaveValue('Ana');
 await expect(tools).toHaveCount(1);
 await expect(page.locator('.avatar-picker')).toHaveCount(0);
});


test('música aceita 0% e 100% e pausa no primeiro clique', async ({page})=>{
 const wav=Buffer.alloc(44+44100*2*3);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
 wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
 wav.writeUInt32LE(44100,24);wav.writeUInt32LE(88200,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
 wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 await page.route('https://**.vgmtreasurechest.com/**',route=>route.fulfill({contentType:'audio/wav',body:wav}));
 await page.goto('/');await createProject(page);
 await page.getByRole('button',{name:'Abrir músicas do editor'}).click();
 const slider=page.getByRole('slider',{name:'Volume'}),audio=page.locator('[data-editor-soundtrack]');
 await expect(slider).toHaveValue('0.35');
 const spotify=page.getByRole('button',{name:'Spotify',exact:true});
 const upload=page.locator('.music-upload');
 const row=await spotify.boundingBox(), uploadRow=await upload.boundingBox(), volumeRow=await slider.boundingBox();
 expect(row.y).toBeGreaterThan(volumeRow.y);
 expect(Math.abs(row.y-uploadRow.y)).toBeLessThan(3);
 for(const value of [0,1]){
  await slider.evaluate((input,value)=>{input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await expect(audio).toHaveJSProperty('volume',value);
 }
 const play=page.locator('[data-music-play]');
 if(await audio.evaluate(node=>node.paused))await play.click();
 await expect(audio).toHaveJSProperty('paused',false);
 await play.click();
 await expect(audio).toHaveJSProperty('paused',true);
 await expect(spotify).toBeVisible();
});

test('apresenta a partir do slide selecionado, toca a animação e mantém o áudio entre slides',async({page})=>{
 const wav=Buffer.alloc(44+8000*2*12);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
 wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
 wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
 wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 const lesson=newLesson();
 lesson.slides=['Primeiro','Segundo','Terceiro'].map(title=>({...newSlide(),title,kind:'canvas',elements:[newElement('text',{id:'heading',role:'title',text:title})]}));
 lesson.slides[1].audio={data:'data:audio/wav;base64,'+wav.toString('base64'),name:'Faixa',loop:false};
 await page.goto('/?localSignal');
 await page.locator('#import-lesson-file').setInputFiles({name:'aula.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(lesson))});
 await page.locator('.outline-item').nth(1).click();
 await page.locator('.designer-stage .slide-canvas').click({position:{x:3,y:3}});
 await page.getByLabel('Continuar ao avançar de slide').check();
 await page.getByLabel('Velocidade',{exact:true}).fill('0.8');
 await page.getByLabel('Velocidade',{exact:true}).press('Tab');
 await page.locator('[data-designer-action=select]').first().click();
 await page.locator('summary[aria-label="Animação do elemento"]').click();
 await page.locator('[data-element-animation="effect"]').selectOption('fadeIn');
 await page.locator('[data-element-animation="start"]').selectOption('next');
 await page.locator('[data-element-animation="group"]').fill('3');
 await page.locator('[data-element-animation="group"]').press('Tab');
 await expect(page.getByRole('button',{name:'Prévia',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Apresentar ↗',exact:true}).click();
 await page.getByRole('button',{name:'Fechar convite'}).click();
 const picker=page.getByLabel('Ir para página');
 await expect(picker).toHaveValue('1');
 const title=page.locator('.document-stage [data-object-id=heading]');
 await expect(title).toHaveCSS('opacity','0');
 const player=page.locator('audio[data-soundtrack]');
 await expect(player).toHaveJSProperty('playbackRate',.8);
 await expect(player).toHaveJSProperty('paused',false);
 await expect.poll(()=>player.evaluate(a=>a.currentTime)).toBeGreaterThan(.15);
 const before=await player.evaluate(a=>a.currentTime);
 await page.keyboard.press('ArrowRight');
 await expect(picker).toHaveValue('1');
 await expect(title).toHaveCSS('opacity','1');
 await page.keyboard.press('ArrowRight');
 await expect(picker).toHaveValue('2');
 expect(await player.evaluate(a=>a.currentTime)).toBeGreaterThan(before);
 await expect(player).toHaveJSProperty('paused',false);
 await page.reload();
 await expect(picker).toHaveValue('2');
 await expect(page.locator('.studio-editor')).toHaveCount(0);
});
