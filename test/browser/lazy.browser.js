import { test, expect } from '@playwright/test';

test.describe('Lazy Mode', () => {
  test('initializes and destroys components based on visibility', async ({ page }) => {
    page.on('console', msg => console.log(msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto('/test/browser/fixtures/lazy-demo.html');

    // Initially, only a few items should be initialized
    const lazyItems = page.locator('lazy-item');
    await expect(lazyItems).toHaveCount(10000);

    // Get the first item
    const firstItem = lazyItems.nth(0);
    // Should have inner content because it's visible
    await expect(firstItem.locator('h3')).toBeVisible();

    // Get an item far down the list
    const farItem = lazyItems.nth(500);
    // Should NOT have inner content because it's not visible
    await expect(farItem.locator('h3')).toHaveCount(0);

    // Scroll to the far item
    await farItem.scrollIntoViewIfNeeded();

    // Wait for IntersectionObserver
    await page.waitForTimeout(100);

    // Now it should be visible
    await expect(farItem.locator('h3')).toBeVisible();

    // The first item should be destroyed (no content)
    await expect(firstItem.locator('h3')).toHaveCount(0);
    
    // But the first item should have min-height set
    const style = await firstItem.getAttribute('style');
    expect(style).toContain('min-height');
  });
});
