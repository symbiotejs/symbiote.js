import { test, expect } from '@playwright/test';

test.describe('Symbiote basic component', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/test/browser/fixtures/component.html');
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

  test('should use class property fallback for values and handlers', async ({ page }) => {
    // Class property value used as initial binding value
    expect(await page.textContent('#fb-label')).toBe('fallback-value');

    // Class method used as onclick handler fallback
    await page.click('#fb-btn');
    expect(await page.textContent('#fb-label')).toBe('clicked-1');

    await page.click('#fb-btn');
    expect(await page.textContent('#fb-label')).toBe('clicked-2');
  });
});
