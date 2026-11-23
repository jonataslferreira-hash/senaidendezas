import {test,expect} from '@playwright/test';
import {demoLesson} from '../../src/lessons.js';
import {compressJSONText,unpackLesson} from '../../src/codec-core.js';

test('revisão no menu permite responder, refazer e navegar sem alterar a biblioteca',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));
 await page.goto('/');const before=await page.evaluate(()=>localStorage.getItem('storage-lab-lessons-v1'));
 await page.locator('.studio-shell > .studio-rail [data-studio-action=review]').click();
 await expect(page.getByRole('heading',{name:'Revisar questões'})).toBeVisible();
 await page.locator('.review-list button').first().click();
 await expect(page.locator('.review-card')).toBeVisible();
 await page.locator('[data-studio-action=review-answer]').first().click();
 await expect(page.locator('.review-card [role=status]')).toBeVisible();
 await page.locator('[data-studio-action=review-retry]').click();
 await expect(page.locator('.review-card [role=status]')).toHaveCount(0);
 await page.locator('[data-studio-action=review-next]').click();
 await expect(page.locator('.review-page')).toContainText('Questão 2');
 expect(await page.evaluate(()=>localStorage.getItem('storage-lab-lessons-v1'))).toBe(before);
});

test('link permite cópia somente quando o dono marcou, salvando quiz íntegro na conta',async({page})=>{
 const lesson=demoLesson(),uid='22222222-2222-4222-8222-222222222222',user={id:uid,email:'owner@example.com',aud:'authenticated',app_metadata:{},user_metadata:{display_name:'Pessoa'}};
 const jwt=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
 await page.addInitScript(({user,jwt})=>{localStorage.setItem('sl-tour','done');localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token',JSON.stringify({user,access_token:jwt,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600}));},{user,jwt});
 await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**',route=>route.fulfill({json:route.request().url().endsWith('/user')?user:[]}));
 let copied;await page.route('https://storage-lab-files.lagujf.workers.dev/lessons/**',async route=>{if(route.request().method()==='PUT'){copied=await unpackLesson(new Blob([route.request().postDataBuffer()]));return route.fulfill({json:{ok:true}});}return route.fulfill({json:[]});});
 const link=async allow=>{const packed=await compressJSONText(JSON.stringify({publicPresentation:1,allowCopy:allow,lesson}));return '/?presentation=portable#deck='+Buffer.from(packed.buffer).toString('base64url');};
 await page.goto(await link(false));await expect(page.locator('#app')).toHaveAttribute('data-read-only','true');await expect(page.locator('[data-action=save-public-copy]')).toHaveCount(0);
 await page.goto(await link(true));await expect(page.locator('[data-action=save-public-copy]')).toBeVisible();await page.locator('[data-action=save-public-copy]').click();
 await expect.poll(()=>copied?.questions?.length).toBe(lesson.questions.length);expect(copied.id).not.toBe(lesson.id);expect(copied.title).toContain('cópia');
 await expect(page.locator('#toast')).toContainText('salva na sua conta');
});
