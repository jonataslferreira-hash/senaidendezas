import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(path.resolve('package.json'));
const {chromium}=require('@playwright/test');
const browser=await chromium.launch({args:['--disable-webgl','--mute-audio']});
try{
  const page=await browser.newPage({viewport:{width:1512,height:980}});
  await page.goto('http://localhost:5173/');
  await page.locator('#import-slides-file').setInputFiles(path.resolve('artifacts/HDD-e-SSD-SENAI.pptx'));
  const outline=page.locator('.outline-item');
  await outline.nth(3).waitFor({timeout:90000});
  assert.equal(await outline.count(),4);
  const canvas=page.locator('.canvas-editing .slide-canvas');
  const result=[];
  for(let i=0;i<4;i++){
    await outline.nth(i).click();
    await canvas.waitFor();
    const images=canvas.locator('img').filter({visible:true});
    if(i<3){
      await images.first().waitFor();
      await images.evaluateAll(nodes=>Promise.all(nodes.map(img=>img.decode())));
    }
    result.push(await canvas.locator('[data-type]').evaluateAll(nodes=>nodes.reduce((counts,node)=>{
      counts[node.dataset.type]=(counts[node.dataset.type]||0)+1;
      return counts;
    },{})));
    assert.ok(result[i].text>=3);
    assert.ok(!((await canvas.innerText()).includes('{{')));
    await canvas.screenshot({path:path.resolve('.codex-pptx-test/import-'+(i+1)+'.png')});
  }
  console.log("Tipos importados:", JSON.stringify(result));
  assert.ok(result.every(types=>types.image));
  await outline.nth(0).click();
  const title=canvas.locator('[data-type=text]').filter({hasText:'HDD e SSD'});
  await title.locator('.canvas-text').dblclick();
  const input=canvas.locator('.canvas-text[contenteditable]');
  await input.fill('Armazenamento no SENAI');
  await input.press('Tab');
  const image=canvas.locator('[data-type=image]');
  const layers = await image.evaluateAll(nodes => nodes.map(el => parseFloat(el.style.width)));
  const photo = image.nth(layers.indexOf(Math.max(...layers.filter(width=>width<90))));
  const before=await photo.evaluate(el=>parseFloat(el.style.left));
  const box=await photo.boundingBox();
  await page.mouse.move(box.x+40,box.y+80);
  await page.mouse.down();
  await page.mouse.move(box.x+72,box.y+80,{steps:5});
  await page.mouse.up();
  assert.ok(await photo.evaluate(el=>parseFloat(el.style.left))>before);
  await page.getByRole('button',{name:'Salvar aula',exact:true}).click();
  await page.reload();
  await canvas.getByText('Armazenamento no SENAI',{exact:true}).waitFor();
  assert.ok(await photo.evaluate(el=>parseFloat(el.style.left))>before);
  console.log(JSON.stringify(result));
}finally{await browser.close();}



