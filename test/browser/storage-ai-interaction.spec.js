import {test,expect} from '@playwright/test';
import {mockAccounts} from './auth-fixture.js';
import QRCode from 'qrcode';
import {createProject} from './project-fixture.js';
import {pptxFixture} from '../document-fixtures.js';

test('storageAI vincula PPTX e reorganiza as páginas no mesmo projeto',async({page})=>{
  test.setTimeout(120000);
  await mockAccounts(page);
  await page.route('**/storage-ai/history',route=>route.fulfill({json:{sessions:[]}}));
  await page.route('**/lessons/**',route=>route.fulfill({status:route.request().method()==='PUT'?200:404,json:{}}));
  await page.route('**/storage-ai',route=>{
    const input=route.request().postDataJSON();
    expect(input.mode).toBe('revise');
    const [first,second]=input.context.slides;
    const title=first.elements.find(element=>element.text==='Professor por um dia');
    return route.fulfill({json:{slideOrder:[second.id,first.id],edits:[{slideId:first.id,changes:[{id:title.id,text:'Título revisado',x:12}]}]}});
  });
  await page.goto('/?page=storage-ai');
  await expect(page.getByRole('heading',{name:'storageAI'})).toBeVisible();
  await page.getByRole('button',{name:'Adicionar conteúdo'}).click();
  await expect(page.getByRole('button',{name:'Importar PPTX'})).toBeVisible();
  await page.locator('input[name=presentation]').setInputFiles({name:'vinculada.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await pptxFixture()});
  const linked=page.getByText('Apresentação vinculada. Diga o que quer editar.');
  const fontDialog=page.locator('.pptx-font-dialog');
  await expect(linked.or(fontDialog)).toBeVisible({timeout:60000});
  if(await fontDialog.isVisible())await fontDialog.getByRole('button',{name:'Aplicar em todos os slides'}).click();
  await expect(linked).toBeVisible();
  const readLesson=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('storage-lab-lessons-v1')).find(lesson=>lesson.title==='vinculada'));
  const before=await readLesson();
  await page.getByLabel('Mensagem para Storage AI').fill('Mova a página 2 para o início e revise o título da primeira.');
  await page.getByRole('button',{name:'Enviar mensagem'}).click();
  await expect(page.getByText(/Reordenei as páginas/)).toBeVisible();
  const after=await readLesson();
  expect(after.id).toBe(before.id);
  expect(after.slides.map(slide=>slide.id)).toEqual(before.slides.map(slide=>slide.id).reverse());
  expect(after.slides[1].elements).toContainEqual(expect.objectContaining({text:'Título revisado',x:12}));
  await page.getByRole('button',{name:'Nova conversa',exact:true}).click();
  await page.getByRole('button',{name:'Adicionar conteúdo'}).click();
  await page.getByRole('button',{name:'Adicionar da biblioteca'}).click();
  const picker=page.locator('.ai-presentation-picker');
  await picker.getByLabel('Apresentação').selectOption({label:'vinculada'});
  await picker.getByRole('button',{name:'Adicionar',exact:true}).click();
  await expect(page.getByText('Apresentação vinculada. Diga o que quer editar.')).toBeVisible();
});

