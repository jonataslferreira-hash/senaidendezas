import {test,expect} from '@playwright/test';
test('compartilhar, criar atividade e revisar notas com identidade manual',async({page})=>{
 const calls=[];
 await page.addInitScript(()=>{
  localStorage.setItem('sl-tour','done');localStorage.setItem('sl-classroom-client-id','123-abc.apps.googleusercontent.com');
  window.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:({callback})=>({requestAccessToken:()=>callback({access_token:'test-token',expires_in:3600})})}}};
 });
 await page.route('https://classroom.googleapis.com/**',async route=>{
  const request=route.request(),url=new URL(request.url());if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'}});return;}calls.push({url:url.pathname+url.search,method:request.method(),body:request.postDataJSON()});
  let data={};
  if(url.pathname==='/v1/courses')data={courses:[{id:'c1',name:'Turma A'}]};
  else if(url.pathname.endsWith('/courseWork')&&request.method()==='GET')data={courseWork:[{id:'w1',title:'Quiz 1',workType:'ASSIGNMENT',associatedWithDeveloper:true,maxPoints:100},{id:'w2',title:'Outra',workType:'ASSIGNMENT',associatedWithDeveloper:false,maxPoints:100}]};
  else if(url.pathname.endsWith('/students'))data={students:[{userId:'u1',profile:{name:{fullName:'Ana'},emailAddress:'ana@example.org'}},{userId:'u2',profile:{name:{fullName:'Bia'}}}]};
  else if(url.pathname.endsWith('/studentSubmissions'))data={studentSubmissions:[{id:'s1',userId:'u1',draftGrade:10},{id:'s2',userId:'u2'}]};
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('/');
 await page.evaluate(async()=>{const {googleClassroom}=await import('/src/google-classroom.js');window.gc=googleClassroom;gc.open({link:'https://example.org/lesson#deck=abc',title:'Minha aula',quiz:{total:4,players:[{name:'Apelido 1',correct:3,googleUserId:'u1'},{name:'Apelido 2',correct:1}]}});});
 const dialog=page.locator('.gclass-dialog');await expect(dialog).toBeVisible();
 const share=await dialog.getByRole('link',{name:'Compartilhar ↗'}).getAttribute('href');expect(new URL(share).searchParams.get('url')).toBe('https://example.org/lesson#deck=abc');
 await dialog.getByRole('button',{name:'Conectar Google'}).click();await expect(dialog.locator('[data-gclass-course] option')).toHaveCount(2);await dialog.locator('[data-gclass-course]').selectOption('c1');
 await expect(dialog.locator('[data-gclass-activity] option')).toHaveCount(2);
 page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Publicar atividade'}).click();await expect(dialog).toContainText('Atividade publicada');
 expect(calls.some(c=>c.method==='POST'&&c.body.title==='Minha aula')).toBe(true);
 await dialog.locator('[data-gclass-activity]').selectOption('w1');await expect(dialog.locator('[data-gclass-map]')).toHaveCount(2);await expect(dialog.locator('[data-gclass-map="0"]')).toHaveValue('s1');await expect(dialog.locator('[data-gclass-map="1"]')).toHaveValue('');
 await dialog.locator('[data-gclass-map="0"]').selectOption('s1');await dialog.locator('[data-gclass-map="1"]').selectOption('s1');await dialog.getByRole('button',{name:'Revisar notas'}).click();await expect(dialog).toContainText('apenas uma vez');expect(calls.filter(c=>c.method==='PATCH')).toHaveLength(0);
 await dialog.locator('[data-gclass-map="0"]').selectOption('s1');await dialog.locator('[data-gclass-map="1"]').selectOption('s2');
 let confirmation='';page.once('dialog',d=>{confirmation=d.message();d.accept();});await dialog.getByRole('button',{name:'Revisar notas'}).click();await expect(dialog).toContainText('Confira o resultado de cada envio');expect(confirmation).toContain('Apelido 1 → Ana · ana@example.org: 75/100 (já possui nota)');
 const patches=calls.filter(c=>c.method==='PATCH');expect(patches).toHaveLength(2);expect(patches.map(c=>c.body.draftGrade)).toEqual([75,25]);expect(patches.every(c=>c.url.endsWith('?updateMask=draftGrade'))).toBe(true);
});
