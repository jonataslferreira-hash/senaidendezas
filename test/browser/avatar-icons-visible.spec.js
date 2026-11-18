import {test,expect} from '@playwright/test';

test('ícones e foto escolhida cabem nos botões de avatar',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));
  await page.goto('/?s=123456');
  const picker=page.locator('.avatar-picker');
  await expect(picker.locator('button svg').first()).toBeVisible();
  const metrics=await picker.locator('button svg').first().evaluate(svg=>{const s=svg.getBoundingClientRect(),b=svg.parentElement.getBoundingClientRect();return {width:s.width,height:s.height,left:s.left,right:s.right,top:s.top,bottom:s.bottom,button:{left:b.left,right:b.right,top:b.top,bottom:b.bottom}};});
  expect(metrics.width).toBeGreaterThanOrEqual(20);expect(metrics.height).toBeGreaterThanOrEqual(20);
  expect(metrics.left).toBeGreaterThanOrEqual(metrics.button.left);expect(metrics.right).toBeLessThanOrEqual(metrics.button.right);
  expect(metrics.top).toBeGreaterThanOrEqual(metrics.button.top);expect(metrics.bottom).toBeLessThanOrEqual(metrics.button.bottom);
  const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='#f00';ctx.fillRect(0,0,32,32);return canvas.toDataURL().split(',')[1]});
  await page.locator('[data-guest-photo]').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.getByRole('button',{name:'Usar esta foto'}).click();
  const photo=picker.locator('button[aria-label="Minha foto enviada"]');await expect(photo).toBeVisible();
  const fits=await photo.evaluate(el=>{const b=el.getBoundingClientRect(),i=el.querySelector('img').getBoundingClientRect();return {overflow:getComputedStyle(el).overflow, bw:b.width,bh:b.height,iw:i.width,ih:i.height};});
  expect(fits.overflow).toBe('hidden');expect(fits.iw).toBeLessThanOrEqual(fits.bw);expect(fits.ih).toBeLessThanOrEqual(fits.bh);
});
