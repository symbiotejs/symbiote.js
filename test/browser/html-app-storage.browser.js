import { test, expect } from '@playwright/test';

let markup = '<sym-context ctx="APP" storage-key="draft" storage-keys="name">'
  + '<script type="application/json">{"name":"Default","other":"Untouched"}</script>'
  + '<form bind="onsubmit: [persist]APP"><label>Name<input bind="value: name; oninput: [pub-to-1000]name"></label>'
  + '<button type="submit">Save locally</button></form>'
  + '<button type="button" bind="onclick: [restore]APP">Use saved data</button>'
  + '<button type="button" action-overwrite bind="onclick: [persist]APP">Keep this draft</button>'
  + '<output>{{name}}</output></sym-context>';

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app-sources.html');
});

async function mount(page, html = markup) {
  await page.evaluate((html) => { document.body.innerHTML = html; }, html);
  await expect(page.locator('sym-context[ctx="APP"]')).toHaveJSProperty('connectedOnce', true);
}

async function status(page, key) {
  return page.evaluate((key) => document.querySelector('sym-context[ctx="APP"]').$['+' + key], key);
}

function envelope(data, keys = Object.keys(data)) {
  return JSON.stringify({
    version: 1,
    revision: 'stored-revision',
    keys,
    data,
  });
}

test('storage is explicit, selected and separate from backend acknowledgment; submit flushes drafts', async ({
  page,
}) => {
  await mount(page);
  await page.getByRole('textbox').fill('Captured draft');
  expect(await page.evaluate(() => localStorage.getItem('draft'))).toBeNull();
  expect(await status(page, 'storageDirty')).toBe(true);
  await page.getByRole('button', {
    name: 'Save locally',
  }).click();
  await expect.poll(() => status(page, 'storageDirty')).toBe(false);
  let stored = JSON.parse(await page.evaluate(() => localStorage.getItem('draft')));
  expect(stored.version).toBe(1);
  expect(stored.keys).toEqual([
    'name',
  ]);
  expect(stored.data).toEqual({
    name: 'Captured draft',
  });
  expect(await status(page, 'dirty')).toBe(true);
  expect(await status(page, 'savedRevision')).toBeNull();
  await page.reload();
  await mount(page);
  await expect(page.getByRole('textbox')).toHaveValue('Captured draft');
  expect(await status(page, 'storageDirty')).toBe(false);
  expect(await page.evaluate(() => document.querySelector('sym-context').$.other)).toBe('Untouched');
});

test('incoming bindings win over storage, storage wins over src, and src fills the remaining defaults', async ({
  page,
}) => {
  await page.evaluate((raw) => localStorage.setItem('draft', raw), envelope({
    name: 'Browser value',
    saved: 'Stored',
  }));
  await page.route('**/values.json', (route) => route.fulfill({
    json: {
      name: 'Server value',
      saved: 'Server saved',
      extra: 'Server extra',
    },
  }));
  await mount(page, '<sym-context ctx="OUTER"><script type="application/json">{"record":{"name":"Bound value"}}</script>'
    + '<sym-context ctx="APP" storage-key="draft" storage-keys="name,saved" src="/values.json" bind="$: OUTER/record">'
    + '<script type="application/json">{"name":"Inline","saved":"Inline saved","extra":"Inline extra"}</script>'
    + '<h1>{{name}}</h1><p>{{saved}}</p><output>{{extra}}</output></sym-context></sym-context>');
  await expect(page.locator('output')).toHaveText('Server extra');
  await expect(page.locator('h1')).toHaveText('Bound value');
  await expect(page.locator('p')).toHaveText('Stored');
  expect(await status(page, 'savedRevision')).toBeNull();
});

test('pending drafts survive storage reconfiguration, while explicit restore cancels discarded publications', async ({
  page,
}) => {
  await mount(page);
  await page.getByRole('textbox').fill('Pending draft');
  await page.evaluate((raw) => {
    localStorage.setItem('next', raw);
    document.querySelector('sym-context').setAttribute('storage-key', 'next');
  }, envelope({
    name: 'Saved replacement',
  }));
  await expect(page.getByRole('textbox')).toHaveValue('Pending draft');
  expect(await status(page, 'storageDirty')).toBe(true);
  await page.getByRole('button', {
    name: 'Use saved data',
  }).click();
  await expect(page.getByRole('textbox')).toHaveValue('Saved replacement');
  await page.waitForTimeout(1100);
  await expect(page.locator('output')).toHaveText('Saved replacement');
  expect(await status(page, 'storageDirty')).toBe(false);
});

