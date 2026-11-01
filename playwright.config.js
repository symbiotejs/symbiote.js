import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  testMatch: '**/*.browser.js',
  fullyParallel: true,
  reporter: 'list',
  use: {
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'node test/server.js',
    wait: {
      // Named capture supplies the baseURL fixture after the server starts.
      stdout: /Symbiote test server ready at (?<playwright_test_base_url>http:\/\/127\.0\.0\.1:\d+)/,
    },
    reuseExistingServer: false,
  },
});
