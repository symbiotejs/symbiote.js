import { test, expect } from '@playwright/test';

async function state(page, key) {
  return page.evaluate((key) => document.querySelector('sym-context[ctx="APP"]').$['+' + key], key);
}

async function ready(page) {
  await expect(page.locator('li')).toHaveCount(1);
  await expect.poll(() => state(page, 'loading')).toBe(false);
}

test('HTML-only Todo saves selected fields and a late acknowledgment leaves newer edits dirty', async ({
  page,
}) => {
  let stored = {
    tasks: [
      {
        id: 'a',
        title: 'Initial',
        done: false,
      },
    ],
  };
  let writes = [];
  let release;
  let delay = true;
  await page.route('**/api/tasks', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: stored,
      });
      return;
    }
    let payload = route.request().postDataJSON();
    writes.push(payload);
    if (delay) {
      await new Promise((done) => { release = done; });
    }
    stored = payload;
    await route.fulfill({
      status: 204,
    });
  });
  await page.goto('/test/browser/fixtures/html-app-todo.html');
  await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').setAttribute('src', '/api/tasks'));
  await ready(page);
  expect(await state(page, 'savedRevision')).toBeNull();
  expect(writes).toHaveLength(0);
  await page.locator('li').getByRole('textbox').fill('First edit');
  expect(await state(page, 'dirty')).toBe(true);
  await page.evaluate(() => {
    let form = document.querySelector('form[aria-label="Save tasks"]');
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect.poll(() => writes.length).toBe(1);
  await expect.poll(() => !!release).toBe(true);
  let submitted = await state(page, 'revision');
  await page.locator('li').getByRole('textbox').fill('Newer edit');
  release();
  await expect.poll(() => state(page, 'saving')).toBe(false);
  expect(await state(page, 'savedRevision')).toBe(submitted);
  expect(await state(page, 'revision')).toBeGreaterThan(submitted);
  expect(await state(page, 'dirty')).toBe(true);
  expect(Object.keys(writes[0])).toEqual([
    'tasks',
  ]);
  expect(writes[0].tasks[0].title).toBe('First edit');
  expect(stored.tasks[0].title).toBe('First edit');
  await expect(page.locator('li').getByRole('textbox')).toHaveValue('Newer edit');
  delay = false;
  await page.getByRole('button', {
    name: 'Save tasks',
    exact: true,
  }).click();
  await expect.poll(() => writes.length).toBe(2);
  await expect.poll(() => state(page, 'dirty')).toBe(false);
  expect(stored.tasks[0].title).toBe('Newer edit');
  expect(await state(page, 'savedRevision')).toBe(await state(page, 'revision'));
});

test('failed saves retain records and drafts and never retry automatically', async ({
  page,
}) => {
  let writes = 0;
  await page.route('**/api/tasks', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          tasks: [
            {
              id: 'a',
              title: 'Initial',
              done: false,
            },
          ],
        },
      });
    } else {
      writes++;
      await route.fulfill({
        status: 503,
        body: 'Unavailable',
      });
    }
  });
  await page.goto('/test/browser/fixtures/html-app-todo.html');
  await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').setAttribute('src', '/api/tasks'));
  await ready(page);
  await page.locator('li').getByRole('textbox').fill('Unsaved record');
  await page.getByRole('form', {
    name: 'New task',
  }).getByRole('textbox').fill('Unsubmitted draft');
  await page.getByRole('button', {
    name: 'Save tasks',
    exact: true,
  }).click();
  await expect.poll(async () => (await state(page, 'syncError'))?.code).toBe('HTTP_ERROR');
  await expect(page.locator('li').getByRole('textbox')).toHaveValue('Unsaved record');
  await expect(page.getByRole('form', {
    name: 'New task',
  }).getByRole('textbox')).toHaveValue('Unsubmitted draft');
  expect(await state(page, 'savedRevision')).toBeNull();
  expect(await state(page, 'dirty')).toBe(true);
  await page.waitForTimeout(100);
  expect(writes).toBe(1);
});

test('form submission flushes pending fields and JSON acknowledgments do not replace current data', async ({
  page,
}) => {
  let body;
  let methods = [];
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          name: 'Initial',
        },
      });
    } else {
      methods.push(route.request().method());
      body = route.request().postDataJSON();
      await route.fulfill({
        json: {
          name: 'Server acknowledgment',
        },
      });
    }
  });
  await page.goto('/test/browser/fixtures/html-app-sources.html');
  await page.evaluate(() => {
    document.body.innerHTML = '<sym-context ctx="APP" src="/api/profile" sync="/api/profile" sync-method="PATCH">'
      + '<form bind="onsubmit: [sync]APP"><label>Name<input required bind="value: name; oninput: [pub-to-1000]name"></label>'
      + '<button type="submit">Save profile</button></form></sym-context>';
  });
  await expect(page.getByRole('textbox')).toHaveValue('Initial');
  await expect.poll(() => state(page, 'loading')).toBe(false);
  await page.getByRole('textbox').fill('Flushed value');
  await page.getByRole('textbox').press('Enter');
  await expect.poll(() => methods.length).toBe(1);
  expect(methods).toEqual([
    'PATCH',
  ]);
  expect(body).toEqual({
    name: 'Flushed value',
  });
  await expect.poll(() => state(page, 'saving')).toBe(false);
  await expect(page.getByRole('textbox')).toHaveValue('Flushed value');
  expect(await state(page, 'dirty')).toBe(false);
});

