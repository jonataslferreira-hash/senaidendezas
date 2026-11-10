import {test,expect} from '@playwright/test';
import {mockAccounts} from './auth-fixture.js';
import {newLesson} from '../../src/lessons.js';
import {gunzipSync} from 'node:zlib';
import {Y, encode, writeLesson} from '../../src/collaboration-core.js';

test('cartão da aula compartilhada na nuvem mostra colaboração e nuvem sem duplicar',async({page})=>{
 await mockAccounts(page);
 const lesson=newLesson();
 lesson.title='Atividade compartilhada';
 const group=crypto.randomUUID(),revision=crypto.randomUUID();
 const document={id:crypto.randomUUID(),group_id:group,revision,version:1,title:lesson.title};
 const doc=new Y.Doc();
 writeLesson(doc,lesson);
 const snapshot={format:'sl-yjs-v1',state:encode(Y.encodeStateAsUpdate(doc))};
 doc.destroy();
 await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/rest/v1/sl_group_documents**',route=>
  route.fulfill({json:new URL(route.request().url()).searchParams.has('id')?document:[document]}));
 await page.route('https://storage-lab-files.lagujf.workers.dev/lessons',route=>
  route.fulfill({json:[{path:'r2:'+lesson.id,title:lesson.title,bytes:100,updatedAt:new Date().toISOString()}]}));
 await page.route('https://storage-lab-files.lagujf.workers.dev/groups/'+group+'/'+revision,route=>route.fulfill({json:snapshot}));
 await page.goto('/?page=library');
 const card=page.locator('.lesson-card').filter({has:page.getByRole('heading',{name:lesson.title,exact:true})});
 const badge=card.getByRole('img',{name:'Compartilhada · Na nuvem'});
 await expect(badge.locator('svg')).toHaveCount(2);
 await expect(card).toHaveCount(1);
});

test('reabrir, renomear e salvar a aula da nuvem conserva o projeto e o arquivo',async({page})=>{
 await mockAccounts(page);const lesson=newLesson();lesson.title='Projeto único';const files=new Map([[lesson.id,lesson]]);
 await page.route('https://storage-lab-files.lagujf.workers.dev/lessons**',async route=>{const request=route.request(),path=new URL(request.url()).pathname;if(path.endsWith('/cover'))return route.fulfill({status:404,json:{error:'not_found'}});if(path==='/lessons')return route.fulfill({json:[...files].map(([id,l])=>({path:'r2:'+id,title:l.title,bytes:100,updatedAt:new Date().toISOString()}))});const id=path.split('/').pop();if(request.method()==='PUT'){let bytes=request.postDataBuffer();if(bytes[0]===31)bytes=gunzipSync(bytes);files.set(id,JSON.parse(bytes.toString()));return route.fulfill({json:{ok:true}});}return route.fulfill({json:files.get(id)});});
 await page.goto('/');await page.locator('.cloud-lesson-card [data-studio-action=cloud-open]').click();expect(await page.evaluate(async()=>{const {routeParams}=await import('/src/editor-route.js');return routeParams().get('lesson');})).toBe(lesson.id);
 await page.getByLabel('Mais opções da aula',{exact:true}).click();await page.getByRole('button',{name:'Editar título e descrição',exact:true}).click();await page.getByLabel('Título da aula',{exact:true}).fill('Mesmo projeto renomeado');await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(page.getByRole('button',{name:'Salvar na nuvem',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Salvar aula',exact:true}).click();await expect.poll(()=>files.get(lesson.id).title).toBe('Mesmo projeto renomeado');expect(files.size).toBe(1);
 await page.evaluate(()=>{const key='storage-lab-lessons-v1',list=JSON.parse(localStorage.getItem(key));window.projectIds=list.map(l=>l.id);localStorage.setItem(key,'[]');});await page.goto('/?page=library');await page.locator('.cloud-lesson-card [data-studio-action=cloud-open]').click();await expect(page.locator('.editor-title')).toHaveText('Mesmo projeto renomeado');expect(await page.evaluate(async()=>{const {routeParams}=await import('/src/editor-route.js');return routeParams().get('lesson');})).toBe(lesson.id);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('storage-lab-lessons-v1')).map(l=>l.id))).toEqual([lesson.id]);
});
test('salvar HDD e SSD na nuvem atualiza a conta e a aula reaparece ao recarregar',async({page})=>{
 await mockAccounts(page);const files=new Map();let queries=0,releaseFirst;
 const first=new Promise(resolve=>releaseFirst=resolve);
 await page.route('https://storage-lab-files.lagujf.workers.dev/lessons**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path==='/lessons'){queries++;if(queries===1)await first;return route.fulfill({json:[...files].map(([id,file])=>({path:'r2:'+id,title:file.title,bytes:file.body.length,updatedAt:new Date().toISOString()}))});}
  if(path.endsWith('/cover'))return route.fulfill({status:404,json:{error:'not_found'}});
  const id=path.split('/').pop();if(request.method()==='PUT'){files.set(id,{body:request.postDataBuffer(),title:decodeURIComponent(request.headers()['x-lesson-title'])});return route.fulfill({json:{ok:true}});}
  const file=files.get(id);return route.fulfill({body:file.body,contentType:'application/octet-stream',headers:file.body[0]===31?{'Content-Encoding':'gzip'}:{}});
 });
 await page.goto('/');await expect(page.locator('.cloud-status')).toHaveText('Consultando aulas na nuvem…');await expect(page.locator('[data-cloud-library]')).not.toContainText('Nenhuma aula');releaseFirst();await expect(page.locator('.cloud-status')).toHaveText('');
 await page.locator('.lesson-card [data-studio-action=edit]').first().click();await expect(page.locator('.editor-title')).toContainText('HDD e SSD');
 await page.getByRole('button',{name:'Salvar na nuvem',exact:true}).click();await expect.poll(()=>files.size).toBe(1);await expect(page.getByRole('button',{name:'Salvar aula',exact:true})).toHaveText('Salvo');
 await page.getByRole('button',{name:'Voltar',exact:true}).click();await expect(page.locator('.lesson-card .storage-state.cloud')).toContainText('Na nuvem');await expect(page.locator('.cloud-status')).toHaveText('');
 await page.reload();await expect(page.locator('.lesson-card .storage-state.cloud')).toContainText('Na nuvem');await page.getByRole('button',{name:'Editar aula: HDD e SSD: por dentro dos seus dados',exact:true}).click();await expect(page.locator('.editor-title')).toContainText('HDD e SSD');
});

