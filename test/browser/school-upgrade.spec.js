import {createProject} from './project-fixture.js';
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import * as pptx from '@office-kit/pptx';
import QRCode from 'qrcode';
import {newLesson,newQuestion} from '../../src/lessons.js';
import {newElement} from '../../src/canvas-data.js';
import {mockAccounts} from './auth-fixture.js';
const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');

test('PDF com imagem mantém a proporção e a capa após atualizar a biblioteca', async ({page}) => {
 await mockAccounts(page);
 await page.route('https://storage-lab-files.lagujf.workers.dev/lessons', route=>route.fulfill({json:[]}));
 await page.goto('/');
 const png=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=8;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ca2255';ctx.fillRect(0,0,8,8);
  return canvas.toDataURL();
 });
 const pdf=await PDFDocument.create();
 const documentPage=pdf.addPage([300,400]);
 documentPage.drawImage(await pdf.embedPng(png),{x:0,y:0,width:300,height:400});
 documentPage.drawText('PDF com imagem',{x:20,y:370});
 await page.locator('#import-slides-file').setInputFiles({name:'pagina-com-imagem.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});
 const image=page.locator('.designer-stage img');
 await expect(image).toHaveJSProperty('naturalHeight',1920);
 const rgb=await image.evaluate(img=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
  const ctx=canvas.getContext('2d');ctx.drawImage(img,img.naturalWidth/2,img.naturalHeight/2,1,1,0,0,1,1);
  return [...ctx.getImageData(0,0,1,1).data];
 });
 expect(rgb[0]).toBeGreaterThan(180);
 expect(rgb[1]).toBeLessThan(55);
 const bounds=await page.locator('.designer-stage').boundingBox();
 expect(bounds.width/bounds.height).toBeCloseTo(.75,1);
 await page.getByRole('button',{name:'Voltar',exact:true}).click();
 await page.getByRole('button',{name:'Recarregar aulas',exact:true}).click();
 await expect(page.locator('.imported-cover')).toHaveJSProperty('naturalWidth',1440);
});

