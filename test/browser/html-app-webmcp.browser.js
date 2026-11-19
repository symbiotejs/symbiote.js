import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

let fixture = '/test/browser/fixtures/html-app-webmcp.html';

async function open(page, entry = '/html-app/webmcp/index.js', extra = '') {
  await page.route('**/html-app-webmcp.html', async (route) => {
    let response = await route.fetch();
    let html = (await response.text())
      .replace('src="/html-app/webmcp/index.js"', `src="${entry}"`)
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

async function modeState(page, entry = '/html-app/index.js') {
  return page.evaluate(async (entry) => {
    let {
      BaseClass,
      Symbiote,
    } = await import(entry);
    return {
      extension: typeof globalThis.__SYMBIOTE_WEBMCP_SYNC_OWNER === 'function',
      foundation: BaseClass.mcpToolMode === true,
      global: Symbiote.mcpToolMode === true,
    };
  }, entry);
}

async function executeAction(page, selector, label) {
  return page.evaluate(async ({
    selector,
    label,
  }) => {
    let {
      WEBMCP_DICT: MCP,
    } = await import('/core/webmcp-dictionary.js');
    let {
      getActiveWebMCPTools,
      executeWebMCPTool,
    } = await import('/core/webmcp.js');
    let owner = document.querySelector(selector);
    let binding = owner[MCP.EVENTS_KEY]?.find((binding) => binding.el.textContent.trim() === label);
    let tool = binding && getActiveWebMCPTools().find((tool) => tool.ownerId === owner[MCP.OWNER_ID_KEY]
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

async function discover(page) {
  return page.evaluate(async () => (await import('/core/webmcp.js')).getActiveWebMCPTools());
}

async function invoke(page, name, input = {}) {
  return page.evaluate(async ({ name, input }) => (await import('/core/webmcp.js')).executeWebMCPTool(name, input), { name, input });
}

test('input and change tools insert data and publish through the authored handlers', async ({ page }) => {
  await open(page);
  let tools = await discover(page);
  let title = tools.find((tool) => tool.name === 'insert_title');
  expect(title.description).toContain('Insert data into control: Title.');
  expect(title.description).toContain('Event: input.');
  expect(title.description).toContain('ID: input-title.');
  expect(title.inputSchema.required).toEqual(['value']);
  expect(title.inputSchema.properties.value.type).toBe('string');
  expect(tools.find((tool) => tool.name === 'set_checked').inputSchema.properties.checked.type).toBe('boolean');
  for (let [name, input] of [
    ['insert_title', { value: 'New title' }],
    ['insert_notes', { value: 'Line one\nLine two' }],
    ['insert_amount', { value: 12 }],
    ['set_checked', { checked: true }],
    ['set_choice', { value: 'beta' }],
    ['set_choices', { value: ['alpha', 'beta'] }],
  ]) {
    expect((await invoke(page, name, input)).isError).not.toBe(true);
  }
  expect(await page.locator('sym-context').evaluate((owner) => ({
    title: owner.$.title, notes: owner.$.notes, amount: owner.$.amount,
    checked: owner.$.checked, choice: owner.$.choice, choices: owner.$.choices,
  }))).toEqual({ title: 'New title', notes: 'Line one\nLine two', amount: 12, checked: true, choice: 'beta', choices: ['alpha', 'beta'] });
  await expect(page.locator('#input-title')).toHaveValue('New title');
  await page.locator('#input-title').fill('Typed normally');
  expect(await page.locator('sym-context').evaluate((owner) => owner.$.title)).toBe('Typed normally');
});

test('input tools reject invalid values and unavailable controls before calling the handler', async ({ page }) => {
  await open(page);
  for (let [name, input] of [
    ['insert_title', {}], ['insert_title', { value: 42 }],
    ['insert_amount', { value: 'not a number' }],
    ['set_checked', { checked: 'true' }],
    ['set_choice', { value: 'missing' }], ['set_choice', { value: 'disabled' }],
    ['set_choices', { value: ['missing'] }],
  ]) {
    expect((await invoke(page, name, input)).isError).toBe(true);
  }
  expect(await page.locator('sym-context').evaluate((owner) => owner.$.amount)).toBe(1);
  await expect(page.locator('input[type=number]')).toHaveValue('1');
  await page.locator('#input-title').evaluate((el) => { el.readOnly = true; });
  expect((await invoke(page, 'insert_title', { value: 'Blocked' })).isError).toBe(true);
  await expect(page.locator('#input-title')).toHaveValue('Initial title');
  await page.locator('[toolname=set_checked]').evaluate((el) => { el.disabled = true; });
  expect((await invoke(page, 'set_checked', { checked: true })).isError).toBe(true);
  expect(await page.locator('sym-context').evaluate((owner) => owner.$.checked)).toBe(false);
});

test('generated action discovery uses operation metadata and excludes incidental or unlabeled actions', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    let owner = document.createElement('sym-context');
    owner.id = 'metadata-owner';
    owner.innerHTML = `
      <script type="application/json">{"active": false, "mouseup": false, "focus": false, "field": ""}</script>
      <button id="metadata-button" toolname="activate_details" tooldescription="  Expand\n the details.  " bind="onmouseup: [toggle]mouseup; onfocus: [toggle]focus; onclick: [toggle]active">Details</button>
      <button id="opaque-action" bind="onclick: [toggle]active"></button>
      <button id="excluded-action" toolname="excluded_event" tooldescription="Not an operation" bind="onmouseup: [toggle]mouseup">Mouseup only</button>
      <label for="associated-field">Associated field label</label><input id="associated-field" toolname="associated_field" bind="oninput: [pub-to]field">
    `;
    document.body.append(owner);
  });
  await expect(page.locator('#metadata-owner')).toHaveJSProperty('connectedOnce', true);
  let tools = await discover(page);
  let tool = tools.find((tool) => tool.name === 'activate_details');
  expect(tool.description).toMatch(/^Expand the details\.\nEvent: click\./);
  expect(tool.description).toContain('ID: metadata-button.');
  expect(tools.some((tool) => tool.name === 'excluded_event' || tool.description.includes('ID: opaque-action.'))).toBe(false);
  expect(tools.find((tool) => tool.name === 'associated_field').description).toContain('Associated field label');
  expect((await invoke(page, tool.name)).isError).not.toBe(true);
  expect(await page.locator('#metadata-owner').evaluate((owner) => owner.$.active)).toBe(true);
  await page.locator('#excluded-action').dispatchEvent('mouseup');
  expect(await page.locator('#metadata-owner').evaluate((owner) => owner.$.mouseup)).toBe(true);
  await page.locator('#metadata-button').evaluate((el) => {
    el.setAttribute('tooldescription', 'Updated action.');
    el.removeAttribute('id');
    el.closest('sym-context').syncWebMCPTools();
  });
  tool = (await discover(page)).find((tool) => tool.name === 'activate_details');
  expect(tool.description).toMatch(/^Updated action\./);
  expect(tool.description).not.toContain('ID:');
});

test('forwarded operations preserve their selected target while explicit descriptors work on excluded events', async ({ page }) => {
  await open(page);
  await page.evaluate(async () => {
    let { Symbiote } = await import('/core/Symbiote.js');
    let { ToolDescriptor } = await import('/core/webmcp.js');
    class Parent extends Symbiote {
      static mcpToolMode = true;
      init$ = { selected: '', select: (event) => { this.$.selected = event.target.id; } };
    }
    Parent.template = '<metadata-child></metadata-child>';
    class Child extends Symbiote {
      static mcpToolMode = true;
      init$ = { explicit: new ToolDescriptor({ name: 'authored_operation', description: 'Explicit operation.', execute: () => 'authored' }) };
    }
    Child.template = `<button id="incidental-target" bind="onmouseup: ^select" tooldescription="Wrong target"></button>
      <button id="plain-target" bind="onclick: ^select">Plain</button>
      <button id="selected-target" bind="onclick: ^select" toolname="select_target" tooldescription="Select this target.">Selected</button>
      <button id="explicit-target" bind="onmouseup: explicit" toolname="ignored_override">Explicit</button>`;
    Child.reg('metadata-child');
    Parent.reg('metadata-parent');
    document.body.append(document.createElement('metadata-parent'));
  });
  await expect(page.locator('metadata-child')).toHaveJSProperty('connectedOnce', true);
  let tool = (await discover(page)).find((tool) => tool.name === 'select_target');
  expect(tool.description).toContain('Source binding: <metadata-child>.');
  expect(tool.description).toContain('ID: selected-target.');
  expect((await invoke(page, 'select_target')).isError).not.toBe(true);
  expect(await page.locator('metadata-parent').evaluate((owner) => owner.$.selected)).toBe('selected-target');
  expect(await invoke(page, 'authored_operation')).toBe('authored');
  expect((await discover(page)).some((tool) => tool.name === 'ignored_override')).toBe(false);
  await page.locator('metadata-child').evaluate((el) => el.remove());
  expect((await invoke(page, 'select_target')).isError).toBe(true);
});

test('annotated forms preserve review semantics and keep unrelated actions available without native support', async ({ page }) => {
  await page.goto('/test/browser/fixtures/webmcp-forms.html');
  await page.waitForFunction(() => window.__WEBMCP_FORMS_READY);
  let tools = await discover(page);
  expect(tools.some((tool) => tool.name === 'review_submit' || tool.key.includes('submitReview'))).toBe(false);
  expect(tools.some((tool) => tool.name === 'independent_action')).toBe(true);
  expect(tools.some((tool) => tool.key.includes('submitPlain'))).toBe(true);
  expect((await invoke(page, 'native_submit')).isError).not.toBe(true);
  expect(await page.locator('webmcp-form-controls').evaluate((owner) => owner.$.submissions)).toBe(1);
  await page.locator('#review-form button').click();
  expect(await page.locator('webmcp-form-controls').evaluate((owner) => owner.$.reviews)).toBe(1);
});

for (let entry of [
  '/html-app/index.js',
  '/html-app/index.js?standard=true#entry',
]) {
  test(`standard entry does not load or activate WebMCP: ${entry}`, async ({
    page,
  }) => {
    let requested = [];
    page.on('request', (request) => requested.push(new URL(request.url()).pathname));
    await open(page, entry);
    await page.getByRole('button', {
      name: 'Toggle flag',
    }).click();
    await expect(page.locator('output')).toHaveText('true');
    expect(await modeState(page)).toEqual({
      extension: false,
      foundation: false,
      global: false,
    });
    expect(requested.some((path) => path.startsWith('/core/webmcp'))).toBe(false);
  });
}

for (let entry of [
  '/html-app/webmcp/index.js',
  '/html-app/webmcp/index.js?bootstrap=enabled#entry',
]) {
  test(`WebMCP entry exposes initial, imported and Itemize actions: ${entry}`, async ({
    page,
  }) => {
    await open(page, entry);
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

test('a CDN module wrapper enables tools through the WebMCP entry', async ({
  page,
}) => {
  await page.route('**/cdn/bootstrap.js', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: 'export * from \'/html-app/webmcp/index.js\';',
  }));
  await open(page, '/cdn/bootstrap.js');
  expect(await modeState(page)).toEqual({
    extension: true,
    foundation: true,
    global: false,
  });
  expect((await executeAction(page, 'sym-context', 'Toggle flag')).failed).toBe(false);
  await expect(page.locator('output')).toHaveText('true');
});

for (let entry of [
  '/html-app/index.js',
  '/html-app/webmcp/index.js',
]) {
  test(`entry does not inspect the loader script: ${entry}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, 'currentScript', {
        get() { throw new Error('Entry points must not inspect their loader script.'); },
      });
    });
    await open(page, entry);
    let enabled = entry.includes('/webmcp/');
    expect(await modeState(page)).toEqual({
      extension: enabled,
      foundation: enabled,
      global: false,
    });
    if (enabled) {
      expect((await executeAction(page, 'sym-context', 'Toggle flag')).failed).toBe(false);
    }
  });
}

for (let entry of ['index.js', 'webmcp/index.js']) {
  test(`bundled HTML-app entry preserves its activation and public APIs: ${entry}`, async ({ page }) => {
    let enabled = entry.startsWith('webmcp/');
    let bundle = await build({
      entryPoints: [fileURLToPath(new URL('../../html-app/' + entry, import.meta.url))],
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2020',
      write: false,
      metafile: true,
    });
    if (!enabled) {
      expect(Object.keys(bundle.metafile.inputs).some((path) => path.includes('core/webmcp'))).toBe(false);
    }
    await page.route('**/cdn/bundle.js', (route) => route.fulfill({
      contentType: 'text/javascript',
      body: bundle.outputFiles[0].text,
    }));
    await open(page, '/cdn/bundle.js');
    expect(await modeState(page, '/cdn/bundle.js')).toEqual({
      extension: enabled,
      foundation: enabled,
      global: false,
    });
    if (enabled) {
      expect(await page.evaluate(async () => {
        let { getActiveWebMCPTools, executeWebMCPTool } = await import('/cdn/bundle.js');
        let names = getActiveWebMCPTools().map((tool) => tool.name);
        let result = await executeWebMCPTool('insert_title', { value: 'Bundled insertion' });
        return { names, failed: !!result.isError };
      })).toMatchObject({ names: expect.arrayContaining(['insert_title', 'insert_notes']), failed: false });
      await expect(page.locator('#input-title')).toHaveValue('Bundled insertion');
    } else {
      await page.getByRole('button', { name: 'Toggle flag', exact: true }).click();
      await expect(page.locator('output')).toHaveText('true');
    }
  });
}

test('WebMCP components wait for the extension before registering and rendering', async ({
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

test('the standard entry stays independent during SSR', async ({
  page,
}) => {
  await page.addInitScript(() => { globalThis.__SYMBIOTE_SSR = true; });
  await page.route('**/html-app-webmcp.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><script type="module" src="/html-app/index.js"></script>',
  }));
  await page.goto(fixture);
  expect(await modeState(page)).toEqual({
    extension: false,
    foundation: false,
    global: false,
  });
  expect(await page.evaluate(() => !!customElements.get('sym-context'))).toBe(true);
});