test('explicit load and sync actions await real results through the public WebMCP API', async ({
  page,
}) => {
  let writes = [];
  await page.route('**/api/mcp', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          name: 'Loaded',
        },
      });
    } else {
      writes.push(route.request().postDataJSON());
      await route.fulfill({
        status: 204,
      });
    }
  });
  await page.goto('/test/browser/fixtures/html-app-sources.html');
  expect(await page.evaluate(async () => {
    let {
      Symbiote,
      DICT,
    } = await import('/core/Symbiote.js');
    let {
      getActiveWebMCPTools,
      executeWebMCPTool,
    } = await import('/core/webmcp.js');
    Symbiote.mcpToolMode = true;
    let owner = document.createElement('sym-context');
    owner.setAttribute('ctx', 'APP');
    owner.setAttribute('src', '/api/mcp');
    owner.setAttribute('sync', '/api/mcp');
    owner.innerHTML = '<script type="application/json">{"name":"Default"}</script>'
      + '<button type="button" bind="onclick: [load]APP">Load</button>'
      + '<button type="button" bind="onclick: [sync]APP">Sync</button>';
    document.body.append(owner);
    await new Promise((done) => owner.addEventListener('load', done, {
      once: true,
    }));
    let invoke = async (label) => {
      let entry = owner[DICT.MCP_EVENTS_KEY].find((binding) => binding.el.textContent === label);
      let tool = getActiveWebMCPTools().find((tool) => tool.ownerId === owner[DICT.MCP_OWNER_ID_KEY]
        && tool.key === 'auto:' + entry.key);
      if (!tool) {
        throw new Error('Request action was not discovered.');
      }
      return executeWebMCPTool(tool.name, {});
    };
    let loaded = await invoke('Load');
    owner.$.name = 'Saved through MCP';
    let saved = await invoke('Sync');
    return {
      loaded: !loaded.isError && loaded.content.some((item) => item.text?.includes('Response status - ok')),
      saved: !saved.isError && saved.content.some((item) => item.text?.includes('Response status - ok')),
      saving: owner.requests.state.saving,
      acknowledged: owner.contextData.savedRevision === owner.contextData.revision,
    };
  })).toEqual({
    loaded: true,
    saved: true,
    saving: false,
    acknowledged: true,
  });
  expect(writes).toEqual([
    {
      name: 'Saved through MCP',
    },
  ]);
});

test('busy requests and destination changes cannot acknowledge canceled writes or retry them', async ({
  page,
}) => {
  let releaseLoad;
  let releaseWrite;
  let writes = 0;
  await page.route('**/api/data', async (route) => {
    await new Promise((done) => { releaseLoad = done; });
    await route.fulfill({
      json: {
        name: 'Loaded',
      },
    });
  });
  await page.route('**/api/save*', async (route) => {
    writes++;
    await new Promise((done) => { releaseWrite = done; });
    await route.fulfill({
      status: 204,
    });
  });
  await page.goto('/test/browser/fixtures/html-app-sources.html');
  await page.evaluate(() => {
    document.body.innerHTML = '<sym-context ctx="APP" src="/api/data" sync="/api/save-old">'
      + '<script type="application/json">{"name":"Default"}</script>'
      + '<label>Name<input bind="value: name; oninput: [pub-to]name"></label>'
      + '<button type="button" bind="onclick: [sync]APP">Sync</button></sym-context>';
  });
  await expect.poll(() => !!releaseLoad).toBe(true);
  expect(await page.evaluate(async () => {
    let result = await document.querySelector('sym-context').requests.sync();
    return result.error.code;
  })).toBe('BUSY');
  expect(writes).toBe(0);
  releaseLoad();
  await expect(page.getByRole('textbox')).toHaveValue('Loaded');
  await expect.poll(() => state(page, 'loading')).toBe(false);
  await page.getByRole('textbox').fill('Unsaved');
  await page.getByRole('button').click();
  await expect.poll(() => !!releaseWrite).toBe(true);
  expect(await page.evaluate(async () => {
    let result = await document.querySelector('sym-context').requests.load();
    return result.error.code;
  })).toBe('BUSY');
  await page.evaluate(() => document.querySelector('sym-context').setAttribute('sync', '/api/save-new'));
  releaseWrite();
  await expect.poll(() => state(page, 'saving')).toBe(false);
  expect(await state(page, 'savedRevision')).toBeNull();
  expect(await state(page, 'dirty')).toBe(true);
  expect(writes).toBe(1);
  releaseWrite = undefined;
  await page.getByRole('button').click();
  await expect.poll(() => !!releaseWrite).toBe(true);
  await page.evaluate(() => {
    window.detachedSource = document.querySelector('sym-context');
    window.detachedSource.remove();
    window.detachedSource.destroy();
  });
  releaseWrite();
  expect(await page.evaluate(() => window.detachedSource.contextData.savedRevision)).toBeNull();
  await page.evaluate(() => document.body.append(window.detachedSource));
  await expect(page.getByRole('textbox')).toHaveValue('Unsaved');
  expect(writes).toBe(2);
});
