import {test,expect} from '@playwright/test';
import jsQR from 'jsqr';

test.beforeEach(async({page})=>{await page.addInitScript(()=>{localStorage.setItem('sl-tour','done');Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.copiedInvite=text}});});});
async function qrText(page){
 const {data,width,height}=await page.locator('#room-qr').evaluate(img=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return {data:Array.from(ctx.getImageData(0,0,c.width,c.height).data),width:c.width,height:c.height};});
 return jsQR(new Uint8ClampedArray(data),width,height)?.data;
}
test('convite curto leva à mesma sala, com QR e cópia direta preservados',async({browser,page})=>{
 await page.goto('/?localSignal',{waitUntil:'domcontentloaded'});await page.locator('.lesson-card [data-studio-action=present]').first().click();await expect(page.locator('.share-modal')).toBeVisible();
 const code=(await page.locator('.big-code').innerText()).replace(/\s/g,'');
 // A conexão local já está aberta. Simular somente o endereço público para o
 // convite, sem depender do sinalizador público durante o teste.
 await page.getByRole('button',{name:'Fechar convite'}).click();await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();history.replaceState(history.state,'','/');});
 await page.locator('.room-code[data-action=share]').click();await expect(page.locator('.share-modal')).toBeVisible();
 const direct=`https://jonataslferreira-hash.github.io/senaidendezas/?s=${code}`,short=`https://is.gd/h4bAV2#s=${code}`;
 await expect(page.getByLabel('Link de convite')).toHaveValue(short);await expect(page.locator('[data-short-link-status]')).toHaveText('Link curto para digitar ou copiar');
 await expect(page.locator('#room-qr')).toHaveAttribute('src',/^data:image/);expect(await qrText(page)).toBe(direct);
 await page.getByRole('button',{name:'Copiar link',exact:true}).click();expect(await page.evaluate(()=>window.copiedInvite)).toBe(short);
 await page.getByRole('button',{name:'Copiar link direto'}).click();expect(await page.evaluate(()=>window.copiedInvite)).toBe(direct);
 await page.setViewportSize({width:390,height:844});await expect(page.getByLabel('Link de convite')).toHaveValue(short);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const student=await context.newPage();await student.addInitScript(()=>localStorage.setItem('sl-tour','done'));
 // O 302 real do is.gd foi verificado em navegador no CI; a simulação aqui
 // aponta ao servidor de sinalização local e mantém o fragmento como um 302 real.
 await student.route('https://is.gd/h4bAV2',route=>route.fulfill({status:302,headers:{location:'http://localhost:5173/?localSignal'}}));
 await student.goto(short,{waitUntil:'domcontentloaded'});await expect(student.locator('#room-code')).toHaveValue(code);
 await expect(student).toHaveURL(new RegExp('s='+code));await student.getByLabel('Como podemos chamar você?').fill('Lia');await student.getByRole('button',{name:'Entrar na sala',exact:true}).click();
 await expect(student.locator('#app')).toHaveAttribute('data-role','student',{timeout:45000});await context.close();
});
test('atalho para o quiz continua funcionando após fechar o convite',async({page})=>{
 await page.goto('/?localSignal',{waitUntil:'domcontentloaded'});await page.locator('.lesson-card [data-studio-action=present]').first().click();
 await expect(page.locator('.share-modal')).toBeVisible();await expect(page.locator('.share-modal')).not.toContainText('A AULA FICA MELHOR JUNTO');
 const code=(await page.locator('.big-code').innerText()).replace(/\s/g,'');await expect(page.locator('#room-qr')).toHaveAttribute('src',/^data:image/);expect(await qrText(page)).toBe(`${new URL(page.url()).origin}/?localSignal=&s=${code}`);
 await page.getByRole('button',{name:'Fechar convite'}).click();await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});const shortcut=page.getByRole('button',{name:'Ir para o quiz'});await expect(shortcut).toBeVisible();await shortcut.click();await expect(page.locator('.quiz-lobby')).toBeVisible();
});
