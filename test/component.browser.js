import { test, expect } from '@playwright/test';

test.describe('Symbiote basic component', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/test/test.html');
    await page.waitForFunction(() => window.__TEST_READY === true);
  });

  test('should render template and bind state', async ({ page }) => {
    let value = await page.textContent('#value');
    expect(value).toBe('0');

    await page.click('#btn');
    value = await page.textContent('#value');
    expect(value).toBe('1');

    await page.click('#btn');
    value = await page.textContent('#value');
    expect(value).toBe('2');
  });

  test('should access state via DOM API', async ({ page }) => {
    expect(await page.textContent('#output')).toBe('hello');

    await page.evaluate(() => {
      document.querySelector('test-label').$.text = 'world';
    });
    expect(await page.textContent('#output')).toBe('world');
  });
});
