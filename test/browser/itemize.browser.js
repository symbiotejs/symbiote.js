import { test, expect } from '@playwright/test';

test.describe('Itemize API', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/test/browser/fixtures/itemize.html');
    await page.waitForFunction(() => window.__TEST_READY === true);
  });

  // ── Class property fallback ──

  test('should render list from class property fallback', async ({ page }) => {
    let items = await page.$$eval('#itemize-fb-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  // ── init$ rendering ──

  test('should render initial list from init$', async ({ page }) => {
    let items = await page.$$eval('#itemize-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  // ── Reactivity ──

  test('should update existing items in place', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#itemize-el');
      el.$.fruits = [
        { name: 'Apricot' },
        { name: 'Blueberry' },
        { name: 'Cranberry' },
      ];
    });
    let items = await page.$$eval('#itemize-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Apricot', 'Blueberry', 'Cranberry']);
  });

  test('should shrink list when fewer items', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#itemize-el');
      el.$.fruits = [{ name: 'Solo' }];
    });
    let items = await page.$$eval('#itemize-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Solo']);
  });

  test('should grow list when more items', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#itemize-el');
      el.$.fruits = [
        { name: 'Apple' },
        { name: 'Banana' },
        { name: 'Cherry' },
        { name: 'Date' },
        { name: 'Elderberry' },
      ];
    });
    let items = await page.$$eval('#itemize-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']);
  });

  test('should clear list when data is null', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#itemize-el');
      el.$.fruits = null;
    });
    let count = await page.$$eval('#itemize-list li', (els) => els.length);
    expect(count).toBe(0);
  });
});
