import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const out = process.env.SHOT_DIR || path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'opencode', 'shots');
mkdirSync(out, { recursive: true });

const decks = (process.argv[2] || 'strawberry-party').split(',');
const slidesToShoot = Number(process.argv[3] || 4);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 1 });

for (const id of decks) {
  await page.goto(`${base}/?page=templates&template=${id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.eshop-hero-canvas', { timeout: 20000 });
  await page.waitForTimeout(300);
  for (let i = 0; i < slidesToShoot; i++) {
    const thumb = page.locator(`.eshop-thumb[data-index="${i}"]`);
    if (await thumb.count()) { await thumb.click(); await page.waitForTimeout(120); }
    await page.locator('.eshop-hero-frame').screenshot({ path: path.join(out, `${id}-${String(i + 1).padStart(2, '0')}.png`) });
  }
  console.log('shot', id);
}
await browser.close();
