import { test, expect } from '@playwright/test';

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app-sources.html');
});

async function mount(page, markup) {
  await page.evaluate((markup) => { document.body.innerHTML = markup; }, markup);
}

async function state(page, key) {
  return page.evaluate((key) => document.querySelector('sym-import').$['+' + key], key);
}

test('imports retain native object scope, outgoing publication, declarations and bindable completion', async ({
  page,
}) => {
  await page.route('**/fragments/panel.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<script type="application/json">{"label":"Default"}</script>'
      + '<sym-component reg="import-note"><template><p>{{^label}}</p></template></sym-component>'
      + '<import-note></import-note><label>Name<input bind="value: label; oninput: [pub-to]label"></label>',
  }));
  await mount(page, '<sym-context ctx="APP"><script type="application/json">{"record":{"label":"Incoming"},"result":"","loaded":false,"yes":true}</script>'
    + '<sym-import src="/fragments/panel.html" bind="$: APP/record; onload: [set]APP/loaded" action-data="APP/yes" pub-map="APP/result: label"></sym-import>'
    + '<output>{{result}}</output></sym-context>');
  await expect(page.getByRole('textbox')).toHaveValue('Incoming');
  await expect(page.locator('p')).toHaveText('Incoming');
  await page.getByRole('textbox').fill('Outgoing');
  await expect(page.locator('output')).toHaveText('Outgoing');
  await expect(page.locator('p')).toHaveText('Outgoing');
  expect(await page.evaluate(() => document.querySelector('sym-context').$.loaded)).toBe(true);
  expect(await state(page, 'loading')).toBe(false);
  expect(await state(page, 'loadError')).toBeNull();
});

test('replacement disposes only fragment actions, refs, contexts and pending edits', async ({
  page,
}) => {
  await page.route('**/fragments/one.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<sym-context ctx="INNER"><script type="application/json">{"label":"One"}</script>'
      + '<input ref="entry" aria-label="Fragment draft" bind="value: label; oninput: [pub-to-500]APP/result">'
      + '</sym-context><span ref="fragment">One</span>',
  }));
  await page.route('**/fragments/two.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<sym-context ctx="INNER"><script type="application/json">{"label":"Two"}</script><p>{{label}}</p></sym-context>',
  }));
  await mount(page, '<sym-context ctx="APP"><script type="application/json">{"result":"Retained","flag":false}</script>'
    + '<button ref="outside" type="button" bind="onclick: [toggle]flag">Outside action</button>'
    + '<sym-import src="/fragments/one.html"></sym-import><output>{{result}}</output></sym-context>');
  await page.getByRole('textbox').fill('Stale edit');
  await page.evaluate(() => {
    let host = document.querySelector('sym-import');
    window.oldFragment = host.firstElementChild;
    host.setAttribute('src', '/fragments/two.html');
  });
  await expect(page.locator('p')).toHaveText('Two');
  await page.waitForTimeout(550);
  await expect(page.locator('output')).toHaveText('Retained');
  await page.getByRole('button').click();
  expect(await page.evaluate(() => ({
    flag: document.querySelector('sym-context').$.flag,
    outsideRef: document.querySelector('sym-context').ref.outside?.isConnected,
    oldSubscriptions: window.oldFragment.allSubs.size,
    oldActions: window.oldFragment.actionBindings.bindings.length,
    oldRefs: Object.keys(window.oldFragment.ref).length,
    newContext: document.querySelector('sym-context[ctx="INNER"]').$.label,
  }))).toEqual({
    flag: true,
    outsideRef: true,
    oldSubscriptions: 0,
    oldActions: 0,
    oldRefs: 0,
    newContext: 'Two',
  });
});