for (let scenario of [
  {
    name: 'invalid JSON',
    raw: '{',
    code: 'INVALID_STORAGE',
  },
  {
    name: 'incompatible version',
    raw: '{"version":2,"revision":"v","keys":["name"],"data":{"name":"Changed"}}',
    code: 'INCOMPATIBLE_STORAGE',
  },
  {
    name: 'wrong selected properties',
    raw: envelope({
      other: 'Changed',
    }),
    code: 'INCOMPATIBLE_STORAGE',
  },
  {
    name: 'wrong known value type',
    raw: envelope({
      name: [],
    }),
    code: 'INVALID_DATA',
  },
  {
    name: 'unsafe JSON keys',
    raw: '{"version":1,"revision":"v","keys":["name"],"data":{"name":{"__proto__":{}}}}',
    code: 'INVALID_STORAGE',
  },
]) {
  test('invalid storage retains data and is not overwritten: ' + scenario.name, async ({
    page,
  }) => {
    await page.evaluate((raw) => localStorage.setItem('draft', raw), scenario.raw);
    await mount(page);
    await expect.poll(async () => (await status(page, 'storageError'))?.code).toBe(scenario.code);
    await expect(page.getByRole('textbox')).toHaveValue('Default');
    await page.getByRole('button', {
      name: 'Save locally',
    }).click();
    await expect.poll(async () => (await status(page, 'storageError'))?.code).toBe(scenario.code);
    expect(await page.evaluate(() => localStorage.getItem('draft'))).toBe(scenario.raw);
    await page.getByRole('button', {
      name: 'Keep this draft',
    }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('draft'))).not.toBe(scenario.raw);
    await expect.poll(() => status(page, 'storageError')).toBeNull();
    expect(JSON.parse(await page.evaluate(() => localStorage.getItem('draft'))).data.name).toBe('Default');
  });
}

test('blocked reads and quota failures report errors without losing the current draft', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.nativeGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
  });
  await mount(page);
  await expect.poll(async () => (await status(page, 'storageError'))?.code).toBe('STORAGE_UNAVAILABLE');
  await page.evaluate(() => {
    Storage.prototype.getItem = window.nativeGetItem;
    Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
  });
  await page.getByRole('textbox').fill('Retained draft');
  await page.getByRole('button', {
    name: 'Keep this draft',
  }).click();
  // This control is outside the form, so unpublished data must not be saved.
  await expect.poll(async () => (await status(page, 'storageError'))?.code).toBe('PENDING_DRAFT');
  await page.getByRole('button', {
    name: 'Save locally',
  }).click();
  // Startup did not establish a readable baseline; deliberate overwrite remains required.
  await page.getByRole('button', {
    name: 'Keep this draft',
  }).click();
  await expect.poll(async () => (await status(page, 'storageError'))?.code).toBe('STORAGE_QUOTA');
  await expect(page.getByRole('textbox')).toHaveValue('Retained draft');
  await expect(page.locator('output')).toHaveText('Retained draft');
});

test('cross-tab writes mark conflict and protect both drafts until explicit resolution', async ({
  page,
}) => {
  await mount(page);
  let second = await page.context().newPage();
  await second.goto('/test/browser/fixtures/html-app-sources.html');
  await mount(second);
  await page.getByRole('textbox').fill('First tab');
  await second.getByRole('textbox').fill('Second tab draft');
  await page.getByRole('button', {
    name: 'Save locally',
  }).click();
  await expect.poll(() => status(second, 'storageConflict')).toBe(true);
  await expect(second.getByRole('textbox')).toHaveValue('Second tab draft');
  await second.getByRole('button', {
    name: 'Save locally',
  }).click();
  await expect.poll(async () => (await status(second, 'storageError'))?.code).toBe('STORAGE_CONFLICT');
  await second.getByRole('button', {
    name: 'Keep this draft',
  }).click();
  await expect.poll(() => status(second, 'storageConflict')).toBe(false);
  await expect.poll(() => status(page, 'storageConflict')).toBe(true);
  await page.getByRole('button', {
    name: 'Use saved data',
  }).click();
  await expect(page.getByRole('textbox')).toHaveValue('Second tab draft');
  expect(await status(page, 'storageConflict')).toBe(false);
  expect(await status(page, 'storageDirty')).toBe(false);
  await second.close();
});

