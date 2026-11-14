import { test, expect } from '@playwright/test';

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app.html');
  await expect(page.locator('h1')).toHaveText('Application');
});

test('inline owners, native templates and Itemize initialize without crossing scopes', async ({
  page,
}) => {
  await expect(page.locator('h2')).toHaveText('Alex');
  await expect(page.locator('p')).toHaveText('Editor');
  await expect(page.locator('strong')).toHaveText('Independent');
  await expect(page.locator('li')).toHaveText([
    'First',
    'Second',
  ]);
  expect(await page.evaluate(async () => {
    let {
      PubSub,
    } = await import('/core/index.js');
    let {
      BaseClass,
    } = await import('/html-app/index.js');
    let owner = document.querySelector('sym-context[ctx="APP"]');
    let item = document.querySelector('li').parentElement;
    return {
      sameContext: owner.localCtx === PubSub.getCtx('APP', false),
      appItem: item instanceof BaseClass,
      independentDefaults: item.$.notes !== document.querySelectorAll('li')[1].parentElement.$.notes,
    };
  })).toEqual({
    sameContext: true,
    appItem: true,
    independentDefaults: true,
  });
});

test('native object merges preserve omitted fields and proxy identity without echoing input', async ({
  page,
}) => {
  let result = await page.evaluate(() => {
    let root = document.querySelector('sym-context[ctx="APP"]');
    let child = root.querySelector('sym-context');
    let proxy = child.$;
    let count = 0;
    root.localCtx.sub('contact', () => count++, false);
    root.$.contact = {
      name: 'Morgan',
      extra: 7,
    };
    return {
      count,
      sameProxy: proxy === child.$,
      name: child.$.name,
      role: child.$.role,
      extra: child.$.extra,
    };
  });
  expect(result).toEqual({
    count: 1,
    sameProxy: true,
    name: 'Morgan',
    role: 'Editor',
    extra: 7,
  });
  await expect(page.locator('h2')).toHaveText('Morgan');
  let publication = await page.evaluate(() => {
    let root = document.querySelector('sym-context[ctx="APP"]');
    let child = root.querySelector('sym-context');
    let before = root.$.contact;
    let count = 0;
    root.localCtx.sub('contact', () => count++, false);
    child.$.name = 'Taylor';
    return {
      count,
      freshObject: root.$.contact !== before,
      data: root.$.contact,
    };
  });
  expect(publication).toEqual({
    count: 1,
    freshObject: true,
    data: {
      name: 'Taylor',
      role: 'Editor',
      extra: 7,
    },
  });
});

test('providers survive moves and reinitialize after native teardown without leaking named stores', async ({
  page,
}) => {
  await page.evaluate(() => {
    let owner = document.querySelector('sym-context[ctx="APP"]');
    owner.$.title = 'Retained';
    owner.remove();
    document.body.append(owner);
  });
  await expect(page.locator('h1')).toHaveText('Retained');
  await page.evaluate(() => {
    window.removedOwner = document.querySelector('sym-context[ctx="APP"]');
    window.removedOwner.remove();
  });
  await expect.poll(() => page.evaluate(async () => {
    let {
      PubSub,
    } = await import('/core/index.js');
    return PubSub.getCtx('APP', false) === null && window.removedOwner.allSubs.size === 0;
  })).toBe(true);
  await page.evaluate(() => document.body.append(window.removedOwner));
  await expect(page.locator('h1')).toHaveText('Retained');
  await page.evaluate(async () => {
    let {
      PubSub,
    } = await import('/core/index.js');
    PubSub.getCtx('APP', false).pub('title', 'Reconnected');
  });
  await expect(page.locator('h1')).toHaveText('Reconnected');
  await expect(page.locator('h2')).toHaveText('Alex');
});

test('duplicate ownership fails without changing an existing context', async ({
  page,
}) => {
  let failure = page.waitForEvent('pageerror');
  await page.evaluate(() => {
    let duplicate = document.createElement('sym-context');
    duplicate.setAttribute('ctx', 'APP');
    duplicate.innerHTML = '<script type="application/json">{"title":"Overwrite"}</script>';
    document.body.append(duplicate);
  });
  expect((await failure).message).toContain('already has an owner');
  await expect(page.locator('h1')).toHaveText('Application');
});

test('inner parsing can be disabled while nested foundation elements retain their own scope', async ({
  page,
}) => {
  await page.evaluate(() => {
    let owner = document.createElement('sym-component');
    owner.setAttribute('process-inner-html', 'false');
    owner.innerHTML = '<script type="application/json">{"label":"Parent"}</script><output>{{label}}</output>'
      + '<sym-component><script type="application/json">{"label":"Child"}</script><small>{{label}}</small></sym-component>';
    document.body.append(owner);
  });
  await expect(page.locator('output')).toHaveText('{{label}}');
  await expect(page.locator('small')).toHaveText('Child');
});

test('core entry stays independent and the optional entry exports only implemented elements', async ({
  page,
}) => {
  await page.goto('/');
  let result = await page.evaluate(async () => {
    await import('/core/index.js');
    let before = customElements.get('sym-component');
    let exports = await import('/html-app/index.js');
    return {
      coreRegistersApp: !!before,
      component: customElements.get('sym-component') === exports.SymComponent,
      context: customElements.get('sym-context') === exports.SymContext,
      webmcp: Reflect.has(globalThis, '__SYMBIOTE_WEBMCP_SYNC_OWNER'),
    };
  });
  expect(result).toEqual({
    coreRegistersApp: false,
    component: true,
    context: true,
    webmcp: false,
  });
});