test('prévia pede aprovação e salva as atividades nas quantidades escolhidas',async({page})=>{
  await mockAccounts(page);
  await page.route('https://pt.wikipedia.org/w/api.php?**',route=>route.fulfill({json:{
    query:{search:[{pageid:123,title:'Sistema Solar',snippet:'O Sistema Solar contém oito planetas.'}]}
  }}));
  await page.route('https://commons.wikimedia.org/w/api.php?**',route=>route.fulfill({json:{
    query:{pages:[{title:'File:Sistema Solar.png',imageinfo:[{
      width:800,height:600,thumburl:'https://upload.wikimedia.org/solar-system.png',
      descriptionurl:'https://commons.wikimedia.org/wiki/File:Sistema_Solar.png',
      extmetadata:{LicenseShortName:{value:'CC0'}}
    }]}]}
  }}));
  const image=await QRCode.toBuffer('Sistema Solar',{width:120});
  await page.route('https://upload.wikimedia.org/solar-system.png',route=>route.fulfill({
    contentType:'image/png',body:image
  }));
  await page.route('https://api.openverse.org/**',route=>route.fulfill({json:{results:[]}}));
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai/history',route=>route.fulfill({json:{sessions:[]}}));
  await page.route('https://storage-lab-files.lagujf.workers.dev/lessons/**',route=>route.fulfill({json:{ok:true}}));
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',route=>{
    const input=route.request().postDataJSON();
    if(input.prompt.startsWith('Crie apenas atividades para esta aula;')){
      expect(input.activities).toEqual({quizzes:1,questions:1,polls:0});
      return route.fulfill({json:{questions:[{text:'Qual é o maior planeta?',options:['A','B','C'],correct:0}]}});
    }
    expect(input.activities).toEqual({quizzes:2,questions:1,polls:1});
    return route.fulfill({json:{
      title:'Proposta de aula',slides:[{title:'O sistema solar',body:'Introdução aos planetas.',theme:'studio-orbit'}],
      questions:[{text:'Qual é o primeiro planeta?',options:['A','B','C'],correct:0}],
      polls:[{text:'Qual planeta você quer conhecer?',options:['Marte','Vênus']}]
    }});
  });
  await page.goto('/?page=storage-ai');
  await page.getByRole('button',{name:'Quantidade de slides'}).click();
  await page.getByLabel('Slides',{exact:true}).fill('1');
  await page.getByLabel('Quizzes',{exact:true}).fill('2');
  await page.getByLabel('Quizzes',{exact:true}).press('Tab');
  await page.getByLabel('Questões por quiz').fill('1');
  await page.getByLabel('Enquetes',{exact:true}).fill('1');
  await page.getByLabel('Mensagem para Storage AI').fill('Cria um slide sobre planetas');
  await page.getByRole('button',{name:'Enviar mensagem'}).click();
  await expect(page.getByRole('navigation',{name:'Histórico de conversas'})).toContainText('Planetas');
  const preview=page.locator('.ai-lesson-preview');
  await expect(preview).toContainText('2 quizzes');
  await expect(preview.getByRole('img',{name:'Sistema Solar'})).toBeVisible();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('storage-lab-lessons-v1')).find(lesson=>lesson.title==='Proposta de aula'));
  expect(await saved()).toBeUndefined();
  await preview.getByRole('button',{name:'Criar apresentação'}).click();
  await expect(page.getByRole('button',{name:'Abrir no editor'})).toBeVisible();
  const lesson=await saved();
  expect(lesson.activityBlocks.filter(block=>block.type==='quiz').map(block=>block.items.length)).toEqual([1,1]);
  expect(lesson.questions.map(question=>question.options.length)).toEqual([3,3]);
  const references=lesson.slides.find(slide=>slide.title==='Referências');
  expect(references.note).toContain('https://pt.wikipedia.org/?curid=123');
  expect(references.note).toContain('https://commons.wikimedia.org/wiki/File:Sistema_Solar.png');
});

