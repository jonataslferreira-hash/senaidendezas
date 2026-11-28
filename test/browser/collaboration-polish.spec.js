import {test,expect} from '@playwright/test';
import {mockAccounts} from './auth-fixture.js';
import {createProject} from './project-fixture.js';

test.beforeEach(async({page})=>{await mockAccounts(page);await page.addInitScript(()=>{localStorage.setItem('sl-tour','done');localStorage.setItem('sl-appearance','dark');});});

test('demonstração permanece legível no modo escuro e conta não mostra explicações removidas',async({page})=>{
 await page.goto('/');const title=page.locator('.showcase-slide h3');await expect(title).toBeVisible();await expect(title).toHaveCSS('color','rgb(53, 42, 64)');
 await page.locator('[data-account-profile] button').first().click();const account=page.locator('.account-connections');await expect(account).toContainText('Google');await expect(account).not.toContainText('Use o Google para entrar');await expect(account).not.toContainText('O acesso ao Classroom é autorizado separadamente');
});

test('compartilhar e colaborar apresentam controles claros e chat não cobre editor',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await createProject(page);
 await page.locator('.editor-sharing > summary').click();await page.getByRole('button',{name:'Compartilhar',exact:true}).click();
 const share=page.locator('.publish-dialog');await expect(share).toBeVisible();const checkbox=share.locator('[data-publish-copy]');await expect(checkbox).toBeVisible();expect((await checkbox.boundingBox()).width).toBeLessThan(25);await share.locator('.publish-copy-option').click();await expect(checkbox).toBeChecked();await page.screenshot({path:'test-results/polish-share.png',animations:'disabled'});
 await share.getByRole('button',{name:'Fechar compartilhamento'}).click();await page.locator('.editor-sharing > summary').click();await page.getByRole('button',{name:'Colaborar',exact:true}).click();
 const collab=page.locator('.collaboration-dialog');await expect(collab).toBeVisible();await expect(collab.getByLabel('Permissão')).toBeVisible();await expect(collab.getByRole('button',{name:'Enviar convite'})).toBeVisible();await page.screenshot({path:'test-results/polish-collaborate.png',animations:'disabled'});await collab.getByRole('button',{name:'Fechar colaboração'}).click();
 await page.locator('.editor-sharing > summary').click();await page.locator('.editor-sharing [data-chat-action=open]').click();const chat=page.locator('[data-chat-slot] .lesson-chat');await expect(chat).toBeVisible();await expect(chat).toContainText('Chat da aula');
 const boxes=await page.evaluate(()=>{const a=document.querySelector('.editor-shell').getBoundingClientRect(),b=document.querySelector('[data-chat-slot] .lesson-chat').getBoundingClientRect();return {editorRight:a.right,chatLeft:b.left};});expect(boxes.editorRight).toBeLessThanOrEqual(boxes.chatLeft);
 await page.screenshot({path:'test-results/lesson-chat-redesign.png',animations:'disabled'});await chat.getByRole('button',{name:'Fechar chat'}).click();await expect(chat).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await page.locator('.mobile-editor-actions').click();await page.locator('.editor-sharing > summary').click();await page.locator('.editor-sharing [data-chat-action=open]').click();await expect(page.locator('[data-chat-slot] .lesson-chat')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
