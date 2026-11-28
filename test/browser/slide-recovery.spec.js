import {test,expect} from '@playwright/test';
import {newLesson} from '../../src/lessons.js';
import {createSlideFromTemplate} from '../../src/slide-templates.js';
import {defaultGame} from '../../src/stage-games.js';

test('slide com flashcards associados pode ser recuperado, salvo e desfeito sem perda',async({page})=>{
 const lesson=newLesson(),slide=createSlideFromTemplate('cover');slide.title='A franquia';slide.game=defaultGame('flashcards');slide.game.cards=[{front:'Pergunta guardada',back:'Resposta guardada'}];lesson.slides=[slide];lesson.activityBlocks=[{id:'slides',type:'slides',items:[slide.id]}];
 await page.addInitScript(data=>{localStorage.setItem('sl-tour','done');if(!localStorage.getItem('storage-lab-lessons-v1'))localStorage.setItem('storage-lab-lessons-v1',JSON.stringify([data]));},lesson);
 await page.goto('/');await page.locator('.lesson-card [data-studio-action=edit]').first().click();
 await expect(page.locator('[data-game-field=fc-front]')).toHaveValue('Pergunta guardada');await expect(page.getByRole('button',{name:'Restaurar como slide'})).toBeVisible();
 await page.getByRole('button',{name:'Restaurar como slide'}).click();await expect(page.locator('[data-game-field=fc-front]')).toHaveCount(0);await expect(page.locator('.slide-recovery')).toContainText('Slide restaurado');await expect(page.locator('.designer-canvas, .slide-canvas, [data-canvas]').first()).toBeVisible();
 await page.getByRole('button',{name:'Salvar neste dispositivo',exact:true}).first().click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('storage-lab-lessons-v1'))[0]);expect(saved.slides[0].title).toBe('A franquia');expect(saved.slides[0].elements.length).toBe(slide.elements.length);expect(saved.slides[0].game).toBeUndefined();expect(saved.slides[0].recoveredGame.cards[0]).toEqual({front:'Pergunta guardada',back:'Resposta guardada'});
 await page.reload();await expect(page.getByRole('button',{name:'Desfazer restauração'})).toBeVisible();await page.getByRole('button',{name:'Desfazer restauração'}).click();await expect(page.locator('[data-game-field=fc-front]')).toHaveValue('Pergunta guardada');await page.getByRole('button',{name:'Salvar neste dispositivo',exact:true}).first().click();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('storage-lab-lessons-v1'))[0]);expect(saved.slides[0].game.cards[0].back).toBe('Resposta guardada');expect(saved.slides[0].recoveredGame).toBeUndefined();
});

test('abrir etapa vazia não cria atividade no slide selecionado de outra etapa',async({page})=>{
 const lesson=newLesson(),slide=createSlideFromTemplate('cover');slide.title='Slide original';lesson.slides=[slide];lesson.activityBlocks=[{id:'slides',type:'slides',items:[slide.id]},{id:'empty-cards',type:'flashcards',items:[]}];
 await page.addInitScript(data=>{localStorage.setItem('sl-tour','done');if(!localStorage.getItem('storage-lab-lessons-v1'))localStorage.setItem('storage-lab-lessons-v1',JSON.stringify([data]));},lesson);
 await page.goto('/');await page.locator('.lesson-card [data-studio-action=edit]').first().click();await page.getByRole('tab',{name:/Flashcards/}).click();await expect(page.locator('.editor-form-area')).toContainText('Etapa vazia');await page.getByRole('tab',{name:/Slides/}).click();await expect(page.getByRole('button',{name:'Restaurar como slide'})).toHaveCount(0);await expect(page.locator('[data-game-field=fc-front]')).toHaveCount(0);await expect(page.locator('.designer-canvas, .slide-canvas, [data-canvas]').first()).toBeVisible();
});
