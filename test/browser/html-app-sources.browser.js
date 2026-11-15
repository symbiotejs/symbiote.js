import { test, expect } from '@playwright/test';

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app-sources.html');
});

async function mount(page, markup) {
  await page.evaluate(async (markup) => {
    let {
      Symbiote,
    } = await import('/core/Symbiote.js');
    let previous = [
      ...document.body.querySelectorAll('*'),
    ].reverse();
    document.body.replaceChildren();
    for (let element of previous) {
      if (element instanceof Symbiote) {
        element.destroy();
      }
    }
    document.body.innerHTML = markup;
  }, markup);
}

async function status(page, key) {
  return page.evaluate((key) => document.querySelector('sym-context[ctx="REMOTE"]')?.$?.['+' + key], key);
}

test('source-only named fields reach earlier consumers, collections and conditions', async ({
  page,
}) => {
  let release;
  await page.route('**/api/source', async (route) => {
    await new Promise((done) => { release = done; });
    await route.fulfill({
      json: {
        label: 'Arrived',
        items: [
          {
            id: 'a',
            title: 'First',
          },
        ],
        ready: true,
      },
    });
  });
  await mount(page, '<sym-component><h1 bind="textContent: REMOTE/label"></h1></sym-component>'
    + '<sym-context ctx="REMOTE" src="/api/source">'
    + '<sym-collection data="REMOTE/items"><ul itemize="items"><template><li>{{title}}</li></template></ul></sym-collection>'
    + '<sym-conditional when="REMOTE/ready"><p>Content ready</p></sym-conditional></sym-context>');
  await expect.poll(() => status(page, 'loading')).toBe(true);
  await expect(page.locator('li')).toHaveCount(0);
  await expect.poll(() => !!release).toBe(true);
  release();
  await expect(page.locator('h1')).toHaveText('Arrived');
  await expect(page.locator('li')).toHaveText('First');
  await expect(page.getByText('Content ready', {
    exact: true,
  })).toBeVisible();
  await expect.poll(() => status(page, 'loading')).toBe(false);
  expect(await status(page, 'savedRevision')).toBeNull();
});

test('GET merges defaults while preserving user edits and incoming object fields', async ({
  page,
}) => {
  let release;
  let writes = 0;
  await page.route('**/api/source', async (route) => {
    if (route.request().method() !== 'GET') {
      writes++;
    }
    await new Promise((done) => { release = done; });
    await route.fulfill({
      json: {
        name: 'Server',
        count: 7,
      },
    });
  });
  await mount(page, '<sym-context ctx="REMOTE" src="/api/source" sync="/api/source">'
    + '<script type="application/json">{"name":"Default","count":0,"preserved":"Inline"}</script>'
    + '<label>Name<input bind="value: name; oninput: [pub-to]name"></label><output>{{count}}</output></sym-context>');
  await expect.poll(() => status(page, 'loading')).toBe(true);
  await page.getByRole('textbox', {
    name: 'Name',
  }).fill('Local edit');
  await expect.poll(() => !!release).toBe(true);
  release();
  await expect(page.locator('output')).toHaveText('7');
  await expect(page.getByRole('textbox')).toHaveValue('Local edit');
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="REMOTE"]').$.preserved)).toBe('Inline');
  expect(await status(page, 'dirty')).toBe(true);
  expect(writes).toBe(0);

  await page.unroute('**/api/source');
  await page.route('**/api/bound', (route) => route.fulfill({
    json: {
      name: 'Server',
      count: 9,
    },
  }));
  await mount(page, '<sym-context ctx="PARENT"><script type="application/json">{"record":{"name":"Bound"}}</script>'
    + '<sym-context ctx="BOUND" src="/api/bound" bind="$: PARENT/record">'
    + '<script type="application/json">{"name":"Default","count":0}</script><h2>{{name}}</h2><output>{{count}}</output>'
    + '</sym-context></sym-context>');
  await expect(page.locator('output')).toHaveText('9');
  await expect(page.locator('h2')).toHaveText('Bound');
});

test('URL changes and removal abort pending loads without stale writes or errors', async ({
  page,
}) => {
  let releaseOld;
  await page.route('**/api/old', async (route) => {
    await new Promise((done) => { releaseOld = done; });
    await route.fulfill({
      json: {
        label: 'Old',
      },
    });
  });
  await page.route('**/api/new', (route) => route.fulfill({
    json: {
      label: 'New',
    },
  }));
  await mount(page, '<sym-context ctx="REMOTE" src="/api/old"><script type="application/json">{"label":"Default"}</script><h1>{{label}}</h1></sym-context>');
  await expect.poll(() => status(page, 'loading')).toBe(true);
  await expect.poll(() => !!releaseOld).toBe(true);
  await page.evaluate(() => document.querySelector('sym-context').setAttribute('src', '/api/new'));
  await expect(page.locator('h1')).toHaveText('New');
  releaseOld();
  await expect.poll(() => status(page, 'loading')).toBe(false);
  expect(await status(page, 'loadError')).toBeNull();
  await page.evaluate(() => {
    window.removedSource = document.querySelector('sym-context');
    window.removedSource.remove();
    window.removedSource.destroy();
    document.body.append(window.removedSource);
  });
  await expect(page.locator('h1')).toHaveText('New');
});

