import {createProject} from './project-fixture.js';
import { test, expect } from '@playwright/test';

test('aparência persiste e enquete do editor abre, recebe voto e volta ao slide na prévia', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' }); await page.goto('/');
  await page.evaluate(async()=>{const {applyAppearance}=await import('/src/appearance.js');applyAppearance('dark');});
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');
  await page.screenshot({ path: 'test-results/library-dark.png', fullPage: true, animations: 'disabled' });
  await page.evaluate(async()=>{const {applyAppearance}=await import('/src/appearance.js');applyAppearance('light');});
  await createProject(page);
  await page.getByText('Atividades e passagem deste slide', { exact: false }).click();
  await page.getByLabel('Adicionar enquete a este slide').check();
  await page.getByLabel('Pergunta da enquete', { exact: true }).fill('Querem explorar mais?');
  await page.getByLabel('Opções (uma por linha, de 2 a 4)').fill('Sim!\nPodemos seguir');
  await page.getByLabel('Transição ao entrar neste slide').selectOption('fade');
  await page.getByRole('button', { name: 'Salvar aula', exact: true }).click();
  await page.getByRole('button', { name: 'Prévia', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir enquete', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Querem explorar mais?' })).toBeVisible();
  await page.locator('[data-poll-vote="0"]').click();
  await expect(page.locator('.poll-stage')).toContainText('Seu voto está registrado');
  await expect(page.locator('[data-poll-vote="0"]')).toContainText('100%');
  await page.screenshot({ path: 'test-results/poll-desktop.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/poll-mobile.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Encerrar votação' }).click();
  await page.getByRole('button', { name: 'Voltar ao slide 1' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-transition', 'fade');
});

test('editor visual permite mudar a ordem dos slides sem perder conteúdo ao recarregar', async ({ page }) => {
  await page.goto('/'); await page.locator('.lesson-card [data-studio-action=edit]').first().click();
  const title = await page.locator('.outline-item.active strong').innerText();
  await page.getByRole('button', { name: 'Mover slide para baixo' }).click();
  await expect(page.locator('.outline-item').nth(1).locator('strong')).toHaveText(title);
  await page.getByRole('button', { name: 'Salvar aula', exact: true }).click();
  await page.reload();
  await expect(page.locator('.outline-item').nth(1).locator('strong')).toHaveText(title);
});
