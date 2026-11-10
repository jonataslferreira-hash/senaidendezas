import { unpackLesson } from '../../src/file-codec.js';
import { test, expect } from '@playwright/test';
import { newLesson } from '../../src/lessons.js';
import { wavFixture } from '../audio-fixture.js';
test('conta salva aula e mídias no Storage, lista arquivos e abre uma cópia portátil', async ({ page }) => {
  const uid = '11111111-1111-4111-8111-111111111111', email = 'professor@example.com';
  const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'test'].join('.');
  await page.addInitScript(({ uid, email, jwt }) => { localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: uid, email, aud: 'authenticated', app_metadata: {}, user_metadata: {} } })); }, { uid, email, jwt });
  let cloudRow, cloudFile;
  await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/storage/v1/object/') && request.method() === 'POST') {
      expect(decodeURIComponent(url.pathname)).toContain(uid + '/lessons/');
      const form = await new Request('http://test', { method: 'POST', body: request.postDataBuffer(), headers: { 'content-type': request.headers()['content-type'] } }).formData();
      const file = [...form.values()].find(value => typeof value !== 'string'); cloudFile = Buffer.from(await file.arrayBuffer());
      return route.fulfill({ json: { Key: 'storage-lab-lessons/' + uid + '/lessons/test.json', Id: 'file-id' } });
    }
    if (url.pathname === '/rest/v1/lesson_files') {
      if (request.method() === 'POST') { cloudRow = request.postDataJSON(); expect(cloudRow.user_id).toBe(uid); return route.fulfill({ status: 201, json: {} }); }
      expect(url.searchParams.get('user_id')).toBe('eq.' + uid); return route.fulfill({ json: cloudRow ? [cloudRow] : [] });
    }
    if (url.pathname.startsWith('/storage/v1/object/') && request.method() === 'GET') {
      expect(request.headers().authorization).toContain('Bearer ');
      return route.fulfill({ contentType: 'application/json', body: cloudFile });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto('/'); await expect(page.locator('[data-account-profile]')).toHaveText(email);
  const lesson = newLesson(); lesson.title = 'Minha aula na nuvem'; lesson.quizAudio = { name: 'festa.wav', data: 'data:audio/wav;base64,' + wavFixture().toString('base64'), volume: .2, loop: true };
  lesson.slides[0] = { ...lesson.slides[0], kind: 'image', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Xb8AAAAASUVORK5CYII=', imageAlt: 'Exemplo' };
  await page.locator('#import-lesson-file').setInputFiles({ name: 'aula.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(lesson)) });
  await page.getByRole('button', { name: 'Salvar na nuvem', exact: true }).click(); await expect(page.locator('#toast')).toContainText(/salv[ao]s? na nuvem/i);
  expect((await unpackLesson(new Blob([cloudFile]))).quizAudio.data).toMatch(/^data:audio/); expect((await unpackLesson(new Blob([cloudFile]))).slides[0].image).toMatch(/^data:image/);
  await page.locator('.editor-heading [data-studio-action="library"]').click();
  await page.getByRole('button', { name: 'Atualizar arquivos', exact: true }).click(); await expect(page.locator('.cloud-file-list')).toContainText(lesson.title);
  await page.getByRole('button', { name: 'Abrir cópia no editor ↗', exact: true }).click();
  await expect(page.getByLabel('Título da aula', { exact: true })).toHaveValue(lesson.title);
  await page.getByRole('tab', { name: /Quiz/ }).click(); await expect(page.locator('.audio-name')).toHaveText('festa.wav');
});
