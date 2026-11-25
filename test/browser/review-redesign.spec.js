import {test,expect} from '@playwright/test';
import {demoLesson} from '../../src/lessons.js';
test('cartões de revisão acomodam nomes compridos no celular e continuam navegáveis',async({page})=>{
 const lesson=demoLesson();lesson.title='Uma apresentação com um título muito comprido para testar a leitura no celular sem cortar o conteúdo';
 await page.setViewportSize({width:390,height:844});await page.addInitScript(l=>{localStorage.setItem('sl-tour','done');localStorage.setItem('storage-lab-lessons-v1',JSON.stringify([l]));},lesson);
 await page.goto('/?page=review',{waitUntil:'domcontentloaded'});
 const card=page.locator('.review-deck');await expect(card).toBeVisible();await expect(card).toContainText(lesson.title);
 const fits=await card.locator('strong').evaluate(el=>el.scrollHeight<=el.clientHeight);expect(fits).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await card.click();await expect(page.locator('.review-card')).toBeVisible();await page.locator('[data-studio-action=review-answer]').first().click();await expect(page.locator('.review-result')).toBeVisible();
 await page.locator('[data-studio-action=review-back]').click();await expect(card).toBeVisible();
});
