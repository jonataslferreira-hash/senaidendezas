import {test,expect} from '@playwright/test';
import {mockAccounts,ids} from './auth-fixture.js';
const contact='33333333-3333-4333-8333-333333333333';
async function setup(page,rows){
 await mockAccounts(page);await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));
 await page.route('**/rest/v1/rpc/sl_list_contacts',route=>route.fulfill({json:[{id:contact,status:'accepted',other_id:ids[1],other_name:'Bia'}]}));
 await page.route('**/rest/v1/sl_direct_messages*',route=>route.fulfill({json:rows}));
}
async function openChat(page){await page.goto('/');await page.locator('.studio-shell > .studio-rail [data-social-action=open]').click();await page.getByRole('button',{name:'Conversar com Bia'}).click();}
const at=(days,hour=12)=>{const d=new Date();d.setDate(d.getDate()-days);d.setHours(hour,0,0,0);return d.toISOString();};

test('ordem, datas, cartões públicos com título e autor e links privados preservados',async({page})=>{
 const rows=[
  {id:'55555555-5555-4555-8555-555555555555',contact_id:contact,author_id:ids[0],body:'https://youtu.be/dQw4w9WgXcQ?t=4',created_at:at(0)},
  {id:'66666666-6666-4666-8666-666666666666',contact_id:contact,author_id:ids[1],author_name:'Bia',body:'Mensagem ontem',created_at:at(1)},
  {id:'77777777-7777-4777-8777-777777777777',contact_id:contact,author_id:ids[1],author_name:'Bia',body:'Mensagem antiga',created_at:at(4)},
  {id:'88888888-8888-4888-8888-888888888888',contact_id:contact,author_id:ids[1],author_name:'Bia',body:'https://youtube.com/shorts/dQw4w9WgXcQ',created_at:at(2)},
  {id:'99999999-9999-4999-8999-999999999999',contact_id:contact,author_id:ids[0],body:'https://private.example/a?token=secret',created_at:at(0,13)}
 ];await setup(page,rows);let requests=[];
 await page.route('**/chat-preview/**',route=>{requests.push(route.request().url());return route.fulfill({json:{title:'Aula <b>legal</b>',author:'Canal legal'}});});
 await openChat(page);const log=page.locator('.social-chat .chat-messages');await expect(log.locator('.chat-message')).toHaveCount(5);await expect(log.locator('.chat-day')).toHaveText([new Date(at(4)).toLocaleDateString('pt-BR'), 'Anteontem','Ontem','Hoje']);
 const bodies=await log.locator('.chat-message').allTextContents();expect(bodies[0]).toContain('Mensagem antiga');expect(bodies[1]).toContain('YOUTUBE');expect(bodies[2]).toContain('Mensagem ontem');
 const cards=log.locator('.chat-link-youtube');await expect(cards).toHaveCount(2);await cards.last().scrollIntoViewIfNeeded();await expect(cards.last().locator('[data-preview-title]')).toHaveText('Aula <b>legal</b>');await expect(cards.last().locator('[data-preview-author]')).toHaveText('Canal legal · YouTube');await expect(cards.last().locator('[data-preview-title] b')).toHaveCount(0);
 await cards.first().scrollIntoViewIfNeeded();await expect(cards.first().locator('[data-preview-title]')).toHaveText('Aula <b>legal</b>');expect(requests).toHaveLength(1);expect(requests[0]).toContain('/youtube/dQw4w9WgXcQ');await expect(log.locator('.chat-link-open')).toHaveCount(0);
 const art=await cards.last().locator('.chat-link-art').boundingBox();expect(art.width).toBeGreaterThan(200);expect(art.height).toBeGreaterThan(130);await cards.last().scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/chat-redesign.png',animations:'disabled'});
});

test('envio aparece imediatamente, falhas preservam rascunho e sucesso não duplica',async({page})=>{
 await setup(page,[]);let resolve;let success=true;let gate=new Promise(r=>resolve=r);let sent='';
 await page.route('**/rest/v1/rpc/sl_send_direct_message',async route=>{sent=route.request().postDataJSON().p_body;await gate;if(!success)return route.fulfill({status:500,json:{message:'erro'}});return route.fulfill({json:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',contact_id:contact,author_id:ids[0],body:sent,created_at:new Date().toISOString()}});});
 await openChat(page);const field=page.locator('#social-message');await field.fill('Mensagem rápida');await field.press('Enter');await expect(page.locator('.chat-message.pending')).toContainText('Mensagem rápida');await expect(page.locator('.chat-message.pending')).toContainText('Enviando');resolve();await expect(page.locator('.chat-message.pending')).toHaveCount(0);await expect(page.locator('.chat-message')).toHaveCount(1);await expect(field).toHaveValue('');
 success=false;gate=new Promise(r=>resolve=r);await field.fill('Manter rascunho');await field.press('Enter');await expect(page.locator('.chat-message.pending')).toHaveCount(1);resolve();await expect(page.locator('.chat-message.pending')).toHaveCount(0);await expect(field).toHaveValue('Manter rascunho');await expect(page.locator('.social-chat [role=status]')).not.toBeEmpty();
});

test('prévia aceita Vimeo e Spotify sem encaminhar links completos nem segredos',async({page})=>{
 const rows=[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',contact_id:contact,author_id:ids[0],body:'https://vimeo.com/123456789?secret=NAO_ENVIAR',created_at:at(0,9)},{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',contact_id:contact,author_id:ids[0],body:'https://open.spotify.com/intl-pt/track/05TXKw2pxqf8ETIUdvEy6C?token=NAO_ENVIAR',created_at:at(0,10)}];
 await setup(page,rows);const paths=[];await page.route('**/chat-preview/**',route=>{paths.push(route.request().url());return route.fulfill({json:{title:'Título público',author:'Autor',thumbnail:new URL(route.request().url()).pathname.includes('/vimeo/')?'https://i.vimeocdn.com/video/10.jpg':'https://image-cdn-fa.spotifycdn.com/image/10'}});});
 await openChat(page);const v=page.locator('.chat-link-vimeo'),s=page.locator('.chat-link-spotify');await v.scrollIntoViewIfNeeded();await expect(v.locator('[data-preview-title]')).toHaveText('Título público');await s.scrollIntoViewIfNeeded();await expect(s.locator('[data-preview-author]')).toHaveText('Autor · Spotify');expect(paths).toHaveLength(2);expect(paths.every(path=>!path.includes('NAO_ENVIAR'))).toBe(true);await expect(v.locator('img')).toHaveAttribute('src','https://i.vimeocdn.com/video/10.jpg');await expect(s.locator('img')).toHaveAttribute('src','https://image-cdn-fa.spotifycdn.com/image/10');const box=await s.locator('.chat-link-art').boundingBox();expect(Math.abs(box.width-box.height)).toBeLessThan(1);
});

test('mostra fallback honesto se o Worker de prévias estiver indisponível',async({page})=>{
 const rows=[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',contact_id:contact,author_id:ids[0],body:'https://open.spotify.com/track/05TXKw2pxqf8ETIUdvEy6C',created_at:at(0,9)}];await setup(page,rows);await page.route('**/chat-preview/**',route=>route.fulfill({status:404,json:{error:'not_found'}}));await openChat(page);await expect(page.locator('.chat-link-spotify [data-preview-title]')).toHaveText('Prévia indisponível');await expect(page.locator('.chat-link-spotify')).toHaveAttribute('href',/open.spotify.com/);
});