test('falha de consulta não é apresentada como conta sem aulas',async({page})=>{
 await mockAccounts(page);await page.route('https://storage-lab-files.lagujf.workers.dev/lessons',route=>route.fulfill({status:503,json:{error:'storage_unavailable'}}));await page.goto('/');
 await expect(page.locator('.cloud-status')).toContainText('Não foi possível acessar o R2');await expect(page.locator('[data-cloud-library]')).not.toContainText('Nenhuma aula');await expect(page.getByRole('button',{name:'Recarregar aulas',exact:true})).toBeEnabled();
});

test('aula só na nuvem pode ser apresentada e excluída sem apagar a cópia local', async ({page}) => {
 await mockAccounts(page);
 const lesson=newLesson();
 lesson.title='Aula remota';
 let stored=true;
 await page.route('https://storage-lab-files.lagujf.workers.dev/lessons**', route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path==='/lessons')return route.fulfill({json:stored?[{path:'r2:'+lesson.id,title:lesson.title,bytes:100}]:[]});
  if(request.method()==='DELETE'){stored=false;return route.fulfill({json:{ok:true}});}
  return route.fulfill({json:lesson});
 });
 await page.goto('/?localSignal');
 const card=page.locator('.cloud-lesson-card');
 await expect(card.getByRole('button',{name:'Editar aula ↗'})).toBeVisible();
 await card.getByRole('button',{name:'Apresentar'}).click();
 await expect(page.locator('.document-stage')).toBeVisible();
 await page.evaluate(()=>document.fullscreenElement && document.exitFullscreen());
 await page.getByRole('button',{name:'Fechar convite'}).click();
 await page.getByRole('button',{name:'↩ Sair',exact:true}).click();
 const local=page.locator('.lesson-card').filter({hasText:'Aula remota'});
 await local.getByLabel('Mais opções: Aula remota').click();
 await local.getByRole('button',{name:'Excluir da nuvem',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Excluir da nuvem',exact:true}).click();
 await expect(local.locator('.storage-state')).toHaveText(/Neste dispositivo/);
 expect(stored).toBe(false);
});

test('resultado atrasado da conta anterior não substitui arquivos da conta atual',async({page})=>{
 const users=await mockAccounts(page);let release;const waiting=new Promise(resolve=>release=resolve);
 await page.route('https://storage-lab-files.lagujf.workers.dev/lessons',async route=>{const token=route.request().headers().authorization.split(' ')[1],uid=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;if(uid===users[0].id)await waiting;return route.fulfill({json:[{path:'r2:exemplo',title:uid===users[0].id?'Arquivo da Ana':'Arquivo da Bia',bytes:100,updatedAt:new Date().toISOString()}]});});
 await page.goto('/');await expect(page.locator('.cloud-status')).toHaveText('Consultando aulas na nuvem…');await page.getByRole('button',{name:'Ana',exact:true}).click();await page.getByRole('button',{name:'+ Adicionar outra conta',exact:true}).click();await page.getByLabel('E-mail',{exact:true}).fill('bia@example.com');await page.getByLabel('Senha',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Entrar na conta',exact:true}).click();
 await expect(page.locator('[data-library-grid]')).toContainText('Arquivo da Bia');release();await page.getByRole('button',{name:'Fechar conta',exact:true}).click();await expect(page.locator('[data-library-grid]')).not.toContainText('Arquivo da Ana');await expect(page.locator('[data-library-grid]')).toContainText('Arquivo da Bia');
});
