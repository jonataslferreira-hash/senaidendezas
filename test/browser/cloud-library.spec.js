import {test,expect} from '@playwright/test';
import {mockAccounts} from './auth-fixture.js';
test('salvar HDD e SSD na nuvem atualiza a conta e a aula reaparece ao recarregar',async({page})=>{
 await mockAccounts(page);const files=new Map();let queries=0,releaseFirst;
 const first=new Promise(resolve=>releaseFirst=resolve);
 await page.route('https://storage-lab-files.lagujf.workers.dev/lessons**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path==='/lessons'){queries++;if(queries===1)await first;return route.fulfill({json:[...files].map(([id,file])=>({path:'r2:'+id,title:file.title,bytes:file.body.length,updatedAt:new Date().toISOString()}))});}
  const id=path.split('/').pop();if(request.method()==='PUT'){files.set(id,{body:request.postDataBuffer(),title:decodeURIComponent(request.headers()['x-lesson-title'])});return route.fulfill({json:{ok:true}});}
  const file=files.get(id);return route.fulfill({body:file.body,contentType:'application/octet-stream',headers:file.body[0]===31?{'Content-Encoding':'gzip'}:{}});
 });
 await page.goto('/');await expect(page.locator('.cloud-status')).toHaveText('Consultando aulas na nuvem…');await expect(page.locator('.cloud-library')).not.toContainText('Nenhuma aula');releaseFirst();await expect(page.locator('.cloud-status')).toHaveText('Nenhuma aula salva na nuvem ainda.');
 await page.locator('.lesson-card [data-studio-action=edit]').first().click();await expect(page.locator('.editor-title')).toContainText('HDD e SSD');
 await page.getByRole('button',{name:'☁ Salvar na nuvem',exact:true}).click();await expect.poll(()=>files.size).toBe(1);await expect(page.getByRole('button',{name:'☁ Salvar na nuvem',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'← Voltar',exact:true}).click();await expect(page.locator('.cloud-file-list')).toContainText('HDD e SSD');await expect(page.locator('.cloud-status')).toHaveText('1 aula nesta conta.');
 await page.reload();await expect(page.locator('.cloud-file-list')).toContainText('HDD e SSD');await page.getByRole('button',{name:'Abrir cópia no editor ↗',exact:true}).click();await expect(page.locator('.editor-title')).toContainText('HDD e SSD');
});

test('falha de consulta não é apresentada como conta sem aulas',async({page})=>{
 await mockAccounts(page);await page.route('https://storage-lab-files.lagujf.workers.dev/lessons',route=>route.fulfill({status:503,json:{error:'storage_unavailable'}}));await page.goto('/');
 await expect(page.locator('.cloud-status')).toContainText('Não foi possível acessar o R2');await expect(page.locator('.cloud-library')).not.toContainText('Nenhuma aula');await expect(page.getByRole('button',{name:'Atualizar arquivos',exact:true})).toBeEnabled();
});

test('resultado atrasado da conta anterior não substitui arquivos da conta atual',async({page})=>{
 const users=await mockAccounts(page);let release;const waiting=new Promise(resolve=>release=resolve);
 await page.route('https://storage-lab-files.lagujf.workers.dev/lessons',async route=>{const token=route.request().headers().authorization.split(' ')[1],uid=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;if(uid===users[0].id)await waiting;return route.fulfill({json:[{path:'r2:exemplo',title:uid===users[0].id?'Arquivo da Ana':'Arquivo da Bia',bytes:100,updatedAt:new Date().toISOString()}]});});
 await page.goto('/');await expect(page.locator('.cloud-status')).toHaveText('Consultando aulas na nuvem…');await page.getByRole('button',{name:'Ana',exact:true}).click();await page.getByRole('button',{name:'+ Adicionar outra conta',exact:true}).click();await page.getByLabel('E-mail',{exact:true}).fill('bia@example.com');await page.getByLabel('Senha',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Entrar na conta',exact:true}).click();
 await expect(page.locator('.cloud-file-list')).toContainText('Arquivo da Bia');release();await page.getByRole('button',{name:'Fechar conta',exact:true}).click();await expect(page.locator('.cloud-file-list')).not.toContainText('Arquivo da Ana');await expect(page.locator('.cloud-file-list')).toContainText('Arquivo da Bia');
});
