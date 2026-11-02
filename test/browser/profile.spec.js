import { test, expect } from '@playwright/test';
test('perfil salva nome, foto otimizada e preferências; senha exige confirmação e não fica no armazenamento', async ({ page }) => {
  page.on('pageerror', error => console.log('Profile UI:', error.message));
  const uid = '11111111-1111-4111-8111-111111111111', email = 'professor@example.com';
  let user = { id: uid, email, aud: 'authenticated', app_metadata: {}, user_metadata: { display_name: 'Professor' } }, image, passwordSaved;
  const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'test'].join('.');
  await page.addInitScript(({ user, token }) => localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token', JSON.stringify({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, user })), { user, token });
  await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/storage/v1/object/')) {
      if (request.method() === 'POST') {
        const form = await new Request('http://test', { method: 'POST', body: request.postDataBuffer(), headers: { 'content-type': request.headers()['content-type'] } }).formData();
        const file = [...form.values()].find(value => typeof value !== 'string'); image = Buffer.from(await file.arrayBuffer());
        expect(file.type).toBe('image/webp'); expect(file.size).toBeLessThan(256 * 1024);
        return route.fulfill({ json: { Key: 'avatar.webp', Id: 'avatar' } });
      }
      return route.fulfill({ contentType: 'image/webp', body: image });
    }
    if (url.pathname.endsWith('/token')) return route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user } });
    if (url.pathname.endsWith('/user')) {
      if (request.method() === 'PUT') {
        const body = request.postDataJSON(); if (body.data) user = { ...user, user_metadata: { ...user.user_metadata, ...body.data }, updated_at: new Date().toISOString() };
        if (body.password) passwordSaved = body.password;
      }
      return route.fulfill({ json: user });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Professor', exact: true }).click({ timeout: 10000 });
  await page.getByRole('button', { name: /Editar perfil/ }).click();
  await page.getByLabel('Nome de exibição', { exact: true }).fill('Ana Costa');
  await page.getByLabel('Escola ou instituição (opcional)', { exact: true }).fill('Minha escola');
  await page.getByLabel('Sobre você (opcional)', { exact: true }).fill('Aprender fazendo.');
  await page.getByLabel('Cores do meu espaço', { exact: true }).selectOption('ocean');
  await page.getByLabel('Reduzir animações e movimento', { exact: true }).check();
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 80; c.height = 60; c.getContext('2d').fillRect(0, 0, 80, 60); return c.toDataURL('image/png').split(',')[1]; });
  await page.locator('#profile-photo').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('.profile-photo-edit img')).toHaveJSProperty('naturalWidth', 256);
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.locator('.account-message')).toHaveText('Perfil atualizado.');
  await expect(page.locator('[data-account-profile]')).toHaveText('Ana Costa');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean'); await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  expect(user.user_metadata.bio).toBe('Aprender fazendo.'); expect(user.user_metadata.avatar_path).toBe(uid + '/avatar.webp');
  await page.getByRole('button', { name: /Alterar senha/ }).click();
  await page.getByLabel('Senha atual', { exact: true }).fill('senha-anterior'); await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-123'); await page.getByLabel('Repita a nova senha', { exact: true }).fill('outra-senha-123');
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('iguais'); expect(passwordSaved).toBeUndefined();
  await page.getByLabel('Senha atual', { exact: true }).fill('senha-anterior'); await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-123'); await page.getByLabel('Repita a nova senha', { exact: true }).fill('nova-senha-123');
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click(); await expect(page.locator('.account-message')).toHaveText('Senha atualizada.');
  expect(passwordSaved).toBe('nova-senha-123'); expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('nova-senha-123');
  await page.screenshot({ path: 'test-results/profile-updated.png' });
});
