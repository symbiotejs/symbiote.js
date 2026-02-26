import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  testMatch: '**/*.browser.js',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8787',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npx -y http-server . -p 8787 --cors -c-1',
    port: 8787,
    reuseExistingServer: true,
  },
});
