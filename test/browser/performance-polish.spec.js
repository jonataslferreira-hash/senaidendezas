import {test,expect} from '@playwright/test';

test('fundo do catálogo limita atualizações e respeita mudança de movimento reduzido',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('sl-tour','done');const put=CanvasRenderingContext2D.prototype.putImageData;window.fluidFrames=0;CanvasRenderingContext2D.prototype.putImageData=function(...args){window.fluidFrames++;return put.apply(this,args);};});
 await page.setViewportSize({width:390,height:844});await page.goto('/?page=templates',{waitUntil:'domcontentloaded'});await expect(page.locator('[data-tstore-fluid]')).toBeVisible();
 await page.waitForTimeout(300);const before=await page.evaluate(()=>window.fluidFrames);await page.waitForTimeout(1100);const count=await page.evaluate(()=>window.fluidFrames)-before;expect(count).toBeGreaterThan(5);expect(count).toBeLessThanOrEqual(40);
 await page.evaluate(()=>document.documentElement.dataset.motion='reduced');await page.waitForTimeout(200);const paused=await page.evaluate(()=>window.fluidFrames);await page.waitForTimeout(500);expect(await page.evaluate(()=>window.fluidFrames)).toBe(paused);
 await page.evaluate(()=>document.documentElement.dataset.motion='normal');await page.waitForTimeout(700);expect(await page.evaluate(()=>window.fluidFrames)).toBeGreaterThan(paused+5);
});

test('QR da sala é gerado sob demanda e mantém o link de convite',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));await page.goto('/?localSignal',{waitUntil:'domcontentloaded'});
 await page.locator('.lesson-card [data-studio-action=present]').first().click();await expect(page.locator('.share-modal')).toBeVisible();
 const qr=page.locator('#room-qr');await expect(qr).toHaveAttribute('src',/^data:image/);const code=(await page.locator('.big-code').innerText()).replace(/\s/g,'');expect(code).toMatch(/^\d{6}$/);expect(new URL(await page.getByLabel('Link de convite').inputValue()).searchParams.get('s')).toBe(code);
 await page.getByRole('button',{name:'Fechar convite'}).click();
});

test('recusa de câmera exibe orientação para usar o código da sala',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('sl-tour','done');navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
 await page.goto('/?page=join',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/Ler QR Code/}).click();
 await expect(page.getByText('Permita a câmera para ler o QR Code. Você também pode digitar o código da sala.')).toBeVisible();
});
