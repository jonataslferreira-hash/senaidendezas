import {test,expect} from '@playwright/test';
import {mockAccounts} from './auth-fixture.js';
async function expectAligned(dialog){
 const title=dialog.locator('.dialog-title-row h2'),button=dialog.locator('.dialog-title-row .group-close'),svg=button.locator('svg');await expect(title).toBeVisible();await expect(button).toBeVisible();
 const a=await title.boundingBox(),b=await button.boundingBox(),s=await svg.boundingBox();expect(Math.abs((a.y+a.height/2)-(b.y+b.height/2))).toBeLessThan(1.5);expect(Math.abs((s.y+s.height/2)-(b.y+b.height/2))).toBeLessThan(1.5);expect(Math.abs((s.x+s.width/2)-(b.x+b.width/2))).toBeLessThan(1.5);expect(Math.abs(b.width-b.height)).toBeLessThan(1);
}
for(const width of [1568,390])test(`fechar fica centralizado no título em telas de ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:882});await mockAccounts(page);await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));await page.goto('/');await page.locator('.create-half').click();await page.getByLabel('Título da aula',{exact:true}).fill('Aula');await page.getByRole('button',{name:'Criar apresentação',exact:true}).click();
 if(width<600)await page.getByRole('button',{name:'Opções da aula'}).click();await page.locator('.editor-sharing > summary').click();await page.getByRole('button',{name:'Compartilhar',exact:true}).click();
 for(const style of ['modern','glass','aero','minimal']){await page.evaluate(style=>{document.documentElement.dataset.theme='forest';document.documentElement.dataset.uiStyle=style;document.documentElement.dataset.appearance='dark';},style);await expectAligned(page.locator('.publish-dialog'));}
});