test('editor guarda tema, layout e gradiente e solta as guias ao passar do centro', async ({page}) => {
 await page.setViewportSize({width:1100,height:660});
 await page.goto('/');
 await createProject(page);
 await page.locator('.designer-toolbar [data-style-picker="theme"]').click();
  await page.locator('.slide-style-menu:popover-open [data-style-value="ocean"]').click();
 await page.locator('.designer-toolbar [data-style-picker="layout"]').click();
  await page.locator('.slide-style-menu:popover-open [data-style-value="split"]').click();
 const stage=page.locator('.designer-stage .slide-canvas');
 await stage.click({position:{x:3,y:3}});
 await page.locator('.inspector-background summary').click();
 await expect(page.getByLabel('Preenchimento')).toHaveValue('theme');
 await page.getByLabel('Preenchimento').selectOption('gradient');
 await page.getByLabel('Cor final').fill('#f43f5e');
 await expect(stage).toHaveCSS('background-image',/linear-gradient.*244, 63, 94/);
 await page.getByRole('button',{name:'Salvar aula',exact:true}).click();
 await page.reload();
 await expect(page.locator('.designer-toolbar [data-style-value="ocean"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.designer-toolbar [data-style-value="split"]')).toHaveAttribute('aria-pressed','true');
 await expect(stage).toHaveCSS('background-image',/linear-gradient.*244, 63, 94/);
 await page.locator('[data-designer-action=shape]').click();await page.getByRole('button',{name:'Retângulo',exact:true}).click();
 const shape=stage.locator('[data-type=shape]'), box=await shape.boundingBox(), bounds=await stage.boundingBox();
 const x=box.x+box.width/2,y=box.y+box.height/2;
 const centerX=bounds.x+bounds.width/2, centerY=bounds.y+bounds.height/2;
 await page.mouse.move(x,y);
 await page.mouse.down();
 await page.mouse.move(centerX+3,centerY+3,{steps:4});
 await expect(stage.locator('.guide-x')).toBeVisible();
 await expect(stage.locator('.guide-y')).toBeVisible();
 await page.mouse.move(centerX+24,centerY+24,{steps:3});
 await expect(stage.locator('.guide-x')).toBeHidden();
 await page.mouse.up();
 const layers=await page.locator('.designer-layer-list').boundingBox();
 const activity=await page.locator('.slide-activities').boundingBox();
 expect(layers.y+layers.height).toBeLessThanOrEqual(activity.y);
 await page.screenshot({path:'test-results/editor-guides-layout.png'});
});
async function load(page,lesson){await page.goto('/?localSignal');await page.locator('#import-lesson-file').setInputFiles({name:'aula.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(lesson))});await expect(page.locator('.editor-title')).toContainText(lesson.title);}
async function present(page){await page.getByRole('button',{name:'Apresentar ↗',exact:true}).click();await expect(page.locator('.big-code')).toBeVisible();const code=(await page.locator('.big-code').innerText()).replace(/\s/g,'');await page.getByRole('button',{name:'Fechar convite',exact:true}).click();return code;}
async function fakeMicrophone(page){await page.addInitScript(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=constraints=>{if(!constraints.audio)return original(constraints);const context=new AudioContext(),osc=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();gain.gain.value=0;osc.connect(gain).connect(destination);osc.start();return Promise.resolve(destination.stream);};});}

test('fontes têm busca e prévia, seleção pode ser limpa e simulação é salva',async({page})=>{
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await page.goto('/');await createProject(page);await page.locator('.font-choose').click();await page.getByLabel('Buscar fonte',{exact:true}).fill('Bungee');await page.locator('.font-results [data-family="Bungee"]').click();await expect(page.locator('.canvas-text').first()).toHaveCSS('font-family',/Bungee/);
 await page.locator('.designer-stage-wrap').click({position:{x:5,y:5}});await expect(page.locator('.canvas-object[data-selected=true]')).toHaveCount(0);await expect(page.locator('.designer-help')).toHaveCount(0);await page.locator('[data-designer-action=simulation]').click();await page.getByLabel('Tipo de simulação').selectOption('neutralization');await expect(page.locator('.simulation-result')).toContainText('pH');await page.getByRole('button',{name:'Salvar aula',exact:true}).click();await page.reload();await expect(page.locator('[data-simulation=neutralization]')).toBeVisible();await page.screenshot({path:'test-results/school-simulation-editor.png',animations:'disabled'});
});

test('exporta PDF válido e PPTX com textos editáveis e gráficos incorporados',async({page})=>{
 test.setTimeout(120000);const lesson=newLesson();lesson.title='Exportação de teste';lesson.slides[0]={...lesson.slides[0],kind:'canvas',title:'Texto editável',elements:[newElement('text',{role:'title',text:'Texto editável no PowerPoint',x:7,y:10,w:80,h:25}),newElement('shape',{x:10,y:50,w:30,h:25,background:'#74bb9c'})]};await load(page,lesson);
 for(const format of ['PDF','PPTX']){await page.getByLabel('Mais opções da aula',{exact:true}).click();const waiting=page.waitForEvent('download',{timeout:30000}).catch(async()=>{throw Error(await page.locator('#toast').textContent());});await page.getByRole('button',{name:'Exportar '+format,exact:true}).click();const download=await waiting,buffer=await readFile(await download.path());if(format==='PDF'){const pdf=await PDFDocument.load(buffer);expect(pdf.getPageCount()).toBe(1);}else{const document=await pptx.loadPresentation(new Uint8Array(buffer)),slides=pptx.getSlides(document);expect(slides).toHaveLength(1);expect(pptx.getSlideShapes(slides[0]).map(pptx.getShapeText).join(' ')).toContain('Texto editável no PowerPoint');expect(pptx.getSlideShapes(slides[0]).some(s=>pptx.getShapeKind(s)==='picture')).toBe(true);}await expect(page.locator('.export-dialog')).toHaveCount(0);}
});

test('apresentar entra em tela cheia e a barra só aparece na região superior',async({page})=>{
 await load(page,newLesson());await present(page);await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);await page.mouse.move(600,500);await expect(page.locator('.document-top')).toHaveCSS('opacity','0');await page.mouse.move(150,24);await expect(page.locator('.document-top')).toHaveCSS('opacity','1');await page.mouse.move(600,400);await expect(page.locator('.document-top')).toHaveCSS('opacity','0');
});

test('quiz usa tela ampla e celular com botões; classificação vem depois e final tem personagens',async({page,browser})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const lesson=newLesson();lesson.title='Quiz novo';lesson.questions=[{...newQuestion(),text:'Qual alternativa está correta?'},{...newQuestion(),text:'Última pergunta'}];await load(page,lesson);await page.evaluate(()=>document.documentElement.dataset.appearance='dark');const code=await present(page),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),phone=await context.newPage();try{
  await phone.goto('/?localSignal&s='+code);await phone.getByLabel('Como podemos chamar você?').fill('Aluno');await phone.locator('[data-guest-photo]').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:await QRCode.toBuffer('Foto do participante',{width:96,margin:1})});await expect(phone.getByRole('button',{name:'Minha foto enviada',exact:true})).toBeVisible();await phone.getByRole('button',{name:'Entrar na sala',exact:true}).click();await page.mouse.move(150,20);await page.locator('.presentation-quiz').click();await expect(phone.locator('.quiz-lobby')).toBeVisible();await page.getByRole('button',{name:/Começar quiz/}).click();await expect(page.locator('.game-question')).toBeVisible({timeout:10000});await expect(page.locator('.quiz-sidebar')).toHaveCount(0);await expect(page.locator('.question-card h1')).toBeVisible();await expect(phone.locator('.question-card h1')).toBeHidden();await expect(phone.locator('.answer-options button')).toHaveCount(4);expect(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);expect(await phone.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);await page.screenshot({path:'test-results/new-quiz-dark-pc.png',animations:'disabled'});await phone.screenshot({path:'test-results/new-quiz-phone.png',animations:'disabled'});
  await phone.locator('[data-answer="0"]').click();await page.getByRole('button',{name:/Revelar resposta/}).click();await expect(page.locator('.round-results')).toHaveCount(0);await page.getByRole('button',{name:/Mostrar classificação/}).click();await expect(page.locator('.round-results .game-character')).toHaveCount(1);await page.getByRole('button',{name:/Próxima pergunta/}).click();await phone.locator('[data-answer="0"]').click();await page.getByRole('button',{name:/Revelar resposta/}).click();await page.getByRole('button',{name:/Grande resultado final/}).click();await expect(page.locator('.grand-finale .game-character')).toHaveCount(1);await expect(page.locator('.round-results')).toHaveCount(0);expect(parseFloat(await page.locator('.final-contestant.place-1').evaluate(e=>getComputedStyle(e).animationDelay))).toBeGreaterThan(5);await page.getByRole('button',{name:'Revelar todos',exact:true}).click();await expect(page.locator('.final-contestant .character-head img')).toHaveCount(1);await page.screenshot({path:'test-results/new-quiz-podium.png',animations:'disabled'});expect(errors).toEqual([]);
 }finally{await context.close();}
});