test('Storage AI keeps the page and draft while choosing slide count and sending',async({page})=>{
  await mockAccounts(page);
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai/history',route=>route.fulfill({json:{sessions:[]}}));
  const uploadedPaths=[];
  await page.route('https://storage-lab-files.lagujf.workers.dev/lessons/*',route=>{
    if(route.request().method()!=='PUT')return route.fulfill({status:404,json:{}});
    uploadedPaths.push(new URL(route.request().url()).pathname);
    return route.fulfill({json:{ok:true}});
  });
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',route=>{
    const request=route.request().postDataJSON();
    if(request.mode==='revise'){
      expect(request.context.slides).toHaveLength(1);
      const [slide]=request.context.slides;
      const title=slide.elements.find(el=>el.text==='Primeiro slide');
      return route.fulfill({json:{edits:[{slideId:slide.id,changes:[{id:title.id,text:'Título revisado'}]}]}});
    }
    return route.fulfill({json:{title:'Aula criada',description:'Uma aula de teste',slides:[{title:'Primeiro slide',body:'Conteúdo do primeiro slide.',theme:'ocean'}]}});
  });
  await page.goto('/?page=storage-ai');
    await page.getByRole('button',{name:'Modo instantâneo'}).click();
  const workspace=page.locator('.storage-ai-page');
  await expect(workspace).toBeVisible();
  await workspace.evaluate(node=>node.testIdentity='initial');
  const prompt=page.getByLabel('Mensagem para Storage AI');
  await prompt.evaluate(node=>node.testIdentity='draft');
  await expect(workspace.getByRole('button',{name:/Voltar.*biblioteca/i})).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await prompt.pressSequentially('Ab');
  const origins=await workspace.locator('.ai-ripple > span').evaluateAll(waves=>waves.map(wave=>parseFloat(wave.style.left)));
  expect(origins).toHaveLength(2);
  expect(origins[1]).toBeGreaterThan(origins[0]);
  const fieldSize=()=>prompt.evaluate(node=>({height:node.clientHeight,content:node.scrollHeight}));
  const single=await fieldSize();
  await prompt.fill(Array.from({length:6},(_,index)=>'Linha '+(index+1)).join('\n'));
  const six=await fieldSize();
  expect(six.height).toBeGreaterThan(single.height);
  expect(six.content).toBeLessThanOrEqual(six.height+1);
  await prompt.fill(Array.from({length:7},(_,index)=>'Linha '+(index+1)).join('\n'));
  const seven=await fieldSize();
  expect(seven.height).toBe(six.height);
  expect(seven.content).toBeGreaterThan(seven.height);
  await prompt.fill('Crie um slide sobre armazenamento');
  const menu=page.getByRole('button',{name:'Abrir menu'});
  const drawer=page.getByRole('dialog',{name:'Menu do Storage Lab'});
  const history=workspace.getByRole('complementary',{name:'Conversas do Storage AI'});
  const newChat=history.locator('.ai-new-chat');
  await expect(newChat).toBeVisible();
  await expect(drawer).toBeHidden();
  await menu.click();
  await expect(drawer).toBeVisible();
  await expect(page.locator('#ai-navigation:modal')).toHaveCount(1);
  await expect(drawer.getByRole('button',{name:'Compartilhados'})).toBeVisible();
  await expect(drawer.locator('.ai-history')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded','false');
  await expect(menu).toBeFocused();
  await expect(prompt).toHaveValue('Crie um slide sobre armazenamento');
  await page.getByRole('button',{name:'Quantidade de slides'}).click();
  await expect(page.getByLabel('Slides',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Slides',{exact:true})).toHaveAttribute('max','20');
  await page.getByLabel('Slides',{exact:true}).click();
  expect(await workspace.evaluate(node=>node.testIdentity)).toBe('initial');
  await expect(prompt).toHaveValue('Crie um slide sobre armazenamento');
  expect(await workspace.evaluate(node=>node.testIdentity)).toBe('initial');
  await page.getByLabel('Slides',{exact:true}).fill('1');
  await page.getByRole('button',{name:'Enviar mensagem'}).click();
  await expect(page.locator('.storage-ai-result')).toContainText('Aula criada');
  expect(await prompt.evaluate(node=>node.testIdentity)).toBe('draft');
  expect(await workspace.evaluate(node=>node.testIdentity)).toBe('initial');
  await newChat.click();
  await expect(page.locator('.ai-welcome')).toBeVisible();
  expect(await workspace.evaluate(node=>node.testIdentity)).toBe('initial');
  await history.getByRole('button',{name:/Aula criada/}).click();
  await prompt.fill('Altere o título da primeira página.');
  await page.getByRole('button',{name:'Enviar mensagem'}).click();
  await expect(workspace.locator('.storage-ai-result').last()).toContainText('Atualizei 1 slide da apresentação.');
  expect(uploadedPaths).toHaveLength(2);
  expect(uploadedPaths[1]).toBe(uploadedPaths[0]);
  await page.getByRole('button',{name:'Abrir no editor'}).last().click();
  await expect(page.locator('.editor-title')).toHaveText('Aula criada');
  await expect(page.locator('.outline-item')).toHaveCount(1);
  await expect(page.locator('.outline-item')).toContainText('Título revisado');
});

test('anexa fotos em lotes, distribui todas e varia tema e composição dos slides',async({page})=>{
  await mockAccounts(page);
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai/history',route=>route.fulfill({json:{sessions:[]}}));
  await page.route('https://storage-lab-files.lagujf.workers.dev/lessons/**',route=>route.fulfill({json:{ok:true}}));
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',route=>{
    const input=route.request().postDataJSON();
    expect(input.photoCount).toBe(5);
    expect(input.photoSheet).toBe(true);
    expect(input.photos).toHaveLength(1);
    return route.fulfill({json:{title:'Aula com cinco fotos',slides:[0,1,2].map(i=>({
      title:'Visual '+i,body:'Uma explicação ilustrada.',theme:'ember',layout:'split',photos:[0,1,2]
    }))}});
  });
  await page.goto('/?page=storage-ai');
    await page.getByRole('button',{name:'Modo instantâneo'}).click();
  const input=page.locator('#storage-ai-create input[name=photos]');
  const files=await Promise.all(Array.from({length:5},async(_,i)=>({
    name:'foto-'+i+'.png',mimeType:'image/png',buffer:await QRCode.toBuffer('Foto '+i,{width:120})
  })));
  await input.setInputFiles(files.slice(0,3));
  await input.setInputFiles(files.slice(3));
  await expect(page.locator('[data-ai-photo-count]')).toContainText('5 fotos anexadas');
  await page.getByLabel('Mensagem para Storage AI').fill('Use todas as cinco fotos nestes slides.');
  await page.getByRole('button',{name:'Quantidade de slides'}).click();
  await page.getByLabel('Slides',{exact:true}).fill('3');
  await page.getByRole('button',{name:'Enviar mensagem'}).click();
  await expect(page.locator('.storage-ai-result')).toContainText('Aula com cinco fotos');
  const slides=await page.evaluate(()=>JSON.parse(localStorage.getItem('storage-lab-lessons-v1'))
    .find(lesson=>lesson.title==='Aula com cinco fotos').slides);
  expect(slides.every(slide=>slide.elements.some(element=>element.type==='image'))).toBe(true);
  const images=slides.flatMap(slide=>slide.elements.filter(element=>element.type==='image'));
  expect(images).toHaveLength(5);
  expect(new Set(images.map(image=>image.imageAlt)).size).toBe(5);
  for(let i=1;i<slides.length;i++){
    expect(slides[i].visualTheme).not.toBe(slides[i-1].visualTheme);
    const titleRect=slide=>slide.elements.find(element=>element.role==='title');
    expect([titleRect(slides[i]).x,titleRect(slides[i]).y]).not.toEqual([titleRect(slides[i-1]).x,titleRect(slides[i-1]).y]);
  }
});