for (let scenario of [
  {
    name: 'field type',
    response: {
      contentType: 'application/json',
      body: '{"name":{}}',
    },
    code: 'INVALID_DATA',
  },
  {
    name: 'HTTP',
    response: {
      status: 503,
      body: 'Unavailable',
    },
    code: 'HTTP_ERROR',
  },
  {
    name: 'invalid JSON',
    response: {
      contentType: 'application/json',
      body: '{',
    },
    code: 'INVALID_DATA',
  },
  {
    name: 'wrong MIME',
    response: {
      contentType: 'text/html',
      body: '{}',
    },
    code: 'INVALID_CONTENT_TYPE',
  },
  {
    name: 'unsafe fields',
    response: {
      contentType: 'application/json',
      body: '{"__proto__":{"polluted":true}}',
    },
    code: 'INVALID_DATA',
  },
  {
    name: 'non-object JSON',
    response: {
      contentType: 'application/json',
      body: '[]',
    },
    code: 'INVALID_DATA',
  },
]) {
  test('failed loading retains drafts: ' + scenario.name, async ({
    page,
  }) => {
    await page.route('**/api/fail', (route) => route.fulfill(scenario.response));
    await mount(page, '<sym-context ctx="REMOTE" src="/api/fail"><script type="application/json">{"name":"Retained"}</script><label>Name<input bind="value: name; oninput: [pub-to]name"></label></sym-context>');
    await expect.poll(async () => (await status(page, 'loadError'))?.code).toBe(scenario.code);
    await expect(page.getByRole('textbox')).toHaveValue('Retained');
    expect(await status(page, 'savedRevision')).toBeNull();
  });
}

test('request limits report timeout and response overflow with structured errors', async ({
  page,
}) => {
  await page.route('**/api/large', (route) => route.fulfill({
    json: {
      text: 'x'.repeat(100),
    },
  }));
  await mount(page, '<sym-context ctx="REMOTE" src="/api/large" max-bytes="30"></sym-context>');
  await expect.poll(async () => (await status(page, 'loadError'))?.code).toBe('TOO_LARGE');
  await page.route('**/api/slow', async (route) => {
    await new Promise((done) => setTimeout(done, 100));
    await route.fulfill({
      json: {
        label: 'Too late',
      },
    });
  });
  await mount(page, '<sym-context ctx="REMOTE" src="/api/slow" request-timeout="20"></sym-context>');
  await expect.poll(async () => (await status(page, 'loadError'))?.code).toBe('TIMEOUT');
});

test('late subscriptions can be canceled before a context or field exists', async ({
  page,
}) => {
  expect(await page.evaluate(async () => {
    let {
      SymComponent,
    } = await import('/html-app/index.js');
    let {
      PubSub,
    } = await import('/core/index.js');
    let owner = new SymComponent();
    document.body.append(owner);
    await new Promise(queueMicrotask);
    let calls = 0;
    let waiting = owner.sub('LATE/value', () => calls++);
    waiting.remove();
    waiting.remove();
    PubSub.registerCtx({}, 'LATE').add('value', 1);
    owner.remove();
    owner.destroy();
    return {
      calls,
      pending: PubSub.pendingDeps.has('LATE'),
      callbacks: PubSub.getCtx('LATE', false).callbackMap.value?.size ?? 0,
    };
  })).toEqual({
    calls: 0,
    pending: false,
    callbacks: 0,
  });
});

test('source data cannot replace registered handlers', async ({
  page,
}) => {
  await page.route('**/api/control', (route) => route.fulfill({
    json: {
      handler: 'replacement',
      label: 'Changed',
    },
  }));
  await page.evaluate(() => {
    let owner = document.createElement('sym-context');
    owner.setAttribute('ctx', 'REMOTE');
    owner.setAttribute('src', '/api/control');
    owner.$ = {
      handler: () => { window.handlerCalls = (window.handlerCalls ?? 0) + 1; },
    };
    owner.innerHTML = '<script type="application/json">{"label":"Retained"}</script>'
      + '<button type="button" bind="onclick: handler">Original handler</button><output>{{label}}</output>';
    document.body.append(owner);
  });
  await expect.poll(async () => (await status(page, 'loadError'))?.code).toBe('INVALID_DATA');
  await page.getByRole('button').click();
  expect(await page.evaluate(() => window.handlerCalls)).toBe(1);
  await expect(page.locator('output')).toHaveText('Retained');
});

test('a source-only debounced edit survives an older load and flushes on submit', async ({
  page,
}) => {
  let release;
  await page.route('**/api/draft', async (route) => {
    await new Promise((done) => { release = done; });
    await route.fulfill({
      json: {
        name: 'Server',
        count: 3,
      },
    });
  });
  await mount(page, '<sym-context ctx="REMOTE" src="/api/draft">'
    + '<script type="application/json">{"submitted":""}</script>'
    + '<form action-data="REMOTE/name" bind="onsubmit: [set]submitted">'
    + '<label>Name<input bind="value: name; oninput: [pub-to-1000]name"></label>'
    + '<button type="submit">Accept draft</button></form><output>{{count}}</output></sym-context>');
  await expect.poll(() => !!release).toBe(true);
  await page.getByRole('textbox').fill('Pending local edit');
  release();
  await expect(page.locator('output')).toHaveText('3');
  await expect(page.getByRole('textbox')).toHaveValue('Pending local edit');
  await page.getByRole('button').click();
  expect(await page.evaluate(() => {
    let owner = document.querySelector('sym-context[ctx="REMOTE"]');
    return {
      name: owner.$.name,
      submitted: owner.$.submitted,
      pending: owner.contextData.pending.size,
    };
  })).toEqual({
    name: 'Pending local edit',
    submitted: 'Pending local edit',
    pending: 0,
  });
});