test('participante edita perfil, volta na mesma sala sem duplicar e pode ser removido',async({page,browser})=>{
 await load(page,newLesson());const code=await present(page),context=await browser.newContext({viewport:{width:390,height:844}});let phone=await context.newPage();try{await phone.goto('/?localSignal&s='+code);await phone.getByLabel('Como podemos chamar você?').fill('Ana');await phone.getByRole('button',{name:'Entrar na sala',exact:true}).click();await phone.getByRole('button',{name:'Editar meu perfil na sala'}).click();await phone.getByLabel('Seu nome',{exact:true}).fill('Ana editada');await phone.getByRole('button',{name:'Avatar 🦊',exact:true}).click();await phone.getByRole('button',{name:'Salvar perfil da sala'}).click();await phone.close();phone=await context.newPage();await phone.goto('/?localSignal&s='+code);await expect(phone.locator('#app')).toHaveAttribute('data-role','student');await page.mouse.move(150,20);await page.locator('.presentation-toolbar [data-action=participants]').click();await expect(page.locator('.manage-participant')).toHaveCount(1);await expect(page.locator('.manage-participant')).toContainText('Ana editada');await page.getByRole('button',{name:'Remover da sala',exact:true}).click();await expect(phone.locator('#join-form')).toBeVisible();await expect(phone.locator('#toast')).toContainText('removido');}finally{await context.close();}
});

