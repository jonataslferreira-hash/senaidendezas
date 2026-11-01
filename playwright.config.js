import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test/browser',
  timeout: 180000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure', trace: 'retain-on-failure'
  },
  webServer: [
    { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI },
    { command: 'node test/signaling.js', url: 'http://localhost:9000', reuseExistingServer: !process.env.CI },
    { command: 'npm run build && node test/static.js', url: 'http://127.0.0.1:4173/senaidendezas/', reuseExistingServer: !process.env.CI }
  ]
});
