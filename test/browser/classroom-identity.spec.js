import {test,expect} from '@playwright/test';
import {mockAccounts} from './auth-fixture.js';

async function openRoom(host){await host.goto('/?localSignal');await host.locator('.lesson-card [data-studio-action=present]').first().click();await expect(host.locator('.big-code')).toBeVisible();return (await host.locator('.big-code').innerText()).replace(/\s/g,'');}

test('convidado encontra a orientação dentro da sala e retorna à mesma sessão',async({browser})=>{
 const host=await browser.newPage(),context=await browser.newContext(),student=await context.newPage();
 try{
  for(const p of [host,student])await p.addInitScript(()=>localStorage.setItem('sl-tour','done'));
  const code=await openRoom(host);await student.goto('/?localSignal&s='+code);await expect(student.locator('.join-classroom-identity')).toHaveCount(0);await student.getByLabel('Como podemos chamar você?').fill('Convidado');await student.getByRole('button',{name:'Entrar na sala',exact:true}).click();
  await expect(student.locator('#app')).toHaveAttribute('data-role','student',{timeout:45000});await student.getByRole('button',{name:'Identificar para o Classroom'}).click();await expect(student.locator('.room-classroom-dialog')).toContainText('crie uma conta ou entre');
  await student.getByRole('button',{name:'Criar conta ou entrar',exact:true}).click();await expect(student.getByRole('button',{name:'Continuar com Google'})).toBeVisible();
  // A conta permanece aberta mesmo que o professor avance um slide.
  await host.getByRole('button',{name:'Fechar convite'}).click();await host.locator('#document-page').selectOption('1', {force:true});await expect(student.locator('.account-dialog')).toBeVisible();await expect(student.getByRole('button',{name:'Continuar com Google'})).toBeVisible();
  await student.evaluate(()=>{window.storageLabAccount.client.auth.signInWithOAuth=async options=>{window.joinAuthOptions=options;return {error:{code:'provider_disabled'}};};});
  await student.getByRole('button',{name:'Continuar com Google'}).click();const opts=await student.evaluate(()=>window.joinAuthOptions);const target=new URL(opts.options.redirectTo);expect(target.searchParams.get('s')).toBe(code);expect(target.searchParams.get('page')).toBe('present');
  const playerBefore=await host.evaluate(()=>JSON.parse(sessionStorage.getItem('sl-host')).data.players[0].id);await student.goto(target.href);await expect(student.locator('#app')).toHaveAttribute('data-role','student',{timeout:45000});await expect.poll(async()=>host.evaluate(()=>{const p=JSON.parse(sessionStorage.getItem('sl-host')).data.players;return p.filter(x=>x.online).length;})).toBe(1);expect(await host.evaluate(()=>JSON.parse(sessionStorage.getItem('sl-host')).data.players[0].id)).toBe(playerBefore);
 }finally{await host.close();await context.close();}
});

test('identificação é autorizada dentro da sala, sem mandar token ao professor',async({browser})=>{
 const host=await browser.newPage(),context=await browser.newContext(),student=await context.newPage();const requests=[];
 try{
  await host.addInitScript(()=>localStorage.setItem('sl-tour','done'));const users=await mockAccounts(student);users[0].identities=[{provider:'google',identity_data:{sub:'12345678901234567890'}}];users[0].app_metadata.providers=['email','google'];
  await student.addInitScript(()=>{localStorage.setItem('sl-tour','done');const k='sb-qkpgiwjsqtocvjmqinii-auth-token',s=JSON.parse(localStorage.getItem(k));s.user.identities=[{provider:'google',identity_data:{sub:'12345678901234567890'}}];s.user.app_metadata.providers=['email','google'];localStorage.setItem(k,JSON.stringify(s));});
  for(const [page,who] of [[host,'host'],[student,'student']])await page.route('https://storage-lab-files.lagujf.workers.dev/**',async route=>{const req=route.request(),url=new URL(req.url());if(url.pathname.startsWith('/classroom-identity/')){requests.push({who,path:url.pathname,body:req.postDataJSON(),auth:req.headers().authorization});return route.fulfill({json:url.pathname.endsWith('/proof')?{proof:'fake-signed-proof'}:{googleUserId:'12345678901234567890'}});}return route.fulfill({status:404,json:{error:'not_found'}});});
  await host.goto('/?localSignal');test.skip(!await host.evaluate(async()=>Boolean((await import('/src/cloud-files.js')).r2ApiUrl)),'Requer VITE_R2_API_URL configurada para simular o Worker.');await host.locator('.lesson-card [data-studio-action=present]').first().click();await expect(host.locator('.big-code')).toBeVisible();const code=(await host.locator('.big-code').innerText()).replace(/\s/g,'');
  await student.goto('/?localSignal&s='+code);await student.getByRole('button',{name:'Entrar na sala',exact:true}).click();await expect(student.locator('#app')).toHaveAttribute('data-role','student',{timeout:45000});expect(requests).toHaveLength(0);
  await student.getByRole('button',{name:'Identificar para o Classroom'}).click();await student.getByRole('button',{name:'Confirmar identificação'}).click();await expect(student.locator('.room-classroom-dialog')).toContainText('Identidade Google confirmada');await expect.poll(()=>requests.length,{timeout:15000}).toBe(2);await expect.poll(()=>host.evaluate(()=>JSON.parse(sessionStorage.getItem('sl-host')).data.players[0].googleUserId)).toBe('12345678901234567890');
  const issue=requests.find(x=>x.who==='student'),verify=requests.find(x=>x.who==='host');expect(issue.path).toContain('/proof');expect(issue.auth).toMatch(/^Bearer /);expect(verify.path).toContain('/verify');expect(verify.auth).toBeUndefined();expect(verify.body.proof).toBe('fake-signed-proof');expect(issue.body.code).toBe(code);expect(verify.body.nonce).toBe(issue.body.nonce);
  await student.getByRole('button',{name:'Parar de compartilhar identificação'}).click();await expect(student.getByRole('button',{name:'Confirmar identificação'})).toBeVisible();await expect.poll(()=>host.evaluate(()=>JSON.parse(sessionStorage.getItem('sl-host')).data.players[0].googleUserId||null)).toBeNull();
 }finally{await host.close();await context.close();}
});

test('o botão dentro da sala funciona no celular e não altera a entrada como convidado',async({browser})=>{
 const host=await browser.newPage(),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),student=await context.newPage();
 try{for(const p of [host,student])await p.addInitScript(()=>localStorage.setItem('sl-tour','done'));const code=await openRoom(host);await student.goto('/?localSignal&s='+code);await student.getByLabel('Como podemos chamar você?').fill('Lia');await student.getByRole('button',{name:'Entrar na sala',exact:true}).click();await expect(student.locator('#app')).toHaveAttribute('data-role','student',{timeout:45000});await student.getByRole('button',{name:'Identificar para o Classroom'}).click();await expect(student.locator('.room-classroom-dialog')).toContainText('crie uma conta ou entre');expect(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await student.getByRole('button',{name:'Fechar identificação'}).click();await expect(student.locator('.room-classroom-dialog')).toHaveCount(0);
 }finally{await host.close();await context.close();}
});
