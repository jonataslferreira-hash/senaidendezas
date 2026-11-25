import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));});

test('flashcards no menu: criar, virar, editar, navegar e manter após recarregar',async({page})=>{
 await page.goto('/');const nav=page.locator('.studio-shell > .studio-rail nav');
 await nav.getByRole('button',{name:'Flashcards'}).click();await expect(nav.getByRole('button',{name:'Flashcards'})).toHaveAttribute('aria-current','page');
 await page.getByRole('button',{name:'+ Criar manualmente'}).click();
 await page.getByLabel('Nome do conjunto').fill('Redes');await page.getByLabel('Frente').fill('O que é IP?');await page.getByLabel('Verso').fill('Um endereço de rede.');
 await page.getByRole('button',{name:'Criar conjunto',exact:true}).click();await expect(page.locator('.fc-face[aria-hidden=false] .fc-card-text')).toHaveText('O que é IP?');
 await page.getByRole('button',{name:'Mostrar resposta'}).click();await expect(page.locator('.fc-face[aria-hidden=false] .fc-card-text')).toHaveText('Um endereço de rede.');
 await page.getByRole('button',{name:'Editar cartão'}).click();await page.getByLabel('Verso').fill('Identifica um dispositivo na rede.');await page.getByRole('button',{name:'Salvar cartão'}).click();
 await page.getByRole('button',{name:'+ Adicionar cartão'}).click();await page.getByLabel('Frente').fill('O que é DNS?');await page.getByLabel('Verso').fill('Converte nomes em endereços.');await page.getByRole('button',{name:'Salvar cartão'}).click();
 await expect(page.locator('.fc-counter')).toContainText('2 DE 2');await page.getByRole('button',{name:'← Anterior'}).click();await expect(page.locator('.fc-face[aria-hidden=false] .fc-card-text')).toHaveText('O que é IP?');
 await page.reload();await expect(page.getByRole('heading',{name:'Estude no seu ritmo.'})).toBeVisible();await page.getByRole('button',{name:'Estudar Redes'}).click();await page.getByRole('button',{name:'Mostrar resposta'}).click();await expect(page.locator('.fc-face[aria-hidden=false] .fc-card-text')).toHaveText('Identifica um dispositivo na rede.');
});

test('Storage AI gera cartões usando questões válidas e salva separado da aula',async({page})=>{
 const uid='22222222-2222-4222-8222-222222222222',user={id:uid,email:'owner@example.com',aud:'authenticated',app_metadata:{},user_metadata:{display_name:'Professora'}};
 const jwt=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
 await page.addInitScript(({user,jwt})=>localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token',JSON.stringify({user,access_token:jwt,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600})),{user,jwt});
 await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**',route=>route.fulfill({json:route.request().url().endsWith('/user')?user:[]}));
 await page.route('https://storage-lab-files.lagujf.workers.dev/**',route=>route.request().url().endsWith('/storage-ai')?route.continue():route.fulfill({json:[]}));
 let body;await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',route=>{body=route.request().postDataJSON();return route.fulfill({json:{questions:[{text:'O que é SSD?',options:['Disco óptico','Armazenamento em memória flash'],correct:1,explanation:'Não tem discos giratórios.'}]}});});
 await page.goto('/');await page.locator('.studio-shell > .studio-rail [data-studio-action=flashcards]').click();await page.getByRole('button',{name:'✦ Criar com Storage AI'}).click();
 await page.getByLabel('Tema').fill('Armazenamento');await page.getByLabel('Quantidade gerada pela IA').selectOption('3');await page.getByRole('button',{name:'✦ Gerar com Storage AI'}).click();
 await expect(page.locator('.fc-face[aria-hidden=false] .fc-card-text')).toHaveText('O que é SSD?');expect(body.activities.questions).toBe(3);expect(body.prompt).toContain('Armazenamento');
 await expect(page.locator('.fc-notice')).toContainText('1 de 3');await page.getByRole('button',{name:'Mostrar resposta'}).click();await expect(page.locator('.fc-face[aria-hidden=false] .fc-card-text')).toContainText('Armazenamento em memória flash');
 await page.reload();await page.getByRole('button',{name:'Estudar Armazenamento'}).click();await expect(page.locator('.fc-face[aria-hidden=false] .fc-card-text')).toContainText('SSD');
});

test('revisão em celular permite acessar e virar o cartão sem corte horizontal',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('button',{name:'Abrir menu'}).click();await page.locator('#studio-navigation').getByRole('button',{name:'Flashcards'}).click();
 await page.getByRole('button',{name:'+ Criar manualmente'}).click();await page.getByLabel('Nome do conjunto').fill('Teste');await page.getByLabel('Frente').fill('Pergunta');await page.getByLabel('Verso').fill('Resposta');await page.getByRole('button',{name:'Criar conjunto',exact:true}).click();
 await page.getByRole('button',{name:'Mostrar resposta'}).click();await expect(page.locator('.fc-face[aria-hidden=false] .fc-card-text')).toHaveText('Resposta');
 const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
});

test('cria cartões das questões da aula sem consumir IA nem mudar a apresentação',async({page})=>{
 let aiCalls=0;await page.route('https://storage-lab-files.lagujf.workers.dev/storage-ai',route=>{aiCalls++;return route.abort();});
 await page.goto('/');const before=await page.evaluate(()=>localStorage.getItem('storage-lab-lessons-v1'));
 await page.locator('.studio-shell > .studio-rail [data-studio-action=flashcards]').click();await page.getByRole('button',{name:'✦ Criar com Storage AI'}).click();
 await page.getByLabel('Aula deste dispositivo').selectOption({label:'HDD e SSD: por dentro dos seus dados'});
 await page.getByRole('button',{name:'Usar questões da aula'}).click();await expect(page.locator('.fc-counter')).toContainText('CARTÃO 1 DE');
 const front=await page.locator('.fc-face[aria-hidden=false] .fc-card-text').innerText();expect(front.length).toBeGreaterThan(5);await page.getByRole('button',{name:'Mostrar resposta'}).click();await expect(page.locator('.fc-face[aria-hidden=false] .fc-card-text')).not.toHaveText(front);
 expect(aiCalls).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('storage-lab-lessons-v1'))).toBe(before);
});

test('exige conta para gerar com IA e mantém o tema ao abrir o login',async({page})=>{
 await page.goto('/?page=flashcards');await page.getByRole('button',{name:'✦ Criar com Storage AI'}).click();
 await page.getByLabel('Tema').fill('Física e energia');await page.getByRole('button',{name:'✦ Gerar com Storage AI'}).click();
 await expect(page.getByRole('dialog',{name:'Entrar na conta'})).toBeVisible();await expect(page.getByLabel('Tema')).toHaveValue('Física e energia');
});

test('o cartão mantém foco ao virar pelo teclado',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sl-flashcards-v1:guest',JSON.stringify([{id:'deck',title:'Revisão',cards:[{id:'c1',front:'Pergunta',back:'Resposta'}]}])));
 await page.goto('/?page=flashcards');await page.getByRole('button',{name:'Estudar Revisão'}).click();
 const card=page.locator('.fc-card');await card.focus();await page.keyboard.press('Enter');await expect(card).toBeFocused();await expect(card).toContainText('Resposta');await page.keyboard.press('Enter');await expect(card).toContainText('Pergunta');
});
