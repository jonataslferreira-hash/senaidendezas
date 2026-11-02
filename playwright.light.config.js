import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test/browser', testMatch: ['profile.spec.js', 'experience.spec.js'], workers: 1, timeout: 60000,
  use: { baseURL: 'http://localhost:5173', browserName: 'chromium', launchOptions: { args: ['--disable-webgl', '--no-sandbox'] }, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true }
});
