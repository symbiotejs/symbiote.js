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

test('the compact Todo creates, edits, completes and removes records with HTML only', async ({
  page,
}) => {
  await page.goto('/html-app/examples/todo-ref.html');
  await page.getByPlaceholder('New task').fill('First task');
  await page.getByRole('button', {
    name: 'Add task',
  }).click();
  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.getByPlaceholder('New task')).toHaveValue('');
  await page.locator('li input:not([type="checkbox"])').fill('Edited task');
  await page.locator('li input[type="checkbox"]').check();
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$.tasks.map((item) => ({
    title: item.title,
    done: item.done,
  })))).toEqual([
    {
      title: 'Edited task',
      done: true,
    },
  ]);
  await page.getByRole('button', {
    name: 'Delete',
  }).click();
  await expect(page.locator('li')).toHaveCount(0);
  await expect(page.getByText('No tasks yet.', {
    exact: true,
  })).toBeVisible();
});

test('the full guide loads every authored feature section and keeps context cleanup and reuse working', async ({
  page,
}) => {
  let errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
  await page.route('**/assets/tasks.json', (route) => route.fulfill({
    json: {
      tasks: [],
    },
  }));
  await page.goto('/html-app/examples/full-app.html');
  let links = await page.locator('aside nav a:visible').evaluateAll((links) => links.map((link) => ({
    href: link.getAttribute('href'),
    route: new URL(link.href).search.slice(1),
    title: link.textContent.trim(),
  })));
  for (let link of links) {
    await page.locator('aside nav a[href="' + link.href + '"]').click();
    await expect(page.locator('h1')).toHaveText(link.title);
    await expect(page.locator('main sym-import').first()).toHaveAttribute('src', './assets/' + link.route + '.html');
    await expect.poll(() => page.evaluate(() => {
      let host = document.querySelector('main sym-import');
      return host?.connectedOnce && !host.$['+loading'] && host.querySelector('section') !== null;
    })).toBe(true);
    expect(await page.evaluate(() => document.querySelector('main sym-import').$['+loadError'])).toBeNull();
  }
  await page.getByRole('link', {
    name: 'Components',
    exact: true,
  }).click();
  await expect(page.locator('feature-note')).toHaveCount(2);
  await page.locator('feature-note').first().getByRole('button').click();
  await expect(page.locator('feature-note').first().locator('p')).toBeVisible();
  await expect(page.locator('feature-note').last().locator('p')).toBeHidden();
  await page.getByRole('link', {
    name: 'State & bindings',
    exact: true,
  }).click();
  await page.getByRole('textbox', {
    name: 'Name',
    exact: true,
  }).fill('Updated profile');
  expect(await page.evaluate(async () => {
    let {
      PubSub,
    } = await import('/core/PubSub.js');
    return {
      routeContextRemoved: PubSub.getCtx('ROUTE_DEMO', false) === null,
      name: PubSub.getCtx('PROFILE').read('person').name,
      published: PubSub.getCtx('PROFILE').read('namePreview'),
    };
  })).toEqual({
    routeContextRemoved: true,
    name: 'Updated profile',
    published: 'Updated profile',
  });
  expect(errors).toEqual([]);
});

test('feature routing keeps URL input separate from shared configuration', async ({
  page,
}) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
  await page.route('**/assets/tasks.json', (route) => route.fulfill({
    json: {
      tasks: [],
    },
  }));
  await page.goto('/html-app/examples/full-app.html?routing&ENDPOINTS%2Fsource=changed&APP%2Fquery=changed&%40src=changed&__htmlAppNavigate=changed');
  await expect(page.locator('main section')).toBeVisible();
  expect(await page.evaluate(async () => {
    let {
      PubSub,
    } = await import('/core/PubSub.js');
    return {
      source: PubSub.getCtx('ENDPOINTS').read('source'),
      query: PubSub.getCtx('APP').read('query'),
      unsafeParams: [
        'ENDPOINTS/source',
        'APP/query',
        '@src',
        '__htmlAppNavigate',
      ].some((key) => Object.hasOwn(document.querySelector('sym-router').$['+params'], key)),
    };
  })).toEqual({
    source: './assets/tasks.json',
    query: '',
    unsafeParams: false,
  });
});
