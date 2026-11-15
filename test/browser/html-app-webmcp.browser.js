import { test, expect } from '@playwright/test';

let fixture = '/test/browser/fixtures/html-app-webmcp.html';

async function open(page, mode, extra = '', entry = '/html-app/index.js') {
  await page.route('**/html-app-webmcp.html', async (route) => {
    let response = await route.fetch();
    let html = (await response.text())
      .replace(' webmcp-mode="true"', mode === null ? '' : ` webmcp-mode="${mode}"`)
      .replace('src="/html-app/index.js"', `src="${entry}"`)
      .replace('</head>', extra + '</head>');
    await route.fulfill({
      response,
      body: html,
    });
  });
  await page.goto(fixture);
  await expect(page.locator('sym-context')).toHaveJSProperty('connectedOnce', true);
  await expect(page.getByRole('button', {
    name: 'Imported toggle',
  })).toBeVisible();
}

async function modeState(page) {
  return page.evaluate(async () => {
    let {
      BaseClass,
    } = await import('/html-app/index.js');
    let {
      Symbiote,
    } = await import('/core/Symbiote.js');
    return {
      extension: typeof globalThis.__SYMBIOTE_WEBMCP_SYNC_OWNER === 'function',
      foundation: BaseClass.mcpToolMode === true,
      global: Symbiote.mcpToolMode === true,
    };
  });
}

async function executeAction(page, selector, label) {
  return page.evaluate(async ({
    selector,
    label,
  }) => {
    let {
      DICT,
    } = await import('/core/dictionary.js');
    let {
      getActiveWebMCPTools,
      executeWebMCPTool,
    } = await import('/core/webmcp.js');
    let owner = document.querySelector(selector);
    let binding = owner[DICT.MCP_EVENTS_KEY]?.find((binding) => binding.el.textContent.trim() === label);
    let tool = binding && getActiveWebMCPTools().find((tool) => tool.ownerId === owner[DICT.MCP_OWNER_ID_KEY]
      && tool.key === 'auto:' + binding.key);
    if (!tool) {
      throw new Error('Missing fixture action: ' + label);
    }
    let result = await executeWebMCPTool(tool.name, {});
    return {
      name: tool.name,
      failed: !!result.isError,
    };
  }, {
    selector,
    label,
  });
}

for (let mode of [
  null,
  'false',
  'TRUE',
]) {
  test(`entry does not activate WebMCP with ${mode === null ? 'no attribute' : mode}`, async ({
    page,
  }) => {
    let requested = [];
    page.on('request', (request) => requested.push(new URL(request.url()).pathname));
    await open(page, mode);
    await page.getByRole('button', {
      name: 'Toggle flag',
    }).click();
    await expect(page.locator('output')).toHaveText('true');
    expect(await modeState(page)).toEqual({
      extension: false,
      foundation: false,
      global: false,
    });
    expect(requested).not.toContain('/core/webmcp.js');
  });
}

for (let entry of [
  '/html-app/index.js',
  '/html-app/index.js?bootstrap=enabled#entry',
]) {
  test(`entry opt-in exposes initial, imported and Itemize actions: ${entry}`, async ({
    page,
  }) => {
    await open(page, 'true', '', entry);
    expect(await modeState(page)).toEqual({
      extension: true,
      foundation: true,
      global: false,
    });
    let top = await executeAction(page, 'sym-context', 'Toggle flag');
    expect(top.failed).toBe(false);
    await expect(page.locator('output')).toHaveText('true');
    let imported = await executeAction(page, 'sym-import > *', 'Imported toggle');
    expect(imported.failed).toBe(false);
    expect(await page.locator('sym-context').evaluate((owner) => owner.$.importedFlag)).toBe(true);
    let item = await executeAction(page, 'ul > *', 'Remove item');
    expect(item.failed).toBe(false);
    await expect(page.locator('li')).toHaveCount(0);
    await page.locator('sym-import').evaluate((owner) => owner.remove());
    await expect.poll(() => page.evaluate(async ({
      imported,
      item,
    }) => {
      let {
        getActiveWebMCPTools,
      } = await import('/core/webmcp.js');
      return getActiveWebMCPTools().some((tool) => tool.name === imported.name || tool.name === item.name);
    }, {
      imported,
      item,
    })).toBe(false);
    expect(await page.evaluate(async (name) => {
      let {
        getActiveWebMCPTools,
      } = await import('/core/webmcp.js');
      return getActiveWebMCPTools().some((tool) => tool.name === name);
    }, top.name)).toBe(true);
  });
}

test('a marked CDN module wrapper can opt in its imported implementation', async ({
  page,
}) => {
  await page.route('**/cdn/bootstrap.js', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: 'export * from \'/html-app/index.js\';',
  }));
  await open(page, 'true', '', '/cdn/bootstrap.js');
  expect(await modeState(page)).toEqual({
    extension: true,
    foundation: true,
    global: false,
  });
  expect((await executeAction(page, 'sym-context', 'Toggle flag')).failed).toBe(false);
  await expect(page.locator('output')).toHaveText('true');
});

for (let mode of [
  null,
  'false',
  'true',
]) {
  test(`an available currentScript takes precedence with ${mode === null ? 'no attribute' : mode}`, async ({
    page,
  }) => {
    // ESM has no currentScript; supply the host value a classic bundle receives.
    await page.addInitScript((mode) => {
      let script = document.createElement('script');
      if (mode !== null) {
        script.setAttribute('webmcp-mode', mode);
      }
      Object.defineProperty(document, 'currentScript', {
        get: () => script,
      });
    }, mode);
    await open(page, 'true');
    expect(await modeState(page)).toEqual({
      extension: mode === 'true',
      foundation: mode === 'true',
      global: false,
    });
    if (mode === 'true') {
      expect((await executeAction(page, 'sym-context', 'Toggle flag')).failed).toBe(false);
    }
  });
}

test('opted-in components wait for the extension before registering and rendering', async ({
  page,
}) => {
  let release;
  let pending = new Promise((resolve) => { release = resolve; });
  let requested = false;
  await page.route('**/core/webmcp.js', async (route) => {
    requested = true;
    await pending;
    await route.continue();
  });
  await page.goto(fixture, {
    waitUntil: 'commit',
  });
  await expect.poll(() => requested).toBe(true);
  expect(await page.evaluate(() => !!customElements.get('sym-context'))).toBe(false);
  release();
  await expect(page.locator('sym-context')).toHaveJSProperty('connectedOnce', true);
  expect((await executeAction(page, 'sym-context', 'Toggle flag')).failed).toBe(false);
});

test('SSR mode does not load the optional extension from a document script', async ({
  page,
}) => {
  await page.addInitScript(() => { globalThis.__SYMBIOTE_SSR = true; });
  await page.route('**/html-app-webmcp.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><script type="module" src="/html-app/index.js" webmcp-mode="true"></script>',
  }));
  await page.goto(fixture);
  expect(await modeState(page)).toEqual({
    extension: false,
    foundation: false,
    global: false,
  });
  expect(await page.evaluate(() => !!customElements.get('sym-context'))).toBe(true);
});
