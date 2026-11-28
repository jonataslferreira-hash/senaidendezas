import {test,expect} from '@playwright/test';
import {mockAccounts,ids} from './auth-fixture.js';
import {createProject} from './project-fixture.js';

test.beforeEach(async({page})=>{await mockAccounts(page);await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));});
async function project(page){await page.goto('/');await createProject(page);await page.locator('.editor-sharing > summary').click();}
test('busca nomes ou e-mails de contatos aceitos e seleciona com foto e teclado',async({page})=>{
 const contact={id:'33333333-3333-4333-8333-333333333333',status:'accepted',other_id:ids[1],other_name:'Bía Silva',other_email:'bia@example.com'};
 const pending={id:'44444444-4444-4444-8444-444444444444',status:'pending',other_id:'55555555-5555-4555-8555-555555555555',other_name:'Bia Pendente',other_email:'pending@example.com'};
 await page.route('**/rest/v1/rpc/sl_list_contacts',route=>route.fulfill({json:[contact,pending]}));
 await page.route('**/rest/v1/rpc/sl_person_profile',route=>route.fulfill({json:[{avatar_path:'r2:avatar'}]}));
 await page.route('**/people/*/avatar',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')}));
 await project(page);await page.getByRole('button',{name:'Colaborar',exact:true}).click();const search=page.getByRole('combobox',{name:'Nome ou e-mail do colaborador'});
 await search.fill('bia');const option=page.getByRole('option',{name:/Bía Silva/});await expect(option).toBeVisible();await expect(option.locator('img')).toBeVisible();await expect(page.getByRole('option',{name:/Pendente/})).toHaveCount(0);
 await search.press('ArrowDown');await expect(search).toHaveAttribute('aria-activedescendant','invite-option-0');await search.press('Enter');await expect(search).toHaveValue('bia@example.com');await expect(option).toHaveCount(0);
 await search.fill('example.com');await page.getByRole('option',{name:/Bía Silva/}).click();await expect(search).toHaveValue('bia@example.com');
 await search.fill('Não é e-mail');await page.getByRole('button',{name:'Enviar convite'}).click();await expect(page.locator('[data-group-dialog]')).toContainText('Selecione um contato ou informe o e-mail completo');
});
test('falha de rede ao criar link mostra mensagem clara e preserva o editor',async({page})=>{
 await page.route('https://storage-lab-files.lagujf.workers.dev/presentations',route=>route.abort('failed'));await project(page);await page.getByRole('button',{name:'Compartilhar',exact:true}).click();await page.getByRole('button',{name:'Criar link de apresentação'}).click();await expect(page.locator('.publish-message')).toContainText('Não foi possível acessar o servidor de compartilhamento');await expect(page.locator('.publish-message')).not.toContainText('Failed to fetch');await expect(page.locator('[data-publish-action=create]')).toBeEnabled();
});
test('falha de rede ao convidar mantém o e-mail digitado',async({page})=>{
 await page.route('https://storage-lab-files.lagujf.workers.dev/collaboration/status',route=>route.abort('failed'));await project(page);await page.getByRole('button',{name:'Colaborar',exact:true}).click();const search=page.getByRole('combobox',{name:'Nome ou e-mail do colaborador'});await search.fill('pessoa@example.com');await page.getByRole('button',{name:'Enviar convite'}).click();await expect(page.locator('[data-group-dialog]')).toContainText('Não foi possível acessar o servidor de colaboração');await expect(page.getByRole('combobox',{name:'Nome ou e-mail do colaborador'})).toHaveValue('pessoa@example.com');
});
