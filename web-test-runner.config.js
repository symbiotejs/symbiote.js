import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  files: './test/**/*.test.js',
  nodeResolve: true,
  playwright: true,
  browsers: [playwrightLauncher({ product: 'chromium', createBrowserContext: ({ browser, config }) => browser.newContext(), createPage: ({ context, config }) => context.newPage() })],
};
