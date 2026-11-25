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