test('source changes and disconnection cancel stale responses and support reconnect', async ({
  page,
}) => {
  let release;
  await page.route('**/fragments/old.html', async (route) => {
    await new Promise((done) => { release = done; });
    await route.fulfill({
      contentType: 'text/html',
      body: '<p>Old response</p>',
    });
  });
  await page.route('**/fragments/new.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<p>New response</p>',
  }));
  await mount(page, '<sym-import src="/fragments/old.html"><p>Fallback</p></sym-import>');
  await expect.poll(() => !!release).toBe(true);
  await page.evaluate(() => document.querySelector('sym-import').setAttribute('src', '/fragments/new.html'));
  await expect(page.locator('p')).toHaveText('New response');
  release();
  await expect.poll(() => state(page, 'loading')).toBe(false);
  expect(await state(page, 'loadError')).toBeNull();
  await page.evaluate(() => {
    let host = document.querySelector('sym-import');
    host.remove();
    host.destroy();
    document.body.append(host);
  });
  await expect(page.locator('p')).toHaveText('New response');
  expect(await state(page, 'loadError')).toBeNull();
});

test('relative assets, nested imports and JSON sources follow the containing fragment URL', async ({
  page,
}) => {
  await page.route('**/parts/outer.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<a href="guide.html">Guide</a><svg><use href="#marker"></use></svg>'
      + '<img alt="Asset" src="./picture.png" srcset="./small.png 1x, ./large.png 2x">'
      + '<sym-context ctx="REMOTE" src="./values.json"><output>{{label}}</output></sym-context>'
      + '<sym-import src="./nested/inner.html"></sym-import>',
  }));
  await page.route('**/parts/values.json', (route) => route.fulfill({
    json: {
      label: 'Relative JSON',
    },
  }));
  await page.route('**/parts/nested/inner.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<a href="../other.html">Nested link</a><p>Nested import</p>',
  }));
  await mount(page, '<sym-import src="/parts/outer.html"></sym-import>');
  await expect(page.locator('output')).toHaveText('Relative JSON');
  await expect(page.locator('p')).toHaveText('Nested import');
  await expect(page.getByRole('link', {
    name: 'Guide',
  })).toHaveAttribute('href', /\/parts\/guide\.html$/);
  await expect(page.getByRole('link', {
    name: 'Nested link',
  })).toHaveAttribute('href', /\/parts\/other\.html$/);
  await expect(page.locator('use')).toHaveAttribute('href', '#marker');
  await expect(page.locator('img')).toHaveAttribute('srcset', /\/parts\/small\.png 1x, http:\/\/[^ ]+\/parts\/large\.png 2x$/);
});

for (let unsafe of [
  '<script>window.executed = true</script>',
  '<template><script type="module" src="/execute.js"></script></template>',
  '<button onclick="window.executed = true">Unsafe</button>',
  '<svg><a xlink:href="javascript:alert(1)">Unsafe</a></svg>',
  '<a href="java&#10;script:alert(1)">Unsafe</a>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<base href="https://example.com/">',
  '<template><img srcset="data:image/svg+xml,test 1x"></template>',
]) {
  test('rejects executable imported markup: ' + unsafe.slice(0, 55), async ({
    page,
  }) => {
    await page.route('**/unsafe.html', (route) => route.fulfill({
      contentType: 'text/html',
      body: unsafe,
    }));
    await mount(page, '<sym-import src="/unsafe.html"><p>Safe fallback</p></sym-import>');
    await expect.poll(async () => (await state(page, 'loadError'))?.code).toBe('UNSAFE_TEMPLATE');
    await expect(page.locator('p')).toHaveText('Safe fallback');
    expect(await page.evaluate(() => window.executed)).toBeUndefined();
  });
}

test('failures retain the mounted fragment and a retry clears the previous error', async ({
  page,
}) => {
  await page.route('**/good.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<label>Draft<input></label>',
  }));
  await page.route('**/bad.html', (route) => route.fulfill({
    status: 503,
    body: 'Unavailable',
  }));
  await mount(page, '<sym-import src="/good.html"></sym-import>');
  await page.getByRole('textbox').fill('Retained draft');
  await page.evaluate(() => document.querySelector('sym-import').setAttribute('src', '/bad.html'));
  await expect.poll(async () => (await state(page, 'loadError'))?.code).toBe('HTTP_ERROR');
  await expect(page.getByRole('textbox')).toHaveValue('Retained draft');
  await page.evaluate(() => document.querySelector('sym-import').setAttribute('src', '/good.html'));
  await expect(page.getByRole('textbox')).toHaveValue('');
  expect(await state(page, 'loadError')).toBeNull();
});

