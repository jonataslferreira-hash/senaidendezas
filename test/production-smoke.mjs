// One browser, no WebGL: verify the actual Pages build, including its subdirectory.
import { createServer } from 'node:http';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const root = path.resolve('dist'), prefix = '/senaidendezas/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith(prefix)) throw Error();
    const file = path.resolve(root, pathname.slice(prefix.length) || 'index.html');
    if (!file.startsWith(root + path.sep)) throw Error();
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ args: ['--disable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const errors = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
  const url = `http://127.0.0.1:${server.address().port}${prefix}`;
  await page.goto(url); await page.locator('.studio-shell').waitFor();
  assert.equal(await page.locator('canvas').count(), 0, 'Library should not initialize a WebGL renderer');
  assert.equal(await page.locator('.lab-logo').evaluate(img => img.complete && img.naturalWidth > 0), true);
  const favicon = await page.locator('link[rel=icon]').getAttribute('href');
  assert.equal((await page.request.get(new URL(favicon, url).href)).status(), 200);
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/library-light.png', fullPage: true, animations: 'disabled' });
  await page.evaluate(()=>localStorage.setItem('sl-appearance','dark'));await page.reload();await page.locator('.studio-shell').waitFor();
  await page.screenshot({ path: 'test-results/library-dark.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'test-results/library-mobile-dark.png', fullPage: true, animations: 'disabled' });
  await page.evaluate(()=>localStorage.setItem('sl-appearance','light'));await page.reload();await page.locator('.studio-shell').waitFor();
  await page.screenshot({ path: 'test-results/library-mobile-light.png', fullPage: true, animations: 'disabled' });
  assert.deepEqual(errors, []); assert.deepEqual(failed, []);
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>localStorage.setItem('sl-appearance','dark'));await page.reload();await page.locator('.studio-shell').waitFor();
  await page.locator('.lesson-card [data-studio-action=edit]').first().click();await page.locator('.slide-designer').waitFor();
  await page.screenshot({path:'test-results/editor-dark.png',fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'test-results/editor-mobile-dark.png',fullPage:true,animations:'disabled'});
  assert.deepEqual(errors, []);
  const gifWorker=(await readdir(path.join(root,'assets'))).find(name=>name.startsWith('avatar-gif.worker-')&&name.endsWith('.js'));
  assert.ok(gifWorker,'Animated avatar encoder must be emitted by the production build');
  const magic=await page.evaluate(async workerURL=>{const worker=new Worker(workerURL,{type:'module'});try{return await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('GIF worker timeout')),10000);worker.onerror=reject;worker.onmessage=e=>{clearTimeout(timeout);if(e.data.error)reject(Error(e.data.error));else resolve(String.fromCharCode(...new Uint8Array(e.data.buffer).slice(0,3)));};worker.postMessage({size:16,frames:[{pixels:new Uint8Array(16*16*4).fill(200).buffer,delay:125},{pixels:new Uint8Array(16*16*4).fill(80).buffer,delay:125}]});});}finally{worker.terminate();}},url+'assets/'+gifWorker);
  assert.equal(magic,'GIF');
  const broken = await browser.newPage();
  await broken.clock.install();
  await broken.route('**/assets/*.js', route => route.abort());
  await broken.goto(url); await broken.clock.fastForward(13000);
  await broken.getByRole('button', { name: 'Recarregar site', exact: true }).waitFor();
  console.log('Pages build: subdirectory, light/dark, mobile, logo/favicon, zero WebGL in library, no runtime/HTTP errors, recovery after failed script: OK');
} finally { await browser?.close(); server.close(); }
