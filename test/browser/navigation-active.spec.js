import {test,expect} from '@playwright/test';

test('a aba ativa tem fundo distinto, sem negrito, desde a biblioteca inicial',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));
 await page.goto('/');
 const nav=page.locator('#app > .studio-shell > .studio-rail nav');
 const library=nav.locator('[data-studio-action=library]');
 const join=nav.locator('[data-studio-action=join]');
 await expect(library).toHaveAttribute('aria-current','page');
 async function check(active,inactive){
  const styles=async el=>el.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,image:s.backgroundImage,weight:s.fontWeight};});
  const a=await styles(active), b=await styles(inactive);
  expect(a.background).not.toBe(b.background);
  expect(a.image).toBe('none');
  expect(a.weight).toBe(b.weight);
 }
 await check(library,join);
 for(const style of ['classic','glass','aero','minimal']){
  for(const appearance of ['light','dark']){
   await page.locator('html').evaluate((el,[style,appearance])=>{el.dataset.uiStyle=style;el.dataset.appearance=appearance;},[style,appearance]);
   await check(library,join);
  }
 }
 await join.click();
 await expect(join).toHaveAttribute('aria-current','page');
 await expect(library).not.toHaveAttribute('aria-current','page');
 await check(join,library);
 await library.click();
 await expect(library).toHaveAttribute('aria-current','page');
 await expect(join).not.toHaveAttribute('aria-current','page');
 await check(library,join);
});