test('cria quiz e enquete como etapas e abre a aula durante uma revisão',async({page})=>{
  await mockAccounts(page);
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai/history',route=>route.fulfill({json:{sessions:[]}}));
  await page.route('https://storage-lab-files.lagujf.workers.dev/lessons/**',route=>route.fulfill({json:{ok:true}}));
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',async route=>{
    const input=route.request().postDataJSON();
    if(input.mode==='revise'){
      await pending;
      return route.fulfill({json:{edits:[],questions:[{text:'Onde ficam os arquivos?',options:['RAM','SSD'],correct:1,difficulty:'Fácil',seconds:20,explanation:'O SSD guarda dados sem energia.'}],polls:[{text:'Qual você usa?',options:['HDD','SSD']}]}});
    }
    return route.fulfill({json:{title:'Aula para atividades',slides:[{title:'Armazenamento',body:'HDD e SSD guardam dados.',theme:'ocean'}]}});
  });
  try{
    await page.goto('/?page=storage-ai');
    await page.getByRole('button',{name:'Modo instantâneo'}).click();
    await page.getByLabel('Mensagem para Storage AI').fill('Crie slides sobre armazenamento');
    await page.getByRole('button',{name:'Quantidade de slides'}).click();
    await page.getByLabel('Slides',{exact:true}).fill('1');
    await page.getByRole('button',{name:'Enviar mensagem'}).click();
    await expect(page.locator('.storage-ai-result')).toContainText('Aula para atividades');
    await page.getByLabel('Mensagem para Storage AI').fill('Adicione um quiz e uma enquete');
    await page.getByRole('button',{name:'Enviar mensagem'}).click();
    await page.locator('.storage-ai-result').last().getByRole('button',{name:'Abrir no editor'}).click();
    await expect(page.locator('.editor-title')).toHaveText('Aula para atividades');
    release();
    await expect(page.getByRole('tab',{name:/Quiz/})).toBeVisible();
    await expect(page.getByRole('tab',{name:/Enquete/})).toBeVisible();
    const lesson=await page.evaluate(()=>JSON.parse(localStorage.getItem('storage-lab-lessons-v1')).find(item=>item.title==='Aula para atividades'));
    expect(lesson.questions).toHaveLength(1);
    expect(lesson.slides.filter(slide=>slide.poll)).toHaveLength(1);
    expect(lesson.slides[0].elements.some(element=>/quiz|enquete/i.test(element.text||''))).toBe(false);
  }finally{release();}
});

