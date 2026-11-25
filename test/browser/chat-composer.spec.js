import {test,expect} from '@playwright/test';
import {mockAccounts,ids} from './auth-fixture.js';
test('chat direto usa compositor compacto, Enter e botão identificável de imagem',async({page})=>{
 await mockAccounts(page);const id='33333333-3333-4333-8333-333333333333';let sent='';
 await page.route('**/rest/v1/rpc/sl_list_contacts',route=>route.fulfill({json:[{id,status:'accepted',other_id:ids[1],other_name:'Bia',other_email:'bia@example.com'}]}));
 await page.route('**/rest/v1/rpc/sl_send_direct_message',route=>{sent=route.request().postDataJSON().p_body;return route.fulfill({json:{id:'44444444-4444-4444-8444-444444444444',contact_id:id,author_id:ids[0],author_name:'Ana',body:sent,created_at:new Date().toISOString()}});});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.locator('.studio-shell > .studio-rail [data-social-action=open]').click();await page.getByRole('button',{name:'Conversar com Bia'}).click();
 const form=page.locator('#social-send');await expect(form.locator('.chat-image-picker svg')).toBeVisible();
 const bounds=await form.evaluate(e=>{const r=e.querySelector('textarea').getBoundingClientRect(),buttons=[...e.querySelectorAll('.chat-compose-actions > *')].map(b=>b.getBoundingClientRect());return {h:r.height,top:r.top,buttons:buttons.map(b=>({h:b.height,top:b.top}))};});
 expect(bounds.h).toBeLessThanOrEqual(50);for(const b of bounds.buttons){expect(b.h).toBeLessThanOrEqual(50);expect(Math.abs(b.top-bounds.top)).toBeLessThan(3);}
 await page.locator('#social-message').fill('Oi, Bia');await page.locator('#social-message').press('Enter');await expect.poll(()=>sent).toBe('Oi, Bia');await expect(page.locator('.chat-messages')).toContainText('Oi, Bia');
});
test('aviso de envio de imagem reflete a falha real reportada pelo serviço',async({page})=>{
 await mockAccounts(page);const id='33333333-3333-4333-8333-333333333333';
 await page.route('**/rest/v1/rpc/sl_list_contacts',route=>route.fulfill({json:[{id,status:'accepted',other_id:ids[1],other_name:'Bia'}]}));
 await page.route('**/chat-image/**',route=>route.fulfill({status:503,json:{error:'chat_not_configured'}}));
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.locator('.studio-shell > .studio-rail [data-social-action=open]').click();await page.getByRole('button',{name:'Conversar com Bia'}).click();
 const gif=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');await page.locator('#social-send [data-chat-image-input]').setInputFiles({name:'imagem.gif',mimeType:'image/gif',buffer:gif});
 await expect(page.locator('.social-chat [role=status]')).toContainText('Não foi possível verificar a permissão no servidor do chat');
});
test('imagens privadas abrem automaticamente, falhas permitem tentar novamente e cards de link são legíveis',async({page})=>{
 await mockAccounts(page);await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));const id='33333333-3333-4333-8333-333333333333',file='44444444-4444-4444-8444-444444444444',path=`/chat-image/dm/${id}/${file}`;let gets=0;
 const gif=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
 const rows=[{id:'55555555-5555-4555-8555-555555555555',contact_id:id,author_id:ids[0],author_name:'Ana',body:'https://docs.google.com/document/d/123456/edit',created_at:'2026-01-01T12:00:00Z'},{id:'66666666-6666-4666-8666-666666666666',contact_id:id,author_id:ids[0],author_name:'Ana',body:'[storage-lab-image]'+JSON.stringify({path}),created_at:'2026-01-01T12:01:00Z'}];
 await page.route('**/rest/v1/rpc/sl_list_contacts',route=>route.fulfill({json:[{id,status:'accepted',other_id:ids[1],other_name:'Bia'}]}));
 await page.route('**/rest/v1/sl_direct_messages*',route=>route.fulfill({json:rows}));
 await page.route('**/chat-image/**',route=>{gets++;expect(route.request().headers().authorization).toMatch(/^Bearer /);return gets===1?route.fulfill({status:503,json:{error:'storage_not_configured'}}):route.fulfill({contentType:'image/gif',body:gif});});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.locator('.studio-shell > .studio-rail [data-social-action=open]').click();await page.getByRole('button',{name:'Conversar com Bia'}).click();
 await expect(page.getByRole('button',{name:'Não foi possível carregar. Toque para tentar novamente.'})).toBeVisible();await page.getByRole('button',{name:'Não foi possível carregar. Toque para tentar novamente.'}).click();await expect(page.locator('.chat-image-message img')).toBeVisible();expect(gets).toBe(2);
 const card=page.locator('.chat-link-card');await expect(card).toContainText('Documento no Google');await expect(card).toHaveAttribute('href','https://docs.google.com/document/d/123456/edit');
 await page.setViewportSize({width:390,height:844});await expect(card).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/chat-cards.png',animations:'disabled'});
 await page.setViewportSize({width:1280,height:720});await page.getByRole('button',{name:'Fechar conversas'}).click();await page.locator('.studio-shell > .studio-rail [data-social-action=open]').click();await expect(page.locator('.chat-image-message img')).toBeVisible();expect(gets).toBe(2);
});
