import { chromium } from '@playwright/test';
import * as pptx from '@office-kit/pptx';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sources = [
  ['indie-arcade', 'Cute Y2K Game Console Background Slides', 'sc03207/cute-y2k-game-console-background-slides'],
  ['morning-vlog', 'Aesthetic Life Wrapped Presentation', 'sc04309/life-wrapped-presentation'],
  ['concert-pocket', 'Minimal Pop Music Festival Slides', 'sc00830/pop-music-festival'],
  ['bloom-feed', 'Amazing Botanical Slides', 'sc00039/constance-free-presentation-template'],
  ['after-dark-gallery', 'Classic Perfect Slides for a Movie Review', 'sc00978/perfect-slides-for-a-movie-review'],
  ['sunset-invite', 'Watercolor All About Holi Festival Slides', 'sc04114/all-about-holi-festival-slides'],
  ['lemonade-cards', 'Illustrated Food and Nutrition Slides', 'sc04226/food-and-nutrition-slides'],
  ['pixel-stickers', 'Cute Pixelated Farm Harvest Game Slides', 'sc02857/cute-farm-harvest-game-slides']
];

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5174';
const only = new Set((process.env.ONLY || '').split(',').filter(Boolean));
const force = new Set((process.env.FORCE || '').split(',').filter(Boolean));
const selected = only.size ? sources.filter(([id]) => only.has(id)) : sources;
const publicRoot = path.resolve('public', 'assets', 'slidescarnival');
const deckRoot = path.join(publicRoot, 'decks');
const previewRoot = path.join(publicRoot, 'previews');
const indexPath = path.resolve('src', 'creative-slide-imported-data.json');
const licenseUrl = 'https://creativecommons.org/licenses/by/4.0/';
const selectionVersion = 4;
const maxSourceBytes = 110 * 1024 * 1024;
const maxLessonBytes = 48 * 1024 * 1024;
const failures = [];

function formatFor(pageWidth, pageHeight) {
  const ratio = pageWidth / pageHeight;
  return Math.abs(ratio - 16 / 9) < 0.02 ? '16:9'
    : Math.abs(ratio - 9 / 16) < 0.02 ? '9:16'
      : Math.abs(ratio - 1) < 0.02 ? '1:1' : '4:3';
}

function sourceMetadata(id, sourceTitle, sourcePath, slides, sourceSlideCount = slides.length, selectedSlideIndexes = slides.map((_, index) => index)) {
  const { pageWidth, pageHeight } = slides[0];
  return {
    collection: 'slidescarnival',
    collectionLabel: 'SlidesCarnival',
    author: 'SlidesCarnival',
    license: 'CC BY 4.0',
    licenseShort: 'CC BY 4.0',
    sourceTitle,
    sourceUrl: `https://www.slidescarnival.com/download/${sourcePath}/pptx`,
    licenseUrl,
    sourceDeckUrl: `assets/slidescarnival/decks/${id}.json`,
    sourceSlideCount,
    selectedSlideIndexes,
    format: formatFor(pageWidth, pageHeight),
    pageWidth,
    pageHeight,
    slideTitles: slides.map((slide, slideIndex) => slide.title || `Slide ${slideIndex + 1}`),
    previewSlides: slides.map((slide, slideIndex) => ({
      title: slide.title || `Slide ${slideIndex + 1}`,
      url: slide.image || `assets/slidescarnival/previews/${id}-${String(slideIndex + 1).padStart(2, '0')}.webp`
    }))
  };
}

