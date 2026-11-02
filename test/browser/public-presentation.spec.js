import {test,expect} from '@playwright/test';
import {newLesson,newSlide,validateLesson} from '../../src/lessons.js';
import {canvasFromSlide} from '../../src/canvas-data.js';
import {unpackLesson} from '../../src/codec-core.js';
import {compressJSONText} from '../../src/codec-core.js';
const token='11111111-1111-4111-8111-111111111111';
test('cópia portátil abre sem servidor e sem login',async({page})=>{
  const lesson=newLesson();lesson.slides[0].title='Aula portátil';lesson.slides=lesson.slides.map(canvasFromSlide);
  const packed=await compressJSONText(JSON.stringify(validateLesson(lesson))),encoded=Buffer.from(packed.buffer).toString('base64url');
  let calls=0;await page.route('https://storage-lab-files.lagujf.workers.dev/**',route=>{calls++;return route.abort();});
  await page.goto('/?presentation=portable#deck='+encoded);
  await expect(page.locator('#app')).toHaveAttribute('data-read-only','true');await expect(page.locator('.document-stage')).toContainText('Aula portátil');expect(calls).toBe(0);
});
test('link abre apresentação sem login, não mostra edição e reúne os controles na linha dos slides',async({page})=>{
  const lesson=newLesson();lesson.slides.push(newSlide());lesson.slides[0].title='Primeiro slide';lesson.slides[1].title='Segundo slide';lesson.slides=lesson.slides.map(canvasFromSlide);let authorization;
  await page.route('https://storage-lab-files.lagujf.workers.dev/presentations/'+token,route=>{authorization=route.request().headers().authorization;return route.fulfill({json:validateLesson(lesson)});});
  await page.goto('/?presentation='+token);await expect(page.locator('#app')).toHaveAttribute('data-read-only','true');
  expect(authorization).toBeUndefined();await expect(page.locator('[data-action=edit-current-slide]')).toHaveCount(0);await expect(page.locator('.header-center')).toHaveCount(0);
  await expect(page.locator('.document-top .exit-presentation')).toBeVisible();await expect(page.locator('.document-top [data-action=fullscreen]')).toBeVisible();
  await expect(page.locator('.document-top .eyebrow')).toHaveCount(0);await page.getByLabel('Ir para página',{exact:true}).selectOption('1');
  await expect(page.locator('.document-stage')).toContainText('Segundo slide');
  await page.getByRole('button',{name:'Apresentar em tela cheia',exact:true}).click();await expect(page.locator('#app')).toHaveClass(/is-presenting/);
  await expect(page.locator('.document-top .exit-presentation')).toBeVisible();await page.screenshot({path:'test-results/public-presentation.png',animations:'disabled'});
  await page.getByRole('button',{name:'↩ Sair',exact:true}).click();await expect(page.locator('.studio-library')).toBeVisible();
});

test('dono cria link público sem notas, recupera o link ao reabrir e pode desativá-lo',async({page})=>{
  const uid='22222222-2222-4222-8222-222222222222',user={id:uid,email:'owner@example.com',aud:'authenticated',app_metadata:{},user_metadata:{display_name:'Dono'}};
  const jwt=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
  await page.addInitScript(({user,jwt})=>localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token',JSON.stringify({user,access_token:jwt,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600})),{user,jwt});
  await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**',route=>route.fulfill({json:route.request().url().endsWith('/user')?user:[]}));
  let snapshot,removed=false;
  await page.route('https://storage-lab-files.lagujf.workers.dev/presentations**',async route=>{
    expect(route.request().headers().authorization).toContain('Bearer ');
    if(route.request().method()==='DELETE'){removed=true;return route.fulfill({json:{ok:true}});}
    snapshot=await unpackLesson(new Blob([route.request().postDataBuffer()]));return route.fulfill({status:201,json:{token}});
  });
  await page.goto('/');await page.locator('.create-half').click();await page.getByRole('button',{name:'Campos',exact:true}).click();
  await page.getByText('Roteiro do apresentador',{exact:false}).click();await page.getByLabel('Notas só para o professor',{exact:true}).fill('Nota particular que não deve ser publicada.');
  await page.getByRole('button',{name:'Compartilhar',exact:true}).click();await page.getByRole('button',{name:'Criar link de apresentação',exact:true}).click();
  await expect(page.locator('#presentation-link')).toHaveValue('https://jonataslferreira-hash.github.io/senaidendezas/?presentation='+token);
  expect(snapshot.slides[0].note).toBe('');expect(snapshot.slides[0].kind).toBe('canvas');
  await page.getByRole('button',{name:'Fechar compartilhamento',exact:true}).click();await page.getByRole('button',{name:'Compartilhar',exact:true}).click();
  await expect(page.locator('#presentation-link')).toBeVisible();await page.getByRole('button',{name:'Desativar link',exact:true}).click();await expect.poll(()=>removed).toBe(true);
});

test('Worker antigo cria alternativa portátil e informa que a cópia não é revogável',async({page})=>{
  const uid='22222222-2222-4222-8222-222222222222',user={id:uid,email:'owner@example.com',aud:'authenticated',app_metadata:{},user_metadata:{display_name:'Dono'}};
  const jwt=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
  await page.addInitScript(({user,jwt})=>localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token',JSON.stringify({user,access_token:jwt,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600})),{user,jwt});
  await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**',route=>route.fulfill({json:route.request().url().endsWith('/user')?user:[]}));
  await page.route('https://storage-lab-files.lagujf.workers.dev/presentations',route=>route.fulfill({status:404,json:{error:'not_found'}}));
  await page.goto('/');await page.locator('.create-half').click();await page.getByRole('button',{name:'Compartilhar',exact:true}).click();await page.getByRole('button',{name:'Criar link de apresentação',exact:true}).click();
  await expect(page.locator('#presentation-link')).toHaveValue(/presentation=portable#deck=/);await expect(page.locator('.publish-portable-note')).toContainText('não revoga');
  const link=await page.locator('#presentation-link').inputValue(),parsed=new URL(link);await page.goto('/'+parsed.search+parsed.hash);await expect(page.locator('#app')).toHaveAttribute('data-read-only','true');
});
