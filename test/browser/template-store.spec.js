import { test, expect } from '@playwright/test';

test('voltar ao catálogo restaura a rolagem anterior aos detalhes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?page=templates');
  await expect(page.locator('[data-template-store]')).toBeVisible();

  const card = page.locator('.tstore-card').nth(15).locator('.tstore-card-media');
  await page.evaluate(() => window.scrollTo(0, 1100));
  await card.evaluate(element => {
    element.addEventListener('click', () => {
      window.__catalogScrollBeforeDetail = window.scrollY;
    }, { once: true });
  });
  await card.click();
  await expect(page.locator('.tstore-detail-page')).toBeVisible();
  const catalogScrollY = await page.evaluate(() => window.__catalogScrollBeforeDetail);
  expect(catalogScrollY).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Voltar ao catálogo' }).click();
  await expect(page.locator('.tstore-detail-page')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(catalogScrollY);
});

test('prévia publicada do catálogo carrega imagem local em alta resolução', async ({ page }) => {
  await page.goto('/?page=templates&template=indie-arcade');
  const image = page.locator('.eshop-hero-canvas .slide-canvas img').first();
  await expect.poll(() => image.evaluate(node => node.naturalWidth)).toBeGreaterThanOrEqual(1280);
});
