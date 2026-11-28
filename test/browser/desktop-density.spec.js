import {test,expect} from '@playwright/test';
import {newLesson,newSlide} from '../../src/lessons.js';
import {createSlideFromTemplate} from '../../src/slide-templates.js';
import {defaultGame} from '../../src/stage-games.js';
test('muitas etapas permanecem acessíveis sem ocupar duas linhas no desktop a 100%',async({page})=>{
 await page.setViewportSize({width:1366,height:768});const lesson=newLesson(),first=createSlideFromTemplate('cover');lesson.slides=[first];lesson.activityBlocks=[{id:'slides',type:'slides',items:[first.id]}];
 for(const type of ['teams','challenge','flash','survival','raffle','tug','race']){const slide=newSlide();slide.game=defaultGame(type);lesson.slides.push(slide);lesson.activityBlocks.push({id:'stage-'+type,type,items:[slide.id]});}
 await page.addInitScript(data=>{localStorage.setItem('sl-tour','done');localStorage.setItem('storage-lab-lessons-v1',JSON.stringify([data]));},lesson);await page.goto('/');await page.locator('.lesson-card [data-studio-action=edit]').first().click();
 const tabs=page.locator('.editor-tabs'),row=page.locator('.editor-command-row'),actions=page.locator('.editor-top-actions');await expect(tabs).toBeVisible();const rect=await row.boundingBox();expect(rect.height).toBeLessThan(58);const info=await tabs.evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));expect(info.scroll).toBeGreaterThan(info.width);await expect(actions.getByRole('button',{name:'Apresentar'})).toBeVisible();
 await tabs.evaluate(e=>e.scrollLeft=e.scrollWidth);await expect(tabs.getByRole('button',{name:'Adicionar atividade'})).toBeInViewport();await tabs.getByRole('button',{name:'Opções da etapa Corrida'}).click();await expect(page.locator('.stage-options')).toBeVisible();const before=await tabs.evaluate(e=>e.scrollLeft);await page.locator('.stage-options [data-close]').click();expect(await tabs.evaluate(e=>e.scrollLeft)).toBeGreaterThanOrEqual(before-2);
});
