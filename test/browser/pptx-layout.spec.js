import { test, expect } from '@playwright/test';
import { pptxFixture } from '../document-fixtures.js';

test('importação mantém coordenadas do texto e preview nítido', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async base64 => {
    const { editablePptx } = await import('/src/pptx-import.js');
    const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    const [slide] = await editablePptx(bytes, { progress: () => {} });
    const title = slide.elements.find(element => element.type === 'text');
    const image = new Image();
    image.src = slide.image;
    await image.decode();
    return { x: title.x, y: title.y, w: title.w, h: title.h, previewWidth: image.naturalWidth };
  }, (await pptxFixture()).toString('base64'));

  expect(result.x).toBeCloseTo(6, 0);
  expect(result.y).toBeCloseTo(13.33, 0);
  expect(result.w).toBeCloseTo(75, 0);
  expect(result.h).toBeCloseTo(17.33, 0);
  expect(result.previewWidth).toBeGreaterThanOrEqual(1280);
});