test('simultaneous participating saves serialize; disconnect cancels a queued write', async ({
  page,
}) => {
  await mount(page);
  let second = await page.context().newPage();
  await second.goto('/test/browser/fixtures/html-app-sources.html');
  await mount(second);
  await page.evaluate(() => { document.querySelector('sym-context').$.name = 'First draft'; });
  await second.evaluate(() => { document.querySelector('sym-context').$.name = 'Second draft'; });
  await page.evaluate(() => {
    window.lockHeld = false;
    void navigator.locks.request('symbiote:html-app:storage:draft', () => {
      window.lockHeld = true;
      return new Promise((resolve) => { window.releaseLock = resolve; });
    });
  });
  await expect.poll(() => page.evaluate(() => window.lockHeld)).toBe(true);
  await Promise.all([
    page.evaluate(() => { window.write = document.querySelector('sym-context').storage.persist(); }),
    second.evaluate(() => { window.write = document.querySelector('sym-context').storage.persist(); }),
  ]);
  await page.evaluate(() => window.releaseLock());
  let writes = await Promise.all([
    page.evaluate(() => window.write),
    second.evaluate(() => window.write),
  ]);
  expect(writes.filter((result) => result.ok)).toHaveLength(1);
  expect(writes.find((result) => !result.ok).error.code).toBe('STORAGE_CONFLICT');
  let winningName = writes[0].ok ? 'First draft' : 'Second draft';
  for (let tab of [
    page,
    second,
  ]) {
    await expect.poll(() => tab.evaluate(() => JSON.parse(localStorage.getItem('draft')).data.name)).toBe(winningName);
  }
  await expect(page.getByRole('textbox')).toHaveValue('First draft');
  await expect(second.getByRole('textbox')).toHaveValue('Second draft');

  await page.evaluate(() => {
    window.lockHeld = false;
    void navigator.locks.request('symbiote:html-app:storage:draft', () => {
      window.lockHeld = true;
      return new Promise((resolve) => { window.releaseLock = resolve; });
    });
  });
  await expect.poll(() => page.evaluate(() => window.lockHeld)).toBe(true);
  await second.evaluate(() => {
    let owner = document.querySelector('sym-context');
    window.write = owner.storage.persist(true);
    owner.remove();
    owner.destroy();
  });
  await page.evaluate(() => window.releaseLock());
  expect(await second.evaluate(() => window.write)).toEqual({
    ok: false,
    cancelled: true,
  });
  await second.close();
});

test('no configured storage means no browser access or hidden fallback; invalid configuration reports errors', async ({
  page,
}) => {
  await page.evaluate(() => {
    Storage.prototype.getItem = () => { throw new Error('Unexpected storage access'); };
  });
  await mount(page, '<sym-context ctx="APP"><script type="application/json">{"name":"Memory"}</script><h1>{{name}}</h1></sym-context>');
  expect(await status(page, 'storageError')).toBeNull();
  expect(await status(page, 'storageDirty')).toBe(false);
  await expect(page.locator('h1')).toHaveText('Memory');
  await page.evaluate(() => document.querySelector('sym-context').setAttribute('storage-key', 'incomplete'));
  await expect.poll(async () => (await status(page, 'storageError'))?.code).toBe('INVALID_CONFIG');
});

test('reconnection retains the storage baseline and local draft while detecting intervening writes', async ({
  page,
}) => {
  await mount(page);
  await page.getByRole('textbox').fill('Saved draft');
  await page.getByRole('button', {
    name: 'Save locally',
  }).click();
  await expect.poll(() => status(page, 'storageDirty')).toBe(false);
  await page.evaluate(() => {
    let owner = document.querySelector('sym-context');
    owner.remove();
    owner.destroy();
    document.body.append(owner);
  });
  await expect(page.getByRole('textbox')).toHaveValue('Saved draft');
  expect(await status(page, 'storageDirty')).toBe(false);
  expect(await status(page, 'storageConflict')).toBe(false);
  await page.getByRole('textbox').fill('Current draft');
  await page.getByRole('button', {
    name: 'Save locally',
  }).click();
  await expect.poll(() => status(page, 'storageDirty')).toBe(false);
  await page.evaluate((raw) => {
    let owner = document.querySelector('sym-context');
    owner.remove();
    owner.destroy();
    localStorage.setItem('draft', raw);
    document.body.append(owner);
  }, envelope({
    name: 'Changed while disconnected',
  }));
  await expect.poll(() => status(page, 'storageConflict')).toBe(true);
  await expect(page.getByRole('textbox')).toHaveValue('Current draft');
});