function selectSlideIndexes(presentation) {
  const sourceSlides = pptx.getSlides(presentation);
  if (sourceSlides.length <= 8) return sourceSlides.map((_, index) => index);
  const credits = sourceSlides.map((slide, index) => {
    const title = pptx.getSlideTitle(slide) || '';
    const text = pptx.getSlideShapes(slide).map(shape => pptx.getShapeText(shape) || '').join(' ');
    const attribution = /\bcredits?\b|\battributions?\b/i.test(title)
      || /\bcredits?\b|\battributions?\b/i.test(text) && /SlidesCarnival|Pexels|Pixabay|Unsplash|free fonts/i.test(text);
    const resourcePage = /\b(?:resource|source) page\b/i.test(title)
      || /Use these design resources in your Canva Presentation/i.test(text);
    const assetCredits = /\b(?:Pexels|Pixabay|Unsplash|Freepik)\b/i.test(text);
    const fontCredits = /\bfonts? in (?:this|the) presentation\b/i.test(title)
      || /This presentation template uses the following free fonts/i.test(text);
    return { index, isCreditPage: attribution || resourcePage || assetCredits || fontCredits };
  }).filter(({ index, isCreditPage }) => index >= 7 && isCreditPage)
    .map(({ index }) => index);

  const selected = new Set([...Array(7).keys(), ...credits]);
  if (!credits.length) selected.add(sourceSlides.length - 1);
  for (let index = 7; selected.size < 8 && index < sourceSlides.length; index++) selected.add(index);
  return [...selected].sort((a, b) => a - b);
}

await mkdir(deckRoot, { recursive: true });
await mkdir(previewRoot, { recursive: true });

