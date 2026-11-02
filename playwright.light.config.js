import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test/browser', testMatch: ['profile.spec.js', 'experience.spec.js', 'activities.spec.js', 'music.spec.js', 'student-mobile.spec.js', 'collaboration.spec.js', 'workspace.spec.js', 'public-presentation.spec.js', 'personalization.spec.js', 'chat.spec.js', 'animated-profile.spec.js', 'social.spec.js', 'workspace-roles.spec.js', 'cloud-library.spec.js', 'pptx-editable.spec.js', 'account-live.spec.js', 'classroom-display.spec.js'], workers: 1, timeout: 60000,
  use: { baseURL: 'http://localhost:5173', browserName: 'chromium', launchOptions: { args: ['--disable-webgl', '--no-sandbox', '--mute-audio'] }, screenshot: 'only-on-failure' },
  webServer: [{ command: 'npm run dev -- --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true }, { command: 'node test/signaling.js', url: 'http://localhost:9000', reuseExistingServer: true }]
});
