import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { deckTemplates } from '../src/slide-templates.js';

const tempDir = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'opencode');
const dir = process.env.SHOT_DIR || path.join(tempDir, 'shots');
const out = process.env.SHEET_OUT || path.join(tempDir, 'creative-contact-sheet.png');
const only = (process.env.SHEET_DECKS || '').split(',').filter(Boolean);
const catalogDecks = deckTemplates.filter(deck => deck.pages);
const decks = only.length ? catalogDecks.filter(deck => only.includes(deck.id)) : catalogDecks;

const groups = { '16:9': [], '9:16': [], '1:1': [], '4:3': [] };
for (const deck of decks) groups[deck.format].push(deck);

const section = (format, list) => `<section>
  <h2>${format} <span>${list.length} modelos</span></h2>
  <div class="rows">
    ${list.map(deck => `<article>
      <header><strong>${deck.name}</strong><span>${deck.theme.replace('atelier-', '')}</span></header>
      <div class="thumbs">${[1, 2, 3, 4].map(n => `<figure><img src="${pathToFileURL(path.join(dir, `${deck.id}-${String(n).padStart(2, '0')}.png`)).href}"><figcaption>${n}</figcaption></figure>`).join('')}</div>
    </article>`).join('')}
  </div>
</section>`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; background: #111018; color: #f4f1ff; font-family: 'Trebuchet MS', sans-serif; }
  h1 { margin: 0 0 8px; font-size: 30px; }
  h1 small { display: block; font-size: 14px; font-weight: 400; color: #a9a2bd; margin-top: 6px; }
  h2 { margin: 36px 0 14px; font-size: 22px; text-transform: uppercase; letter-spacing: .08em; }
  h2 span { font-size: 12px; color: #a9a2bd; letter-spacing: .04em; }
  .rows { display: grid; gap: 18px; }
  article { background: #1b1926; border: 1px solid #2e2a40; border-radius: 16px; padding: 14px; }
  article header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 10px; }
  article header strong { font-size: 16px; }
  article header span { font-size: 11px; color: #a9a2bd; text-transform: uppercase; letter-spacing: .08em; }
  .thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  figure { margin: 0; position: relative; background: #000; border-radius: 8px; overflow: hidden; }
  figure img { display: block; width: 100%; height: 100%; object-fit: contain; }
  figcaption { position: absolute; right: 6px; bottom: 6px; background: #000c; border-radius: 99px; padding: 1px 7px; font-size: 10px; }
</style></head><body>
  <h1>Storage Lab — catálogo criativo<small>${decks.length} modelos · capa + 3 páginas internas · capturas reais do navegador</small></h1>
  ${['16:9', '9:16', '1:1', '4:3'].filter(f => groups[f].length).map(f => section(f, groups[f])).join('')}
</body></html>`;

const htmlPath = path.join(tempDir, 'creative-contact-sheet.html');
writeFileSync(htmlPath, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2000, height: 1400 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