let index = {};
try {
  index = JSON.parse(await readFile(indexPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const retainedSourceIds = new Set(sources.map(([id]) => id));
index = Object.fromEntries(Object.entries(index).filter(([id]) => retainedSourceIds.has(id)));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(() => {
  new MutationObserver(() => {
    const dialog = document.querySelector('.pptx-font-dialog');
    if (!dialog?.open || dialog.dataset.autoApplied) return;
    dialog.dataset.autoApplied = 'true';
    for (const select of dialog.querySelectorAll('select')) select.value = 'Arial';
    dialog.querySelector('button')?.click();
  }).observe(document, { childList: true, subtree: true });
});
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

try {
  for (const [id, sourceTitle, sourcePath] of selected) {
    const deckPath = path.join(deckRoot, `${id}.json`);
    try {
      const existing = JSON.parse(await readFile(deckPath, 'utf8'));
      if (!force.has(id) && existing.selectionVersion === selectionVersion && Array.isArray(existing.slides) && existing.slides.length >= 8
        && existing.slides.every(slide => slide.image?.startsWith(`assets/slidescarnival/previews/${id}-`))) {
        index[id] = sourceMetadata(id, sourceTitle, sourcePath, existing.slides, existing.sourceSlideCount, existing.selectedSlideIndexes);
        console.log(`Reusing converted ${id}: ${existing.slides.length} slides.`);
        continue;
      }
    } catch (error) {
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    }

    console.log(`Downloading ${id}: ${sourceTitle}`);
    try {
    const response = await fetch(`https://www.slidescarnival.com/download/${sourcePath}/pptx`);
    if (!response.ok) throw Error(`${id}: download failed (${response.status}).`);
    const length = Number(response.headers.get('content-length')) || 0;
    if (length > maxSourceBytes) throw Error(`${id}: source exceeds the 110 MB import safety limit.`);
    const pptxBytes = Buffer.from(await response.arrayBuffer());
    if (pptxBytes.length < 4 || pptxBytes[0] !== 0x50 || pptxBytes[1] !== 0x4b) {
      throw Error(`${id}: source response is not a valid PPTX file.`);
    }
    if (pptxBytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) < 0) {
      throw Error(`${id}: source PPTX is missing its ZIP end record.`);
    }
    const presentation = await pptx.loadPresentation(new Uint8Array(pptxBytes), {
      limits: { maxEntries: 10000, maxTotalUncompressedBytes: 150 * 1024 * 1024, maxXmlPartBytes: 8 * 1024 * 1024, maxTotalXmlBytes: 40 * 1024 * 1024 }
    });
    const sourceSlideCount = pptx.getSlides(presentation).length;
    const selectedSlideIndexes = selectSlideIndexes(presentation);

    const sourceFile = path.join(publicRoot, `${id}-source.pptx`);
    await writeFile(sourceFile, pptxBytes);
    let slides;
    try {
      slides = await page.evaluate(async ({ sourceUrl, slideIndexes }) => {
        const response = await fetch(sourceUrl);
        if (!response.ok) throw Error(`Source transfer failed (${response.status}).`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const { editablePptx } = await import('/src/pptx-import.js');
        const imported = await editablePptx(bytes, { progress: () => {}, slideIndexes });
        if (imported.length < 8) throw Error(`Imported source has only ${imported.length} slides.`);

        async function webp(source, maxEdge, quality) {
          if (!source?.startsWith('data:image/')) return source;
          const image = new Image();
          image.src = source;
          await image.decode();
          const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          const result = canvas.toDataURL('image/webp', quality);
          return result.startsWith('data:image/webp;') ? result : source;
        }

        for (const slide of imported) {
          slide.image = await webp(slide.image, 1280, 0.9);
          for (const element of slide.elements || []) {
            if (element.type === 'image') element.image = await webp(element.image, 1600, 0.9);
          }
        }
        return imported;
      }, { sourceUrl: `/assets/slidescarnival/${id}-source.pptx`, slideIndexes: selectedSlideIndexes });
    } finally {
      await unlink(sourceFile).catch(error => {
        if (error.code !== 'ENOENT') throw error;
      });
    }

    for (const [slideIndex, slide] of slides.entries()) {
      if (slide.title !== `Slide ${slideIndex + 1}`) continue;
      const heading = (slide.elements || [])
        .filter(element => element.type === 'text' && element.text?.trim())
        .sort((a, b) => b.fontSize - a.fontSize)[0]?.text
        ?.trim().split(/\r?\n/)[0].slice(0, 100);
      if (heading) slide.title = heading;
    }

    const first = slides[0];
    if (!first?.pageWidth || !first?.pageHeight) throw Error(`${id}: missing slide dimensions.`);
    const pageWidth = first.pageWidth;
    const pageHeight = first.pageHeight;
    if (slides.some(slide => slide.pageWidth !== pageWidth || slide.pageHeight !== pageHeight)) {
      throw Error(`${id}: source has inconsistent slide dimensions.`);
    }
    const format = formatFor(pageWidth, pageHeight);

    for (const [slideIndex, slide] of slides.entries()) {
      const match = slide.image?.match(/^data:image\/webp;base64,(.+)$/s);
      if (!match) throw Error(`${id}: slide ${slideIndex + 1} has no local WebP preview.`);
      const previewName = `${id}-${String(slideIndex + 1).padStart(2, '0')}.webp`;
      const previewUrl = `assets/slidescarnival/previews/${previewName}`;
      await writeFile(path.join(previewRoot, previewName), Buffer.from(match[1], 'base64'));
      slide.image = previewUrl;
    }

    const lessonBytes = Buffer.byteLength(JSON.stringify({ slides }));
    if (lessonBytes > maxLessonBytes) {
      throw Error(`${id}: converted lesson is ${(lessonBytes / 1024 / 1024).toFixed(1)} MB; limit is 48 MB.`);
    }
    await writeFile(path.join(deckRoot, `${id}.json`), JSON.stringify({ selectionVersion, sourceSlideCount, selectedSlideIndexes, slides }));

    index[id] = sourceMetadata(id, sourceTitle, sourcePath, slides, sourceSlideCount, selectedSlideIndexes);
    console.log(`Imported ${id}: ${slides.length} of ${sourceSlideCount} editable slides (${format}), ${(lessonBytes / 1024 / 1024).toFixed(1)} MB.`);
    } catch (error) {
      failures.push({ id, error });
      console.error(`Skipped ${id}: ${error.message}`);
    }
  }
} finally {
  await browser.close();
}

await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n');
console.log(`Updated ${indexPath} with ${Object.keys(index).length} source decks.`);
if (failures.length) {
  console.error(`Import incomplete: ${failures.map(({ id }) => id).join(', ')}`);
  process.exitCode = 1;
}