test('grava narração no slide e conserva o arquivo ao recarregar',async({page})=>{
 await fakeMicrophone(page);await page.goto('/');await createProject(page);
 const selectLayer=()=>page.locator('.designer-layer-list button').first().click();
 await selectLayer();
 const panel=page.locator('.inspector-audio');
 await panel.locator('summary').click();
 await panel.getByRole('button',{name:'● Gravar áudio',exact:true}).click();
 await expect(page.locator('.record-dialog output')).toHaveText('0:01',{timeout:5000});
 await page.getByRole('button',{name:'Parar gravação',exact:true}).click();
 await page.getByRole('button',{name:'Usar gravação',exact:true}).click();
 await expect(panel.locator('.audio-name')).toContainText('Gravação');
 await page.getByRole('button',{name:'Salvar aula',exact:true}).click();
 await page.reload();
 await selectLayer();
 await expect(panel.locator('.audio-name')).toContainText('Gravação');
 await page.getByRole('button',{name:'Prévia',exact:true}).click();
 const track=page.locator('[data-soundtrack]');
 await expect(track).toHaveJSProperty('paused',true);
 await page.locator('[data-play-slide-audio=element]').click();
 await expect(track).toHaveJSProperty('paused',false);
});

test('trilhas próprias do lobby e das perguntas ficam separadas e persistem',async({page})=>{
 await fakeMicrophone(page);await page.goto('/');await createProject(page);await page.locator('[data-block=quiz]').click();await page.locator('.game-settings>summary').click();for(const scope of ['quiz-lobby','quiz-question']){await page.locator(`.audio-editor:has([data-record-audio="${scope}"])>summary`).click();await page.locator(`[data-record-audio="${scope}"]`).click();await expect(page.locator('.record-dialog output')).toHaveText('0:01',{timeout:5000});await page.getByRole('button',{name:'Parar gravação',exact:true}).click();await page.getByRole('button',{name:'Usar gravação',exact:true}).click();await expect(page.locator(`.audio-editor:has([data-record-audio="${scope}"]) .audio-name`)).toContainText('Gravação');}
 await page.getByRole('button',{name:'Salvar aula',exact:true}).click();await page.reload();await page.locator('.game-settings>summary').click();await expect(page.locator('[data-game-setting=lobby]')).toHaveValue('custom');await expect(page.locator('[data-game-setting=questions]')).toHaveValue('custom');await expect(page.locator('.game-settings .audio-name')).toHaveCount(2);
});

test('câmera do leitor reconhece o QR Code e preenche a sala sem navegar para outro site',async({page})=>{
 const qr=await QRCode.toDataURL('https://jonataslferreira-hash.github.io/senaidendezas/?s=123456',{width:360,margin:4});await page.addInitScript(data=>{navigator.mediaDevices.getUserMedia=async()=>{const image=new Image();image.src=data;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=480;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,480,480);ctx.drawImage(image,60,60,360,360);return canvas.captureStream(10);};},qr);await page.goto('/?page=join');await page.getByRole('button',{name:/Ler QR Code/}).click();await expect(page.getByLabel('Código da sala',{exact:true})).toHaveValue('123456',{timeout:15000});await expect(page.locator('.qr-reader')).toHaveCount(0);expect(new URL(page.url()).hostname).toBe('localhost');
});

test('etapas podem ser reorganizadas e o quiz pode abrir antes dos slides',async({page})=>{
 await page.goto('/');await createProject(page);await page.getByRole('button',{name:'Adicionar atividade',exact:true}).click();await page.locator('[data-add=quiz]').click();await page.locator('[data-studio-action=tab-quiz]').dragTo(page.locator('[data-studio-action=tab-slides]'));await expect(page.locator('.block-tab').first()).toHaveAttribute('data-studio-action','tab-quiz');await page.getByRole('button',{name:'Salvar aula',exact:true}).click();await page.reload();await expect(page.locator('.block-tab').first()).toHaveAttribute('data-studio-action','tab-quiz');await present(page);await expect(page.locator('.quiz-lobby')).toBeVisible();
});
