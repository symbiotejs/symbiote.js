import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

// Pre-generate SSR markup in Node using the same component code
let ssrMarkup;

test.beforeAll(() => {
  let script = `
    import { SSR } from './node/SSR.js';
    await SSR.init();
    await import('./test/browser/helpers/ssr-components.js');
    let html = SSR.renderToString('ssr-root');
    SSR.destroy();
    process.stdout.write(html);
  `;
  ssrMarkup = execSync(`node --input-type=module -e "${script.replace(/"/g, '\\"')}"`, {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });
});

test.describe('SSR → Browser hydration', () => {

  // ── SSR output validation ──

  test('SSR markup should contain nested components with content', () => {
    expect(ssrMarkup).toContain('<ssr-root');
    expect(ssrMarkup).toContain('<ssr-middle');
    expect(ssrMarkup).toContain('<ssr-leaf');
    expect(ssrMarkup).toContain('SSR Root');
    expect(ssrMarkup).toContain('middle section');
    expect(ssrMarkup).toContain('leaf content');
    expect(ssrMarkup).not.toContain('undefined');
    expect(ssrMarkup).not.toContain('[object Object]');
  });

  test('SSR markup should preserve bind attributes for hydration', () => {
    expect(ssrMarkup).toContain('bind="textContent:rootTitle;"');
    expect(ssrMarkup).toContain('bind="textContent:middleLabel;"');
    expect(ssrMarkup).toContain('bind="textContent:leafText;"');
  });

  // ── Hydration tests ──

  async function loadWithSSR(page, markup) {
    await page.addInitScript((html) => {
      window.__SSR_MARKUP = html;
    }, markup);
    await page.goto('/test/browser/fixtures/ssr.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__HYDRATED === true, null, { timeout: 10000 });
  }

  test('hydration should preserve SSR content without re-render', async ({ page }) => {
    let tagged = ssrMarkup
      .replace(/<h1 /, '<h1 data-ssr="true" ')
      .replace(/<h3 /, '<h3 data-ssr="true" ');

    await loadWithSSR(page, tagged);

    let result = await page.evaluate(() => {
      let root = document.querySelector('#ssr-mount ssr-root');
      let h1 = root?.querySelector('h1');
      let h3 = root?.querySelector('ssr-middle h3');
      let span = root?.querySelector('ssr-leaf span');
      return {
        h1Text: h1?.textContent,
        h1IsOriginal: h1?.getAttribute('data-ssr') === 'true',
        h3Text: h3?.textContent,
        h3IsOriginal: h3?.getAttribute('data-ssr') === 'true',
        leafText: span?.textContent,
      };
    });

    expect(result.h1Text).toBe('SSR Root');
    expect(result.h1IsOriginal).toBe(true);
    expect(result.h3Text).toBe('middle section');
    expect(result.h3IsOriginal).toBe(true);
    expect(result.leafText).toBe('leaf content');
  });

  test('root binding should react to state changes', async ({ page }) => {
    await loadWithSSR(page, ssrMarkup);

    await page.evaluate(() => {
      let root = document.querySelector('#ssr-mount ssr-root');
      root.$.rootTitle = 'Updated Root';
    });

    let h1 = page.locator('#ssr-mount ssr-root h1');
    await expect(h1).toHaveText('Updated Root');
  });

  test('nested middle binding should react to state changes', async ({ page }) => {
    await loadWithSSR(page, ssrMarkup);

    await page.evaluate(() => {
      let middle = document.querySelector('#ssr-mount ssr-middle');
      middle.$.middleLabel = 'Updated middle';
    });

    let h3 = page.locator('#ssr-mount ssr-middle h3');
    await expect(h3).toHaveText('Updated middle');
  });

  test('deeply nested leaf binding should react to state changes', async ({ page }) => {
    await loadWithSSR(page, ssrMarkup);

    await page.evaluate(() => {
      let leaf = document.querySelector('#ssr-mount ssr-leaf');
      leaf.$.leafText = 'Updated leaf';
    });

    let span = page.locator('#ssr-mount ssr-leaf span');
    await expect(span).toHaveText('Updated leaf');
  });
});
