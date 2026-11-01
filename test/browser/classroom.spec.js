import { test, expect } from '@playwright/test';

test('aula completa: WebRTC, celular, modelo sincronizado, quiz, reconexão e ranking', async ({ browser }) => {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const host = await hostContext.newPage(), phone = await phoneContext.newPage();
  const errors = [];
  for (const page of [host, phone]) page.on('pageerror', e => errors.push(e.message));
  await host.goto('/?localSignal');
  await expect(host.getByRole('heading', { name: /Sua próxima grande/ })).toBeVisible();
  await host.locator('[data-studio-action="present"]').click();
  await expect(host.getByRole('dialog')).toBeVisible();
  await expect(host.locator('#room-qr')).toHaveAttribute('src', /^data:image/);
  const code = (await host.locator('.big-code').innerText()).replace(/\s/g, '');
  expect(code).toMatch(/^\d{6}$/);
  await host.getByRole('button', { name: 'Fechar convite' }).click();
  await phone.goto(`/?localSignal&s=${code}`);
  await phone.getByLabel('Como podemos chamar você?').fill('Ana');
  await phone.getByRole('button', { name: 'Avatar 🦊', exact: true }).click();
  await phone.getByRole('button', { name: 'Entrar na sala' }).click();
  await expect(phone.getByRole('heading', { name: 'Onde vivem os seus arquivos?' })).toBeVisible();
  await expect(host.locator('.participant-count')).toContainText('1');
  await host.getByRole('button', { name: 'Próximo', exact: true }).click();
  await expect(phone.getByRole('heading', { name: 'Uma pequena máquina de precisão.' })).toBeVisible();
  await expect(phone.getByRole('button', { name: 'HDD', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await host.getByRole('button', { name: 'Abrir modelo' }).click();
  await expect(phone.getByRole('button', { name: 'Fechar modelo' })).toBeVisible();
  // Reabrir a página recupera a identidade sem criar participante duplicado.
  await phone.reload();
  await expect(phone.getByRole('heading', { name: 'Uma pequena máquina de precisão.' })).toBeVisible();
  await expect(host.locator('.participant-count')).toContainText('1');
  // A pontuação por tempo é coberta nos testes da sala. Aqui o relógio
  // fixo impede que a renderização 3D em software esgote o prazo do quiz.
  await host.clock.setFixedTime(new Date());
  await host.getByRole('button', { name: /Ir para o quiz/ }).click();
  const answers = [1, 2, 3, 0, 2];
  for (let i = 0; i < answers.length; i++) {
    await expect(phone.locator('.quiz-count')).toContainText(String(i + 1));
    const option = phone.locator(`[data-answer="${answers[i]}"]`);
    await expect(option).toBeEnabled();
    await option.click();
    await expect(phone.locator('.answer-status')).toContainText('Resposta registrada');
    await expect(host.locator('.question-footer')).toContainText('1 de 1 responderam');
    // A rede ou o navegador podem gastar o tempo restante antes do clique.
    // Nesse caso, a revelação automática já satisfaz a mesma condição.
    try {
      await host.getByRole('button', { name: 'Revelar resposta', exact: true }).click({ timeout: 10000 });
    } catch (error) {
      await expect(host.locator('.answer-explanation')).toBeVisible({ timeout: 30000 });
    }
    await expect(phone.locator('.answer-explanation')).toContainText('Boa!');
    await host.getByRole('button', { name: i === 4 ? 'Ver resultado' : 'Próxima pergunta' }).click();
  }
  await expect(phone.getByRole('heading', { name: /Conhecimento que/ })).toBeVisible();
  await expect(host.locator('.place-1')).toContainText('Ana');
  await expect(host.locator('.full-ranking')).toContainText('5 acertos');
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await phoneContext.close(); await hostContext.close();
});

test('prévia funciona sem internet de sinalização e não precisa criar sala', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar a aula' }).click();
  await expect(page.getByText('Prévia · sem transmissão')).toBeVisible();
  await page.getByRole('button', { name: /Slide 5:/ }).click();
  await expect(page.getByRole('heading', { name: 'SATA, NVMe e a confusão do M.2.' })).toBeVisible();
  await page.getByRole('button', { name: 'Conferir explicação' }).click();
  await expect(page.locator('.discussion-answer')).toContainText('Não.');
});


test('build estático funciona no subdiretório do GitHub Pages, inclusive pelo convite', async ({ page }) => {
  const failures = [];
  page.on('pageerror', e => failures.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  await page.goto('http://127.0.0.1:4173/senaidendezas/?s=123456');
  await expect(page.getByLabel('Código da sala')).toHaveValue('123456');
  await page.locator('.studio-rail .rail-link[data-studio-action="library"]').click();
  await page.getByRole('button', { name: 'Explorar a aula' }).click();
  await expect(page.getByRole('heading', { name: 'Onde vivem os seus arquivos?' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  expect(failures).toEqual([]);
});