test('pedido inicial coloca quiz e enquete fora dos slides de conteúdo',async({page})=>{
  await mockAccounts(page);
  await page.route('https://commons.wikimedia.org/w/api.php?**',route=>route.fulfill({json:{query:{pages:[{
    index:1,title:'File:HDD test.png',imageinfo:[{thumburl:'https://upload.wikimedia.org/test/hdd.png',descriptionurl:'https://commons.wikimedia.org/wiki/File:HDD_test.png',extmetadata:{License:{value:'pd'}}}]
  }]}}}));
  await page.route('https://upload.wikimedia.org/test/hdd.png',async route=>route.fulfill({contentType:'image/png',body:await QRCode.toBuffer('HDD',{width:100})}));
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai/history',route=>route.fulfill({json:{sessions:[]}}));
  await page.route('https://storage-lab-files.lagujf.workers.dev/lessons/**',route=>route.fulfill({json:{ok:true}}));
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',route=>route.fulfill({json:{title:'Aula com atividades',chatTitle:'Entendendo discos rígidos',slides:[{title:'HDD',body:'O disco guarda dados.',theme:'opf-minimal',layout:'opf-timeline',imageSearch:'hard drive'}],questions:[{text:'O que armazena dados?',options:['HDD','RAM'],correct:0,difficulty:'Fácil',seconds:20,explanation:'O HDD armazena dados.'}],polls:[{text:'Qual você usaria?',options:['HDD','SSD']}]}}));
  await page.goto('/?page=storage-ai');
    await page.getByRole('button',{name:'Modo instantâneo'}).click();
  await page.getByLabel('Mensagem para Storage AI').fill('Crie slides, quiz e enquete sobre armazenamento');
  await page.getByRole('button',{name:'Quantidade de slides'}).click();
  await page.getByLabel('Slides',{exact:true}).fill('1');
  await page.getByRole('button',{name:'Enviar mensagem'}).click();
  await expect(page.locator('.storage-ai-result')).toContainText('Aula com atividades');
  await expect(page.getByRole('navigation',{name:'Histórico de conversas'}).getByRole('button',{name:'Entendendo discos rígidos'})).toBeVisible();
  const lesson=await page.evaluate(()=>JSON.parse(localStorage.getItem('storage-lab-lessons-v1')).find(item=>item.title==='Aula com atividades'));
  expect(lesson.activityBlocks.map(block=>block.type)).toEqual(['slides','poll','quiz']);
  expect(lesson.slides[0].visualTheme).toBe('opf-minimal');
  expect(lesson.slides[0].layout).toBe('opf-timeline');
  expect(lesson.slides[0].elements.some(element=>element.type==='image'&&element.imageAlt==='HDD test')).toBe(true);
  expect(lesson.slides[0].note).toContain('Wikimedia Commons');
  expect(lesson.slides[0].elements.some(element=>element.type==='shape'&&element.id.startsWith('opf-decor-'))).toBe(true);
  expect(lesson.slides[0].backgroundFill.mode).toBe('gradient');
  expect(lesson.slides[0].elements.some(element=>/quiz|enquete/i.test(element.text||''))).toBe(false);
  await page.getByRole('button',{name:'Abrir no editor'}).click();
  await expect(page.locator('.designer-toolbar [data-style-kind="layout"][data-style-value^="opf-"]')).toHaveCount(36);
  await expect(page.locator('.designer-toolbar [data-style-value="opf-timeline"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('.designer-toolbar [data-style-picker="layout"]').click();
  await page.locator('.slide-style-menu:popover-open [data-style-value="opf-hero"]').click();
  await page.locator('.designer-toolbar [data-style-picker="theme"]').click();
  const bold=page.locator('.slide-style-menu:popover-open [data-style-value="opf-bold"]');
  await bold.hover();
  await expect(page.locator('.slide-style-preview .slide-canvas')).toHaveAttribute('data-visual-theme','opf-bold');
  await expect(page.locator('.canvas-editing .slide-canvas')).toHaveAttribute('data-visual-theme','opf-minimal');
  await bold.click();
  await expect(page.locator('.canvas-editing .slide-canvas')).toHaveAttribute('data-visual-theme','opf-bold');
  await expect(page.locator('.canvas-editing [data-type="text"]').first()).toContainText('HDD');
});

test('acompanha a montagem com edição bloqueada e salva o efeito sonoro e o modelo gerados',async({page})=>{
  await mockAccounts(page);
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai/history',route=>route.fulfill({json:{sessions:[]}}));
  let releaseAI,releaseSave;
  const pendingAI=new Promise(resolve=>{releaseAI=resolve;});
  const pendingSave=new Promise(resolve=>{releaseSave=resolve;});
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',async route=>{
    await pendingAI;
    return route.fulfill({json:{title:'Uma aula com mídia',slides:[{
      title:'Estação espacial',body:'Um modelo com fuselagem e motores.',sound:'chime',transition:'fade',
      model3D:{name:'Estação espacial',parts:[{name:'Fuselagem',shape:'cylinder',position:[0,0,0],size:[1,2,1],color:'#729fe8'}]}
    }]}});
  });
  await page.route('https://storage-lab-files.lagujf.workers.dev/lessons/**',async route=>{
    await pendingSave;
    return route.fulfill({json:{ok:true}});
  });
  try{
    await page.goto('/?page=storage-ai');
    await page.getByRole('button',{name:'Modo instantâneo'}).click();
    await page.getByLabel('Mensagem para Storage AI').fill('Crie uma aula com um efeito sonoro e um modelo de estação espacial.');
    await page.getByRole('button',{name:'Quantidade de slides'}).click();
    await page.getByLabel('Slides',{exact:true}).fill('1');
    await page.getByRole('button',{name:'Enviar mensagem'}).click();
    await page.getByRole('button',{name:'Acompanhar no editor'}).click();
    await expect(page.getByRole('status').filter({hasText:'0 de 1 slides montados'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Salvar aula'})).toHaveCount(0);
    releaseAI();
    await expect(page.locator('.ai-generation-stage')).toContainText('Estação espacial');
    releaseSave();
    await expect(page.locator('.editor-title')).toHaveText('Uma aula com mídia');
    const media=await page.evaluate(()=>{
      const lesson=JSON.parse(localStorage.getItem('storage-lab-lessons-v1')).find(item=>item.title==='Uma aula com mídia');
      const slide=lesson.slides[0];
      return {audio:slide.audio,model:slide.elements.find(item=>item.type==='model'),transition:slide.transition};
    });
    expect(media.audio).toMatchObject({name:'Sino.wav',volume:.35,loop:false});
    expect(media.audio.assetId||media.audio.data).toMatch(/^(asset-|data:audio\/wav)/);
    expect(media.model).toMatchObject({model:'custom',customModel:{format:'obj',name:'Estação espacial'}});
    expect(media.transition).toBe('fade');
  }finally{releaseAI();releaseSave();}
});

test('Storage AI troca somente a imagem selecionada por um PNG transparente', async ({page}) => {
  await mockAccounts(page);
  const opaque = await QRCode.toBuffer('foto original', {width:100});
  const transparent = await QRCode.toBuffer('nova imagem', {width:100,color:{light:'#00000000'}});
  await page.route('https://commons.wikimedia.org/w/api.php?**', route => {
    expect(new URL(route.request().url()).searchParams.get('gsrsearch')).toContain('filemime:png');
    return route.fulfill({json:{query:{pages:['opaca','transparente'].map((name,index)=>({
      title:'File:Solid state drive '+name+'.png',index,imageinfo:[{thumburl:'https://thumb.wikimedia.org/test/'+name+'.png',
        thumbmime:'image/png',descriptionurl:'https://commons.wikimedia.org/wiki/File:'+name+'.png',
        extmetadata:{License:{value:'cc-by-sa-4.0'},Artist:{value:'<b>Autor de teste</b>'},AttributionRequired:{value:'true'}}}]
    }))}}});
  });
  await page.route('https://thumb.wikimedia.org/test/*.png',route=>route.fulfill({
    contentType:'image/png',body:route.request().url().endsWith('/opaca.png')?opaque:transparent
  }));
  let selectedId;
  await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',route=>{
    const {context}=route.request().postDataJSON();
    expect(context.target).toBe(selectedId);
    return route.fulfill({json:{changes:[{id:selectedId,imageSearch:'solid state drive',imageTransparent:true}]}});
  });
  await page.goto('/');
  await createProject(page);
  await page.locator('[data-designer-action=image]').click();
  await page.locator('#designer-image-file').setInputFiles({name:'original.png',mimeType:'image/png',buffer:opaque});
  const object=page.locator('.canvas-object[data-type=image]');
  await expect(object).toHaveCount(1);
  selectedId=await object.getAttribute('data-object-id');
  const frame=await object.evaluate(el=>[el.style.left,el.style.top,el.style.width,el.style.height]);
  await page.getByRole('button',{name:'Fundo transparente',exact:true}).click();
  await page.locator('[data-storage-ai=toggle]').click();
  await expect(page.locator('.ai-reference')).toContainText('original.png');
  const scope=page.getByRole('group',{name:'Escopo da edição'});
  const whole=scope.getByRole('button',{name:'Slide inteiro',exact:true});
  const selection=scope.getByRole('button',{name:'Usar seleção',exact:true});
  await expect(selection).toHaveAttribute('aria-pressed','true');
  await expect(selection).toHaveCSS('background-image',/linear-gradient/);
  await expect(page.locator('.ai-reference img')).toHaveJSProperty('complete',true);
  await whole.click();
  await expect(whole).toHaveAttribute('aria-pressed','true');
  await expect(selection).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('.ai-reference')).toContainText('Slide inteiro');
  await selection.click();
  await page.getByLabel('Pedido para Storage AI').fill('Troque a imagem por um SSD com fundo transparente');
  await page.locator('.designer-layer-list [data-designer-action=select]').first().click();
  await expect(page.locator('.ai-reference')).toContainText('Texto · Camada 1');
  const imageLayer=page.locator('.designer-layer-list [data-designer-action=select]').last();
  await imageLayer.click();
  await imageLayer.click({modifiers:['Shift']});
  await expect(page.locator('.ai-reference')).toContainText('Nenhum elemento selecionado');
  await expect(page.getByRole('button',{name:'Enviar pedido',exact:true})).toBeDisabled();
  await imageLayer.click();
  await expect(page.locator('.ai-reference')).toContainText('original.png');
  await expect(page.getByLabel('Pedido para Storage AI')).toHaveValue('Troque a imagem por um SSD com fundo transparente');
  await page.getByRole('button',{name:'Enviar pedido',exact:true}).click();
  await expect(object.locator('img')).toHaveAttribute('alt','Solid state drive transparente');
  await expect(object).toHaveCount(1);
  expect(await object.getAttribute('data-object-id')).toBe(selectedId);
  expect(await object.evaluate(el=>[el.style.left,el.style.top,el.style.width,el.style.height])).toEqual(frame);
  await expect(object.locator('.canvas-image-window')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
});
