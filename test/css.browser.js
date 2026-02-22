import { test, expect } from '@playwright/test';

test.describe('css tagged template', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/test/symbiote.html');
    await page.waitForFunction(() => window.__TEST_READY === true);
  });

  test('should return a CSSStyleSheet instance', async ({ page }) => {
    let result = await page.evaluate(async () => {
      let { css } = await import('/core/css.js');
      let sheet = css`div { color: red; }`;
      return {
        isSheet: sheet instanceof CSSStyleSheet,
        ruleCount: sheet.cssRules.length,
      };
    });
    expect(result.isSheet).toBe(true);
    expect(result.ruleCount).toBe(1);
  });

  test('should handle string interpolations in CSS', async ({ page }) => {
    let result = await page.evaluate(async () => {
      let { css } = await import('/core/css.js');
      let color = 'blue';
      let sheet = css`div { color: ${color}; }`;
      return sheet.cssRules[0].style.color;
    });
    expect(result).toBe('blue');
  });

  test('should handle multiple interpolations', async ({ page }) => {
    let result = await page.evaluate(async () => {
      let { css } = await import('/core/css.js');
      let size = '16px';
      let weight = 'bold';
      let sheet = css`p { font-size: ${size}; font-weight: ${weight}; }`;
      let style = sheet.cssRules[0].style;
      return { size: style.fontSize, weight: style.fontWeight };
    });
    expect(result.size).toBe('16px');
    expect(result.weight).toBe('bold');
  });

  test('should skip undefined interpolations', async ({ page }) => {
    let result = await page.evaluate(async () => {
      let { css } = await import('/core/css.js');
      let sheet = css`div { color: red; }${undefined}`;
      return sheet.cssRules.length;
    });
    expect(result).toBe(1);
  });

  test('useProcessor should transform CSS text', async ({ page }) => {
    let result = await page.evaluate(async () => {
      let { css } = await import('/core/css.js');
      css.useProcessor((txt) => txt.replaceAll('$accent', '#ff0'));
      let sheet = css`div { color: $accent; }`;
      return sheet.cssRules[0].style.color;
    });
    expect(result).toBe('rgb(255, 255, 0)');
  });

  test('processors should be cleared after use', async ({ page }) => {
    let result = await page.evaluate(async () => {
      let { css } = await import('/core/css.js');
      css.useProcessor((txt) => txt.replaceAll('$x', 'red'));
      css`div { color: $x; }`;
      // Second call should NOT have the processor
      return css.processors.length;
    });
    expect(result).toBe(0);
  });

  test('useProcessor should be chainable', async ({ page }) => {
    let result = await page.evaluate(async () => {
      let { css } = await import('/core/css.js');
      let sheet = css
        .useProcessor((t) => t.replaceAll('$a', 'red'))
        .useProcessor((t) => t.replaceAll('$b', '10px'))`
        div { color: $a; margin: $b; }
      `;
      let style = sheet.cssRules[0].style;
      return { color: style.color, margin: style.margin };
    });
    expect(result.color).toBe('red');
    expect(result.margin).toBe('10px');
  });

  test('should handle empty template', async ({ page }) => {
    let result = await page.evaluate(async () => {
      let { css } = await import('/core/css.js');
      let sheet = css``;
      return sheet.cssRules.length;
    });
    expect(result).toBe(0);
  });
});
