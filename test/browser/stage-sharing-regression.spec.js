import {test,expect} from '@playwright/test';
import {mockAccounts} from './auth-fixture.js';
import {unpackLesson} from '../../src/codec-core.js';

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));await mockAccounts(page);});
async function project(page){await page.goto('/');await page.locator('.create-half').click();await page.getByLabel('Título da aula',{exact:true}).fill('Aula de revisão');await page.getByRole('button',{name:'Criar apresentação',exact:true}).click();}
async function addCards(page){await page.getByRole('button',{name:'Adicionar atividade'}).click();await page.locator('[data-add=flashcards]').click();}
async function share(page){await page.locator('.editor-sharing > summary').click();await page.getByRole('button',{name:'Compartilhar',exact:true}).click();}
test('cartão preenchido é publicado e etapa excluída não reaparece',async({page})=>{
 let snapshots=[];await page.route('https://storage-lab-files.lagujf.workers.dev/presentations/**',route=>route.fulfill({json:{ok:true}}));await page.route('https://storage-lab-files.lagujf.workers.dev/presentations',async route=>{snapshots.push(await unpackLesson(new Blob([route.request().postDataBuffer()])));return route.fulfill({status:201,json:{token:'11111111-1111-4111-8111-111111111111'}});});
 await project(page);await addCards(page);await page.locator('[data-game-field=fc-front]').fill('Pergunta');await page.locator('[data-game-field=fc-back]').fill('Resposta');await share(page);await page.getByRole('button',{name:'Criar link de apresentação'}).click();await expect(page.locator('#presentation-link')).toBeVisible();expect(snapshots[0].lesson.slides.find(s=>s.game?.type==='flashcards').game.cards).toEqual([{front:'Pergunta',back:'Resposta'}]);
 await page.getByLabel('Fechar compartilhamento').click();await page.getByRole('button',{name:'Opções da etapa Flashcards'}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();await share(page);await page.getByRole('button',{name:'Desativar link'}).click();await page.getByRole('button',{name:'Criar link de apresentação'}).click();await expect(page.locator('#presentation-link')).toBeVisible();expect(snapshots.at(-1).lesson.slides.some(s=>s.game?.type==='flashcards')).toBe(false);
});
test('erro localiza etapa incompleta sem ocultá-la',async({page})=>{
 await project(page);await addCards(page);await page.getByRole('tab',{name:/Slides/}).click();await share(page);await page.getByRole('button',{name:'Criar link de apresentação'}).click();await expect(page.locator('.publish-message')).toContainText('etapa Flashcards');await page.getByRole('button',{name:'Ir para o item com erro'}).click();await expect(page.locator('[data-game-field=fc-front]')).toBeVisible();
});
test('excluir última etapa de flashcards deixa slide editável',async({page})=>{
 await project(page);await addCards(page);await page.getByRole('button',{name:'Opções da etapa Slides'}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();await page.getByRole('button',{name:'Opções da etapa Flashcards'}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();await expect(page.getByRole('tab',{name:/Slides/})).toBeVisible();await expect(page.locator('[data-game-field=fc-front]')).toHaveCount(0);
});
test('aparência fica no perfil e Campos não aparece na barra',async({page})=>{
 await project(page);await expect(page.getByRole('button',{name:'Campos',exact:true})).toHaveCount(0);
 await page.locator('[data-account-action=open]').first().click();await expect(page.locator('.account-dialog')).not.toContainText('Você está conectado.');await expect(page.locator('.account-dialog')).not.toContainText('Aparência do site');await page.getByRole('button',{name:'✎ Editar perfil'}).click();await expect(page.locator('.account-dialog')).toContainText('Aparência do site');
});
test('flashcards antigos dentro de uma etapa de slides podem ser encontrados e editados',async({page})=>{
 await page.addInitScript(()=>{const id='card-slide';localStorage.setItem('storage-lab-lessons-v1',JSON.stringify([{version:1,id:'12345678-1234-4234-8234-123456789abc',title:'Aula antiga',slides:[{id:'base',kind:'text',title:'Slide'}, {id,kind:'text',title:'Revisão',game:{type:'flashcards',text:'Revisão',cards:[{front:'',back:''}]}}],questions:[],activityBlocks:[{id:'slides',type:'slides',items:['base',id]}]}]));});
 await page.goto('/');await page.locator('.lesson-card [data-studio-action=edit]').first().click();await share(page);await page.getByRole('button',{name:'Criar link de apresentação'}).click();await expect(page.locator('.publish-message')).toContainText('slide 2');await page.getByRole('button',{name:'Ir para o item com erro'}).click();await page.locator('[data-game-field=fc-front]').fill('Frente');await page.locator('[data-game-field=fc-back]').fill('Verso');await expect(page.locator('[data-game-field=fc-back]')).toHaveValue('Verso');
});
test('a confirmação diminui e restaura suavemente o volume da música do editor',async({page})=>{
 await project(page);await page.evaluate(()=>{const audio=document.querySelector('[data-editor-soundtrack]');audio.volume=.35;});await page.getByRole('button',{name:'Opções da etapa Slides'}).click();await page.getByRole('button',{name:'Excluir etapa',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.querySelector('[data-editor-soundtrack]').volume),{timeout:3000}).toBeLessThan(.1);await page.getByRole('button',{name:'Cancelar',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.querySelector('[data-editor-soundtrack]').volume),{timeout:3000}).toBeGreaterThan(.34);
});
