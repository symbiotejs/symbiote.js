import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

let rendered;
test.beforeAll(() => {
  rendered = execFileSync(process.execPath, [
    'test/helpers/render-html-app.js',
  ], {
    encoding: 'utf8',
  });
});

test('static SSR hydrates native bindings and collection actions in place', async ({
  page,
}) => {
  let errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Keep SSR visible before hydration so readiness cannot depend on its text.
  let releaseHydration;
  await page.route('**/html-app/index.js', async (route) => {
    await new Promise((resolve) => { releaseHydration = resolve; });
    await route.continue();
  });
  await page.route('**/must-not-*', (route) => route.fulfill({
    status: 404,
  }));
  await page.route('**/hydrated.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><body>' + rendered
      + '<script type="module" src="/test/browser/helpers/html-app-hydrate.js"></script></body></html>',
  }));
  await page.goto('/hydrated.html', {
    waitUntil: 'commit',
  });
  await expect(page.locator('h1')).toHaveText('Server tasks');
  await expect(page.locator('sym-component p')).toHaveText('Server tasks');
  await expect(page.locator('input')).toHaveValue('First task');
  await expect.poll(() => typeof releaseHydration).toBe('function');
  await expect(page.getByRole('button', {
    name: 'Change title',
  })).toHaveJSProperty('onclick', null);
  releaseHydration();
  await expect(page.locator('sym-context')).toHaveJSProperty('connectedOnce', true);
  expect(await page.evaluate(() => document.querySelector('h1') === window.serverHeading)).toBe(true);
  expect(await page.evaluate(() => document.querySelector('sym-component p') === window.serverSummary)).toBe(true);
  expect(await page.evaluate(() => document.querySelector('li') === window.serverRow)).toBe(true);
  await page.getByRole('button', {
    name: 'Change title',
  }).click();
  await expect(page.locator('h1')).toHaveText('Updated title');
  await expect(page.locator('sym-component p')).toHaveText('Updated title');
  await page.locator('input').fill('Hydrated edit');
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$.tasks[0].title)).toBe('Hydrated edit');
  await page.getByRole('button', {
    name: 'Remove task',
  }).click();
  await expect(page.locator('li')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('strict CSP supports forms, JSON, trusted imports and scoped WebMCP alongside core components', async ({
  page,
}) => {
  let errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/html-app-csp.html', async (route) => {
    let response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'",
      },
    });
  });
  await page.route('**/csp-data.json', (route) => route.fulfill({
    json: {
      title: '<img src=x onerror=alert(1)>',
    },
  }));
  await page.route('**/csp-panel.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<button type="button" value="Imported action" bind="onclick: [set]APP/title">Use imported title</button>',
  }));
  await page.goto('/test/browser/fixtures/html-app-csp.html');
  await expect(page.locator('h1')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('img')).toHaveCount(0);
  await page.getByRole('button', {
    name: 'Apply title',
  }).click();
  await expect(page.locator('h1')).toHaveText('<img src=x onerror=alert(1)>');
  let input = page.getByRole('textbox', {
    name: 'Task title',
  });
  await input.fill('Keyboard submission');
  await input.press('Enter');
  await expect(page.locator('h1')).toHaveText('Keyboard submission');
  let checkbox = page.getByRole('checkbox', {
    name: 'Enabled',
  });
  await checkbox.focus();
  await checkbox.press('Space');
  expect(await page.evaluate(() => document.querySelector('sym-context').$.enabled)).toBe(true);
  await page.getByRole('button', {
    name: 'Use imported title',
  }).click();
  await expect(page.locator('h1')).toHaveText('Imported action');
  await page.getByRole('button', {
    name: 'Ordinary counter',
  }).click();
  await expect(page.locator('plain-counter output')).toHaveText('1');
  expect(await page.evaluate(async () => {
    let { default: Symbiote } = await import('/core/Symbiote.js');
    return Symbiote.mcpToolMode;
  })).toBe(false);
  await page.evaluate(async () => {
    let { PubSub } = await import('/core/PubSub.js');
    let { DICT } = await import('/core/dictionary.js');
    let { getActiveWebMCPTools } = await import('/core/webmcp.js');
    let owner = document.querySelector('sym-context');
    let scopes = [owner, ...owner.querySelectorAll('*')];
    let ownerIds = scopes.map((element) => element[DICT.MCP_OWNER_ID_KEY]).filter(Boolean);
    window.ownedToolNames = getActiveWebMCPTools().filter((tool) => ownerIds.includes(tool.ownerId)).map((tool) => tool.name);
    if (!window.ownedToolNames.length) {
      throw new Error('Expected tools for the mounted fixture actions.');
    }
    owner.remove();
    for (let element of scopes.reverse()) {
      element.destroy?.();
    }
    window.disposedContext = PubSub.getCtx('APP', false);
  });
  expect(await page.evaluate(() => window.disposedContext)).toBeNull();
  expect(await page.evaluate(async () => {
    let { getActiveWebMCPTools } = await import('/core/webmcp.js');
    return getActiveWebMCPTools().some((tool) => window.ownedToolNames.includes(tool.name));
  })).toBe(false);
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
  expect(errors).toEqual([]);
});
