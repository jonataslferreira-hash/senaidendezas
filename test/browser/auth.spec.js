import { test, expect } from '@playwright/test';
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'professor@example.com', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const token = () => [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })).toString('base64url'), 'test'].join('.');
const session = () => ({ access_token: token(), refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, user });
async function mockAuth(page) {
  const requests = [];
  await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/auth/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()); requests.push({ path: url.pathname, query: url.search, body: req.postDataJSON() });
    let body = {};
    if (url.pathname.endsWith('/token')) {
      if (req.postDataJSON()?.password === 'incorrecta') return route.fulfill({ status: 400, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' }, json: { code: 'invalid_credentials', msg: 'Invalid login credentials' } });
      body = session();
    } else if (url.pathname.endsWith('/signup')) body = user;
    else if (url.pathname.endsWith('/user')) body = user;
    await route.fulfill({ status: 200, json: body });
  });
  return requests;
}
test('conta entra, trata senha incorreta, restaura sessão e sai sem apagar biblioteca', async ({ page }) => {
  await mockAuth(page); await page.goto('/');
  await page.getByRole('button', { name: 'Entrar / Criar conta', exact: true }).click();
  await page.getByLabel('E-mail', { exact: true }).fill(user.email); await page.getByLabel('Senha', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar na conta', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
  await page.getByLabel('Senha', { exact: true }).fill('minhasenha123'); await page.getByRole('button', { name: 'Entrar na conta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha conta', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar conta', exact: true }).click();
  await page.reload(); await expect(page.locator('[data-account-profile]')).toHaveText(user.email);
  await page.getByRole('button', { name: user.email, exact: true }).click();
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('[data-account-profile]')).toHaveText('Entrar / Criar conta');
  await expect(page.locator('.lesson-card').first()).toBeVisible();
});
test('cadastro e recuperação enviam retorno à página correta, sem senha persistida', async ({ page }) => {
  const requests = await mockAuth(page); await page.goto('/?s=123456');
  await page.getByRole('button', { name: 'Entrar / Criar conta', exact: true }).click();
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByLabel('E-mail', { exact: true }).fill(user.email); await page.getByLabel('Senha', { exact: true }).fill('minhasenha123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('.account-message')).toContainText('confirmar o cadastro');
  const signup = requests.find(r => r.path.endsWith('/signup'));
  expect(new URLSearchParams(signup.query).get('redirect_to')).toBe('http://localhost:5173/');
  await page.getByRole('button', { name: 'Esqueci minha senha', exact: true }).click();
  await page.getByRole('button', { name: 'Recuperar senha', exact: true }).click();
  await expect(page.locator('.account-message')).toContainText('link de recuperação');
  expect(requests.some(r => r.path.endsWith('/recover'))).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('minhasenha123');
});
test('link de recuperação abre nova senha no celular e mantém o editor utilizável', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), page = await context.newPage();
  const requests = await mockAuth(page);
  await page.goto('/#access_token=' + token() + '&refresh_token=test-refresh-token&expires_in=3600&token_type=bearer&type=recovery');
  await expect(page.getByRole('heading', { name: 'Definir nova senha', exact: true })).toBeVisible();
  await page.getByLabel('Nova senha', { exact: true }).fill('novasenha123');
  await page.getByRole('button', { name: 'Definir nova senha', exact: true }).click();
  await expect(page.locator('.account-message')).toHaveText('Senha atualizada.');
  expect(requests.find(r => r.path.endsWith('/user') && r.body?.password)?.body.password).toBe('novasenha123');
  await page.screenshot({ path: 'test-results/account-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Fechar conta', exact: true }).click();
  await page.getByRole('button', { name: '+ Nova aula', exact: true }).click(); await expect(page.locator('.slide-designer')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
