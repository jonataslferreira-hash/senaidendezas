import {test,expect} from '@playwright/test';
import {mockAccounts,ids} from './auth-fixture.js';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));});
const wav=()=>{const w=Buffer.alloc(44+16000);w.write('RIFF');w.writeUInt32LE(w.length-8,4);w.write('WAVEfmt ',8);w.writeUInt32LE(16,16);w.writeUInt16LE(1,20);w.writeUInt16LE(1,22);w.writeUInt32LE(8000,24);w.writeUInt32LE(16000,28);w.writeUInt16LE(2,32);w.writeUInt16LE(16,34);w.write('data',36);w.writeUInt32LE(16000,40);return w;};

test('editor continua utilizável ao redimensionar e glass preserva cantos quadrados',async({page})=>{
 await page.route('https://**.vgmtreasurechest.com/**',r=>r.fulfill({body:wav(),contentType:'audio/wav'}));await page.goto('/');await page.locator('.lesson-card [data-studio-action=edit]').first().click();
 for(const width of [1440,1200,1098,999,901,900,600,390,1098]){
  await page.setViewportSize({width,height:835});await page.evaluate(()=>{document.documentElement.dataset.uiStyle='glass';});
  await expect(page.locator('.designer-stage')).toBeVisible();
  const geometry=await page.evaluate(()=>{const rect=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};const toolbar=document.querySelector('.designer-toolbar button:not([disabled])');const b=toolbar.getBoundingClientRect();const svg=toolbar.querySelector('svg')?.getBoundingClientRect();return {page:document.documentElement.scrollWidth,inner:innerWidth,editor:rect('.studio-editor'),workspace:rect('.editor-workspace'),slide:rect('.designer-stage'),identity:rect('.item-identity'),tools:rect('.item-tools'),radius:parseFloat(getComputedStyle(toolbar).borderTopLeftRadius),button:{top:b.top,bottom:b.bottom},svg:svg?{top:svg.top,bottom:svg.bottom}:null};});
  expect(geometry.page,`largura ${width}`).toBeLessThanOrEqual(geometry.inner+1);expect(geometry.slide.width).toBeGreaterThan(100);expect(geometry.slide.right).toBeLessThanOrEqual(width+1);
  expect(geometry.radius).toBeLessThanOrEqual(12);
  if(width>=901){expect(geometry.workspace.bottom).toBeLessThanOrEqual(836);expect(geometry.slide.bottom).toBeLessThanOrEqual(geometry.workspace.bottom+1);if(width<=1250)expect(geometry.identity.bottom).toBeLessThanOrEqual(geometry.tools.top+1);}
  if(geometry.svg)expect(Math.abs((geometry.button.top+geometry.button.bottom-geometry.svg.top-geometry.svg.bottom)/2)).toBeLessThan(4);
 }
});

test('mensagem respeita Liquid Glass e cor do perfil do remetente',async({page})=>{
 await mockAccounts(page);const contact='33333333-3333-4333-8333-333333333333';let senderStyle='glass';
 await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/rest/v1/**',route=>{const name=new URL(route.request().url()).pathname.split('/').pop();let data=[];if(name==='sl_list_contacts')data=[{id:contact,other_id:ids[1],other_name:'Bia',status:'accepted'}];if(name==='sl_direct_messages')data=[{id:'message-1',contact_id:contact,author_id:ids[1],author_name:'Bia',body:'Olá!',created_at:'2026-11-23T15:47:00Z'}];if(name==='sl_person_profile')data=[{display_name:'Bia',theme:'prism',ui_style:senderStyle}];return route.fulfill({json:data});});
 await page.goto('/');await page.locator('.studio-shell > .studio-rail [data-social-action=open]').click();await page.getByRole('button',{name:'Conversar com Bia'}).click();const message=page.locator('.chat-message:not(.mine)');await expect(message).toHaveAttribute('data-sender-style','glass');await expect(message).toHaveAttribute('style',/--sender-hue:\s*160/);
 const style=await message.locator('> div').evaluate(e=>({bg:getComputedStyle(e).backgroundImage,blur:getComputedStyle(e).backdropFilter,shadow:getComputedStyle(e).boxShadow}));expect(style.bg).toContain('gradient');expect(style.blur).toContain('blur');expect(style.shadow).toContain('inset');
 senderStyle='classic';await page.getByRole('button',{name:'Voltar aos contatos'}).click();await page.getByRole('button',{name:'Conversar com Bia'}).click();await expect(page.locator('.chat-message:not(.mine)')).toHaveAttribute('data-sender-style','classic');
});

test('falha de faixa externa permite tentar de novo com apenas um clique',async({page})=>{
 let fail=true;await page.route('https://**.vgmtreasurechest.com/**',r=>fail?r.abort():r.fulfill({body:wav(),contentType:'audio/wav'}));await page.goto('/');await page.locator('.lesson-card [data-studio-action=edit]').first().click();
 await expect(page.locator('.music-header-status')).toContainText('Não foi possível carregar');await expect(page.locator('[data-music-play]').first()).toHaveAttribute('aria-label','Tocar música');
 fail=false;await page.locator('[data-music-play]').first().click();await expect(page.locator('audio[data-editor-soundtrack]')).toHaveJSProperty('paused',false);await expect(page.locator('[data-music-play]').first()).toHaveAttribute('aria-label','Pausar música');
});

test('Spotify tenta ativar player e avisa quando o navegador não inicia',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sl-editor-music',JSON.stringify([{id:'spotify',kind:'spotify',title:'Faixa Spotify',artist:'Artista',url:'https://open.spotify.com/track/05TXKw2pxqf8ETIUdvEy6C'}])));
 await page.route('https://**.vgmtreasurechest.com/**',r=>r.fulfill({body:wav(),contentType:'audio/wav'}));
 await page.route('https://open.spotify.com/embed/iframe-api/v1',r=>r.fulfill({contentType:'application/javascript',body:`window.onSpotifyIframeApiReady({createController(host,options,callback){window.sp={plays:0,activations:0,listeners:{}};callback({addListener(n,f){window.sp.listeners[n]=f},activateElement(){window.sp.activations++},play(){window.sp.plays++},pause(){},destroy(){}});setTimeout(()=>window.sp.listeners.ready(),0)}});`}));
 await page.goto('/');await page.locator('.lesson-card [data-studio-action=edit]').first().click();await page.getByRole('button',{name:'Abrir músicas do editor'}).click();await page.locator('[data-music-action=select]').filter({hasText:'Faixa Spotify'}).click();
 await expect.poll(()=>page.evaluate(()=>window.sp?.plays||0)).toBe(1);expect(await page.evaluate(()=>window.sp.activations)).toBeGreaterThan(0);await expect(page.locator('.music-header-status')).toContainText('Spotify ainda não iniciou',{timeout:11000});await expect(page.locator('.spotify-editor-player')).toBeVisible();await expect(page.getByRole('button',{name:'Reprodução aleatória'})).toBeDisabled();await expect(page.getByRole('button',{name:/Repetição:/})).toBeDisabled();await expect(page.locator('.mp3-hint')).toContainText('pelo próprio Spotify');
 await page.evaluate(()=>window.sp.listeners.playback_update({data:{isPaused:false,position:1000,duration:30000}}));await expect(page.locator('[data-music-play]').first()).toHaveAttribute('aria-label','Pausar música');
});
