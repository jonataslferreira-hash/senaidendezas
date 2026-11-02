// Short recording of our local page, isolated from the user's browser.
import {chromium} from '@playwright/test';
import {mkdir,rename} from 'node:fs/promises';
await mkdir('test-results/motion-preview',{recursive:true});
const browser=await chromium.launch({args:['--disable-webgl','--mute-audio']});
try{
  const context=await browser.newContext({viewport:{width:1280,height:800},colorScheme:'dark',reducedMotion:'no-preference',recordVideo:{dir:'test-results/motion-preview',size:{width:1280,height:800}}});
  const page=await context.newPage();await page.goto('http://localhost:5173/');await page.locator('[data-showcase][data-playing=true]').waitFor();
  await page.waitForTimeout(5500);await page.getByRole('button',{name:'Entrar / Criar conta',exact:true}).click();await page.waitForTimeout(1500);await page.getByRole('button',{name:'Fechar conta',exact:true}).click();await page.waitForTimeout(3000);const video=page.video();await context.close();
  await rename(await video.path(),'test-results/showcase-motion.webm');
  console.log('Recorded test-results/showcase-motion.webm');
}finally{await browser.close();}