test('explicit restore cancels a queued save; missing Web Locks reports failure without a fallback write', async ({
  page,
}) => {
  await page.evaluate((raw) => localStorage.setItem('draft', raw), envelope({
    name: 'Stored data',
  }));
  await mount(page);
  await page.evaluate(() => {
    window.lockHeld = false;
    void navigator.locks.request('symbiote:html-app:storage:draft', () => {
      window.lockHeld = true;
      return new Promise((resolve) => { window.releaseLock = resolve; });
    });
  });
  await expect.poll(() => page.evaluate(() => window.lockHeld)).toBe(true);
  await page.evaluate(() => {
    let owner = document.querySelector('sym-context');
    owner.$.name = 'Unwanted queued value';
    window.write = owner.storage.persist();
    owner.storage.restore();
    window.releaseLock();
  });
  expect(await page.evaluate(() => window.write)).toEqual({
    ok: false,
    cancelled: true,
  });
  await expect(page.getByRole('textbox')).toHaveValue('Stored data');
  await page.evaluate(() => Object.defineProperty(navigator, 'locks', {
    value: undefined,
    configurable: true,
  }));
  await page.getByRole('button', {
    name: 'Save locally',
  }).click();
  await expect.poll(async () => (await status(page, 'storageError'))?.code).toBe('LOCK_UNAVAILABLE');
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('draft'))).data.name).toBe('Stored data');
});

test('a stale localStorage snapshot cannot overwrite another tab after its save succeeds', async ({
  page,
}) => {
  await mount(page);
  let second = await page.context().newPage();
  await second.goto('/test/browser/fixtures/html-app-sources.html');
  await mount(second);
  await page.getByRole('textbox').fill('Committed first draft');
  await second.evaluate(() => {
    document.querySelector('sym-context').$.name = 'Retained second draft';
    let getItem = Storage.prototype.getItem;
    // Model the stale cached read observed in WebKit after acquiring the lock.
    Storage.prototype.getItem = function (key) {
      return key === 'draft' ? null : getItem.call(this, key);
    };
  });
  await page.getByRole('button', {
    name: 'Save locally',
  }).click();
  await expect.poll(() => status(page, 'storageDirty')).toBe(false);
  let result = await second.evaluate(() => document.querySelector('sym-context').storage.persist());
  expect(result.ok).toBe(false);
  expect(result.error.code).toBe('STORAGE_CONFLICT');
  await expect(second.getByRole('textbox')).toHaveValue('Retained second draft');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('draft')).data.name)).toBe('Committed first draft');
  await second.close();
});

test('failed localStorage writes release the revision reservation so a normal retry can save', async ({
  page,
}) => {
  await mount(page);
  await page.evaluate(() => {
    let owner = document.querySelector('sym-context');
    owner.$.name = 'Retained draft';
    let setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      Storage.prototype.setItem = setItem;
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  let first = await page.evaluate(() => document.querySelector('sym-context').storage.persist());
  expect(first.error.code).toBe('STORAGE_QUOTA');
  expect(await page.evaluate(() => localStorage.getItem('draft'))).toBeNull();
  await expect(page.getByRole('textbox')).toHaveValue('Retained draft');
  let second = await page.evaluate(() => document.querySelector('sym-context').storage.persist());
  expect(second.ok).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('draft')).data.name)).toBe('Retained draft');
});

test('unavailable revision coordination fails without writing or discarding the draft', async ({
  page,
}) => {
  await mount(page);
  await page.evaluate(() => {
    document.querySelector('sym-context').$.name = 'Unsaved draft';
    Object.defineProperty(window, 'indexedDB', {
      value: undefined,
      configurable: true,
    });
  });
  let result = await page.evaluate(() => document.querySelector('sym-context').storage.persist());
  expect(result.error.code).toBe('STORAGE_UNAVAILABLE');
  expect(await page.evaluate(() => localStorage.getItem('draft'))).toBeNull();
  await expect(page.getByRole('textbox')).toHaveValue('Unsaved draft');
  expect(await status(page, 'storageDirty')).toBe(true);
});
