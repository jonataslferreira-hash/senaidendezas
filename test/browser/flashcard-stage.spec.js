import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));});

test('etapa no editor cria e importa cartões, salva e permite apresentar sem slides',async({page,browser})=>{
 await page.addInitScript(()=>localStorage.setItem('sl-flashcards-v1:guest',JSON.stringify([{id:'deck',title:'Revisão local',cards:[{id:'c1',front:'Primeira pergunta?',back:'Primeira resposta.'},{id:'c2',front:'Segunda pergunta?',back:'Segunda resposta.'}]}])));
 await page.goto('/?localSignal');await page.locator('.create-half').click();await page.getByLabel('Título da aula',{exact:true}).fill('Aula com cartões');await page.getByRole('button',{name:'Criar apresentação',exact:true}).click();
 await page.getByRole('button',{name:'Adicionar atividade'}).click();await page.locator('[data-add="flashcards"]').click();
 await page.locator('[data-game-field="fc-front"]').first().fill('Manual');await page.locator('[data-game-field="fc-back"]').first().fill('Resposta manual');
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Copiar para esta etapa'}).click();
 await expect(page.locator('[data-game-field="fc-front"]').first()).toHaveValue('Primeira pergunta?');await expect(page.locator('[data-game-field="fc-back"]').nth(1)).toHaveValue('Segunda resposta.');
 await page.locator('[data-game-field="fc-back"]').first().fill('Resposta alterada.');await page.getByRole('button',{name:'Salvar neste dispositivo',exact:true}).click();
 const lesson=await page.evaluate(()=>JSON.parse(localStorage.getItem('storage-lab-lessons-v1')).find(l=>l.title==='Aula com cartões'));
 expect(lesson.slides.find(s=>s.game?.type==='flashcards').game.cards[0].back).toBe('Resposta alterada.');
 // O item interno da etapa mantém a aula válida mesmo removendo a etapa de slides.
 await page.getByRole('button',{name:'Opções da etapa Slides'}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();
 await page.getByRole('button',{name:'Salvar neste dispositivo',exact:true}).click();await page.getByRole('button',{name:'Apresentar ↗',exact:true}).click();
 await expect(page.locator('.flashcard-stage-card')).toContainText('Primeira pergunta?');
 const link=await page.getByLabel('Link de convite').inputValue(),code=new URL(link).searchParams.get('s');const context=await browser.newContext({viewport:{width:390,height:844}});const student=await context.newPage();
 try{await student.goto('/?localSignal&s='+code);await student.getByLabel('Como podemos chamar você?').fill('Ana');await student.getByRole('button',{name:'Entrar na sala',exact:true}).click();
 await expect(student.locator('.flashcard-stage-card')).toContainText('Primeira pergunta?');await expect(student.locator('.flashcard-stage-card')).not.toContainText('Resposta alterada.');await expect(student.locator('[data-game-do]')).toHaveCount(0);
 await page.getByRole('button',{name:'Fechar convite'}).click();await page.getByRole('button',{name:'Revelar resposta'}).click();await expect(page.locator('.flashcard-stage-card')).toContainText('Resposta alterada.');await expect(student.locator('.flashcard-stage-card')).toContainText('Resposta alterada.');
 await page.getByRole('button',{name:'Próximo →',exact:true}).click();await expect(page.locator('.flashcard-stage-card')).toContainText('Segunda pergunta?');await expect(student.locator('.flashcard-stage-card')).toContainText('Segunda pergunta?');await expect(student.locator('.flashcard-stage-card')).not.toContainText('Segunda resposta.');await page.getByRole('button',{name:'Concluir apresentação'}).click();await expect(page.locator('.flashcard-stage-card')).toHaveCount(0);
 }finally{await context.close();}
});
for(const viewport of [{width:1440,height:850},{width:390,height:844}]) test(`cartão exibido e controles responsivos ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/');
 await page.evaluate(async()=>{const {Room}=await import('/src/room.js'),{newLesson}=await import('/src/lessons.js'),{gameMarkup}=await import('/src/stage-games-view.js');const l=newLesson();l.questions=[];l.slides[0].game={type:'flashcards',text:'Revisão',cards:[{front:'Qual é a função da memória RAM?',back:'Dados temporários'}]};l.activityBlocks=[{id:'cards',type:'flashcards',items:[l.slides[0].id]}];const r=new Room('123456',null,()=>100,l);const app=document.querySelector('#app');app.className='quiz-party';app.dataset.role='presenter';app.innerHTML=gameMarkup(r.snapshot(),{host:true,header:()=>'<header class="header">Storage Lab</header>'});});
 await expect(page.locator('.flashcard-stage-card')).toContainText('Qual é a função');await expect(page.getByRole('button',{name:'Revelar resposta'})).toBeVisible();
 const dim=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(dim.scroll).toBeLessThanOrEqual(dim.width);
});

test('Storage AI gera cartões diretamente na etapa',async({page})=>{
 const uid='22222222-2222-4222-8222-222222222222',user={id:uid,email:'owner@example.com',aud:'authenticated',app_metadata:{},user_metadata:{display_name:'Professora'}};
 const jwt=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
 await page.addInitScript(({user,jwt})=>localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token',JSON.stringify({user,access_token:jwt,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600})),{user,jwt});
 await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**',route=>route.fulfill({json:route.request().url().endsWith('/user')?user:[]}));
 await page.route('https://storage-lab-files.lagujf.workers.dev/**',route=>route.request().url().endsWith('/storage-ai')?route.continue():route.fulfill({json:[]}));
 let body;await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',route=>{body=route.request().postDataJSON();return route.fulfill({json:{questions:[{text:'O que é RAM?',options:['Memória temporária','Disco óptico'],correct:0,explanation:'É volátil.'}]}});});
 await page.goto('/');await page.locator('.create-half').click();await page.getByLabel('Título da aula',{exact:true}).fill('Memória de computador');await page.getByRole('button',{name:'Criar apresentação',exact:true}).click();
 await page.getByRole('button',{name:'Adicionar atividade'}).click();await page.locator('[data-add="flashcards"]').click();await page.getByRole('button',{name:'Gerar cartões com Storage AI'}).click();
 await expect(page.locator('[data-game-field="fc-front"]').first()).toHaveValue('O que é RAM?');await expect(page.locator('[data-game-field="fc-back"]').first()).toContainText('Memória temporária');expect(body.prompt).toContain('Memória de computador');
});
