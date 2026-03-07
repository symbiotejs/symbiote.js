import { test, expect } from '@playwright/test';

test.describe('Keyed Itemize API', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/test/browser/fixtures/itemize-keyed.html');
    await page.waitForFunction(() => window.__TEST_READY === true);
  });

  test('should render initial list', async ({ page }) => {
    let items = await page.$$eval('#keyed-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']);
  });

  test('should update existing items in place by key', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#keyed-el');
      el.$.items = [
        { id: 'a', name: 'Updated Alpha' },
        { id: 'b', name: 'Updated Beta' },
        { id: 'c', name: 'Updated Gamma' },
        { id: 'd', name: 'Updated Delta' },
        { id: 'e', name: 'Updated Epsilon' },
      ];
    });
    let items = await page.$$eval('#keyed-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Updated Alpha', 'Updated Beta', 'Updated Gamma', 'Updated Delta', 'Updated Epsilon']);
  });

  test('should reorder items by key without recreating DOM nodes', async ({ page }) => {
    // Stamp each <li> with a unique marker
    await page.evaluate(() => {
      let lis = document.querySelectorAll('#keyed-list li');
      lis.forEach((li, i) => li.dataset.marker = `m${i}`);
    });

    // Move last item to front (1 out-of-order move in 5 items = 20%, under 30% threshold)
    await page.evaluate(() => {
      let el = document.querySelector('#keyed-el');
      el.$.items = [
        { id: 'e', name: 'Epsilon' },
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta' },
        { id: 'c', name: 'Gamma' },
        { id: 'd', name: 'Delta' },
      ];
    });

    let result = await page.$$eval('#keyed-list li', (els) =>
      els.map((e) => ({ text: e.textContent, marker: e.dataset.marker }))
    );
    expect(result).toEqual([
      { text: 'Epsilon', marker: 'm4' },
      { text: 'Alpha', marker: 'm0' },
      { text: 'Beta', marker: 'm1' },
      { text: 'Gamma', marker: 'm2' },
      { text: 'Delta', marker: 'm3' },
    ]);
  });

  test('should append new items (fast path)', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#keyed-el');
      el.$.items = [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta' },
        { id: 'c', name: 'Gamma' },
        { id: 'd', name: 'Delta' },
        { id: 'e', name: 'Epsilon' },
        { id: 'f', name: 'Zeta' },
        { id: 'g', name: 'Eta' },
      ];
    });
    let items = await page.$$eval('#keyed-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta']);
  });

  test('should truncate list (fast path)', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#keyed-el');
      el.$.items = [{ id: 'a', name: 'Alpha' }];
    });
    let items = await page.$$eval('#keyed-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Alpha']);
  });

  test('should remove items from the middle by key', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#keyed-el');
      el.$.items = [
        { id: 'a', name: 'Alpha' },
        { id: 'c', name: 'Gamma' },
        { id: 'e', name: 'Epsilon' },
      ];
    });
    let items = await page.$$eval('#keyed-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Alpha', 'Gamma', 'Epsilon']);
  });

  test('should clear list when data is null', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#keyed-el');
      el.$.items = null;
    });
    let count = await page.$$eval('#keyed-list li', (els) => els.length);
    expect(count).toBe(0);
  });

  test('should skip update for same array reference (no-op)', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#keyed-el');
      let same = el.$.items;
      // Stamp markers
      document.querySelectorAll('#keyed-list li').forEach((li, i) => li.dataset.seq = String(i));
      el.$.items = same;
    });
    let markers = await page.$$eval('#keyed-list li', (els) => els.map((e) => e.dataset.seq));
    expect(markers).toEqual(['0', '1', '2', '3', '4']);
  });
});
