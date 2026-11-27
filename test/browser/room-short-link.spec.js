import {test,expect} from '@playwright/test';
import jsQR from 'jsqr';

test.beforeEach(async({page})=>{await page.addInitScript(()=>{localStorage.setItem('sl-tour','done');Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.copiedInvite=text}});});});
async function qrText(page){
 const {data,width,height}=await page.locator('#room-qr').evaluate(img=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return {data:Array.from(ctx.getImageData(0,0,c.width,c.height).data),width:c.width,height:c.height};});
 return jsQR(new Uint8ClampedArray(data),width,height)?.data;
}
test('link curto para digitar, cópia e QR direto usam a mesma sala',async({page})=>{
 let calls=0;await page.route('https://is.gd/create.php*',route=>{calls++;const url=new URL(route.request().url());expect(url.searchParams.get('callback')).toBe('roomShortResult');expect(url.searchParams.get('url')).toMatch(/^https:\/\/jonataslferreira-hash\.github\.io\/senaidendezas\/\?s=\d{6}$/);return route.fulfill({contentType:'application/javascript',body:'roomShortResult({"shorturl":"https://is.gd/Abc123"});'});});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.locator('.lesson-card [data-studio-action=present]').first().click();await expect(page.locator('.share-modal')).toBeVisible();
 await expect(page.getByLabel('Link de convite')).toHaveValue('https://is.gd/Abc123');await expect(page.locator('[data-short-link-status]')).toHaveText('Link curto para digitar ou copiar');
 const code=(await page.locator('.big-code').innerText()).replace(/\s/g,'');await expect(page.locator('#room-qr')).toHaveAttribute('src',/^data:image/);expect(await qrText(page)).toBe(`https://jonataslferreira-hash.github.io/senaidendezas/?s=${code}`);
 await page.getByRole('button',{name:'Copiar link'}).click();expect(await page.evaluate(()=>window.copiedInvite)).toBe('https://is.gd/Abc123');await page.screenshot({path:'test-results/invite-short.png',animations:'disabled'});await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});await page.setViewportSize({width:390,height:844});await expect(page.getByLabel('Link de convite')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/invite-short-mobile.png',animations:'disabled'});await page.setViewportSize({width:1280,height:720});
 await page.getByRole('button',{name:'Fechar convite'}).click();await page.locator('.room-code[data-action=share]').click({timeout:10000});await expect(page.getByLabel('Link de convite')).toHaveValue('https://is.gd/Abc123');expect(calls).toBe(1);
});
test('se o encurtador falhar o convite continua com link direto e QR',async({page})=>{
 await page.route('https://is.gd/create.php*',route=>route.fulfill({contentType:'application/javascript',body:'roomShortResult({"errorcode":3,"errormessage":"Rate limited"});'}));
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.locator('.lesson-card [data-studio-action=present]').first().click();await expect(page.locator('[data-short-link-status]')).toContainText('Link curto indisponível');
 const code=(await page.locator('.big-code').innerText()).replace(/\s/g,''),url=`https://jonataslferreira-hash.github.io/senaidendezas/?s=${code}`;await expect(page.getByLabel('Link de convite')).toHaveValue(url);await expect(page.locator('#room-qr')).toHaveAttribute('src',/^data:image/);expect(await qrText(page)).toBe(url);
 await page.getByRole('button',{name:'Copiar link'}).click();expect(await page.evaluate(()=>window.copiedInvite)).toBe(url);
});
test('JSONP roda isolado, valida resposta e ignora código remoto em caso de erro',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.route('https://is.gd/create.php*',route=>route.fulfill({contentType:'application/javascript',body:'try {parent.document.body.dataset.compromised="yes"} catch(e) {} roomShortResult({shorturl:"https://evil.example/phish"});'}));
 const short=await page.evaluate(async()=>{const {shortenRoomLink}=await import('/src/room-short-link.js');return shortenRoomLink('https://jonataslferreira-hash.github.io/senaidendezas/?s=123456',{timeout:4000});});expect(short).toBeNull();expect(await page.locator('body').getAttribute('data-compromised')).toBeNull();await expect(page.locator('iframe[title="Gerar link curto"]')).toHaveCount(0);
});