test('cycles and excessive nesting terminate with structured errors', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/loop.html', (route) => {
    requests++;
    return route.fulfill({
      contentType: 'text/html',
      body: '<sym-import src="./loop.html"></sym-import>',
    });
  });
  await mount(page, '<sym-import src="/loop.html"></sym-import>');
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('sym-import')[1]?.$['+loadError']?.code)).toBe('IMPORT_CYCLE');
  expect(requests).toBe(1);
  await page.route('**/level/*.html', (route) => {
    let level = Number(new URL(route.request().url()).pathname.split('/').pop().split('.')[0]);
    return route.fulfill({
      contentType: 'text/html',
      body: '<sym-import src="./' + (level + 1) + '.html"></sym-import>',
    });
  });
  await page.evaluate(() => document.querySelector('sym-import').setAttribute('src', '/level/0.html'));
  await expect.poll(() => page.evaluate(() => [
    ...document.querySelectorAll('sym-import'),
  ].some((owner) => owner.$['+loadError']?.code === 'IMPORT_CYCLE'))).toBe(true);
  await expect(page.locator('sym-import')).toHaveCount(17);
});

test('the imported Todo and settings round-trip through explicit browser storage', async ({
  page,
}) => {
  await page.goto('/html-app/todo-import.html');
  await page.getByRole('textbox', {
    name: 'New task',
  }).fill('Persisted imported task');
  await page.getByRole('button', {
    name: 'Add task',
  }).click();
  await page.getByText('Settings', {
    exact: true,
  }).click();
  await page.getByRole('textbox', {
    name: 'List title',
  }).fill('Stored title');
  await page.getByRole('button', {
    name: 'Save in this browser',
  }).click();
  await expect.poll(() => page.evaluate(() => document.querySelector('sym-context').$['+storageDirty'])).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading')).toHaveText('Stored title');
  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.getByRole('textbox', {
    name: 'Title',
    exact: true,
  })).toHaveValue('Persisted imported task');
});

test('imported native WebMCP actions are discoverable and disposed with their fragment', async ({
  page,
}) => {
  await page.route('**/tools.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<button type="button" bind="onclick: [toggle]flag">Toggle imported</button>',
  }));
  await page.route('**/plain.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<p>Replacement</p>',
  }));
  expect(await page.evaluate(async () => {
    let {
      DICT,
    } = await import('/core/Symbiote.js');
    let {
      getActiveWebMCPTools,
      executeWebMCPTool,
    } = await import('/core/webmcp.js');
    let host = document.createElement('sym-import');
    host.mcpToolMode = true;
    host.$ = {
      flag: false,
    };
    host.setAttribute('src', '/tools.html');
    document.body.append(host);
    await new Promise((done) => host.addEventListener('load', done, {
      once: true,
    }));
    let owner = host.firstElementChild;
    let entry = owner[DICT.MCP_EVENTS_KEY].find((binding) => binding.el.textContent === 'Toggle imported');
    let ownerId = owner[DICT.MCP_OWNER_ID_KEY];
    let tool = getActiveWebMCPTools().find((tool) => tool.ownerId === ownerId && tool.key === 'auto:' + entry.key);
    if (!tool) {
      throw new Error('Imported action was not discovered.');
    }
    let result = await executeWebMCPTool(tool.name, {});
    let invoked = !result.isError && host.$.flag;
    host.setAttribute('src', '/plain.html');
    await new Promise((done) => host.addEventListener('load', done, {
      once: true,
    }));
    return {
      invoked,
      cleaned: !getActiveWebMCPTools().some((tool) => tool.ownerId === ownerId),
    };
  })).toEqual({
    invoked: true,
    cleaned: true,
  });
});
