import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

// Pre-generate SSR markup in Node using the same component code
let ssrMarkup;

test.beforeAll(() => {
  let script = `
    import { SSR } from './node/SSR.js';
    await SSR.init();
    await import('./test/browser/helpers/iso-components.js');
    let html = SSR.renderToString('iso-root');
    SSR.destroy();
    process.stdout.write(html);
  `;
  ssrMarkup = execSync(`node --input-type=module -e "${script.replace(/"/g, '\\"')}"`, {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });
});

test.describe('isoMode — with SSR content (hydration path)', () => {

  async function loadWithSSR(page, markup) {
    await page.addInitScript((html) => {
      window.__SSR_MARKUP = html;
    }, markup);
    await page.goto('/test/browser/fixtures/iso.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__HYDRATED === true, null, { timeout: 10000 });
  }

  test('should hydrate existing DOM without re-render', async ({ page }) => {
    let tagged = ssrMarkup
      .replace(/<h1 /, '<h1 data-ssr="true" ');

    await loadWithSSR(page, tagged);

    let result = await page.evaluate(() => {
      let root = document.querySelector('#iso-mount iso-root');
      let h1 = root?.querySelector('h1');
      let span = root?.querySelector('iso-leaf span');
      return {
        h1Text: h1?.textContent,
        h1IsOriginal: h1?.getAttribute('data-ssr') === 'true',
        leafText: span?.textContent,
      };
    });

    expect(result.h1Text).toBe('ISO Root');
    expect(result.h1IsOriginal).toBe(true);
    expect(result.leafText).toBe('leaf content');
  });

  test('bindings should react to state changes after hydration', async ({ page }) => {
    await loadWithSSR(page, ssrMarkup);

    await page.evaluate(() => {
      let root = document.querySelector('#iso-mount iso-root');
      root.$.rootTitle = 'Updated ISO';
    });

    let h1 = page.locator('#iso-mount iso-root h1');
    await expect(h1).toHaveText('Updated ISO');
  });
});

test.describe('isoMode — without SSR content (client render path)', () => {

  test('should render template when no children exist', async ({ page }) => {
    await page.goto('/test/browser/fixtures/iso.html', { waitUntil: 'domcontentloaded' });

    // Inject component without pre-rendered content
    await page.evaluate(async () => {
      await import('../helpers/iso-components.js');
      let mount = document.getElementById('iso-mount');
      mount.innerHTML = '<iso-root></iso-root>';
      // Wait for custom element upgrade
      await customElements.whenDefined('iso-root');
      await new Promise((r) => requestAnimationFrame(r));
    });

    let result = await page.evaluate(() => {
      let root = document.querySelector('#iso-mount iso-root');
      let h1 = root?.querySelector('h1');
      let span = root?.querySelector('iso-leaf span');
      return {
        h1Text: h1?.textContent,
        leafText: span?.textContent,
      };
    });

    expect(result.h1Text).toBe('ISO Root');
    expect(result.leafText).toBe('leaf content');
  });

  test('bindings should react to state changes after client render', async ({ page }) => {
    await page.goto('/test/browser/fixtures/iso.html', { waitUntil: 'domcontentloaded' });

    await page.evaluate(async () => {
      await import('../helpers/iso-components.js');
      let mount = document.getElementById('iso-mount');
      mount.innerHTML = '<iso-root></iso-root>';
      await customElements.whenDefined('iso-root');
      await new Promise((r) => requestAnimationFrame(r));
    });

    await page.evaluate(() => {
      let root = document.querySelector('#iso-mount iso-root');
      root.$.rootTitle = 'Client Updated';
    });

    let h1 = page.locator('#iso-mount iso-root h1');
    await expect(h1).toHaveText('Client Updated');
  });
});
