import { test, expect } from '@playwright/test';

let routes = {
  tasks: {
    title: 'Tasks',
    src: '/tasks-panel.html',
    default: true,
  },
  settings: {
    title: 'Settings',
    src: '/settings-panel.html',
  },
  missing: {
    title: 'Not found',
    src: '/missing-panel.html',
    error: true,
  },
};

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app-sources.html');
});

async function mount(page, map = routes, before = '', content = '') {
  await page.evaluate((markup) => { document.body.innerHTML = markup; }, before
    + '<sym-router ctx="ROUTER"><script type="application/json">' + JSON.stringify({
      routes: map,
    }) + '</script><h1>{{title}}</h1>'
    + '<button type="button" value="tasks" bind="onclick: [navigate]ROUTER">Tasks</button>'
    + '<button type="button" value="settings" bind="onclick: [navigate]ROUTER">Settings</button>'
    + '<a href="?settings" bind="onclick: [navigate]ROUTER">Settings link</a>'
    + content + '</sym-router>');
  await expect(page.locator('sym-router')).toHaveJSProperty('connectedOnce', true);
}

async function route(page) {
  return page.evaluate(() => document.querySelector('sym-router').$.route);
}

test('one bound import uses declared route sources, replaces sections and ignores URL source options', async ({
  page,
}) => {
  let requested = [];
  await page.route('**/*-panel.html', (route) => {
    let name = new URL(route.request().url()).pathname.slice(1, -11);
    requested.push(name);
    return route.fulfill({
      contentType: 'text/html',
      body: '<sym-context ctx="PANEL_' + name + '"><p>Imported ' + name + '</p></sym-context>',
    });
  });
  await page.evaluate(() => history.replaceState(null, '', '?tasks&src=%2Funtrusted-panel.html'));
  await mount(page, routes, '', '<sym-import bind="@src: ROUTER/+src"></sym-import>');
  let importer = await page.locator('sym-import').elementHandle();
  await expect(page.getByRole('heading')).toHaveText('Tasks');
  await expect(page.getByText('Imported tasks', {
    exact: true,
  })).toBeVisible();
  await page.getByRole('link', {
    name: 'Settings link',
  }).click();
  await expect(page).toHaveURL(/\?settings$/);
  await expect(page.getByRole('heading')).toHaveText('Settings');
  await expect(page.getByText('Imported settings', {
    exact: true,
  })).toBeVisible();
  await expect(page.getByText('Imported tasks', {
    exact: true,
  })).toHaveCount(0);
  await expect(page).toHaveTitle('Settings');
  expect(await page.evaluate(async () => {
    let {
      PubSub,
    } = await import('/core/PubSub.js');
    return PubSub.getCtx('ROUTER', false) === document.querySelector('sym-router').localCtx
      && PubSub.getCtx('PANEL_tasks', false) === null;
  })).toBe(true);
  await page.evaluate(() => {
    let owner = document.querySelector('sym-router');
    owner.$.routes = {
      ...owner.$.routes,
      settings: {
        ...owner.$.routes.settings,
        src: '/updated-panel.html',
      },
    };
  });
  await expect(page.getByText('Imported updated', {
    exact: true,
  })).toBeVisible();
  expect(await page.evaluate(() => {
    let owner = document.querySelector('sym-router');
    try {
      owner.$.routes = {
        settings: {
          src: 42,
        },
      };
    } catch (error) {
      return error instanceof TypeError;
    }
    return false;
  })).toBe(true);
  await expect(page.locator('sym-import')).toHaveAttribute('src', '/updated-panel.html');
  await page.evaluate(() => {
    history.pushState(null, '', '?unknown&src=%2Funtrusted-panel.html');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByText('Imported missing', {
    exact: true,
  })).toBeVisible();
  expect(await importer.evaluate((element) => element === document.querySelector('sym-import'))).toBe(true);
  expect(requested).toEqual([
    'tasks',
    'settings',
    'updated',
    'missing',
  ]);
});

test('direct query URLs and browser Back/Forward use the native history state', async ({
  page,
}) => {
  await page.evaluate(() => history.replaceState(null, '', '?settings'));
  await mount(page);
  await expect(page.getByRole('heading')).toHaveText('Settings');
  await page.getByRole('button', {
    name: 'Tasks',
    exact: true,
  }).click();
  await page.goBack();
  await expect.poll(() => route(page)).toBe('settings');
  await page.goForward();
  await expect.poll(() => route(page)).toBe('tasks');
  await expect(page).toHaveTitle('Tasks');
});

test('path parameters and scalar action-data survive URL encoding without mutating application data', async ({
  page,
}) => {
  await page.evaluate(() => history.replaceState(null, '', '/tickets/42?term=initial'));
  let map = {
    tasks: {
      pattern: '/',
      title: 'Tasks',
      default: true,
    },
    settings: {
      pattern: '/settings',
      title: 'Settings',
    },
    ticket: {
      pattern: '/tickets/:id',
      title: 'Ticket',
    },
    missing: {
      pattern: '/404',
      title: 'Not found',
      error: true,
    },
  };
  await mount(page, map,
    '<sym-context ctx="APP"><script type="application/json">{"params":{"id":"a/b","term":"a & b = %"}}</script></sym-context>',
    '<button type="button" value="ticket" action-data="APP/params" bind="onclick: [navigate]ROUTER">Open ticket</button>'
    + '<sym-conditional when="ROUTER/route" is="ticket"><sym-context bind="$: ROUTER/options"><output>{{id}} / {{term}}</output></sym-context></sym-conditional>');
  await expect(page.locator('output')).toHaveText('42 / initial');
  await page.getByRole('button', {
    name: 'Open ticket',
  }).click();
  await expect(page.locator('output')).toHaveText('a/b / a & b = %');
  expect(new URL(page.url()).pathname).toBe('/tickets/a%2Fb');
  expect(await page.evaluate(async () => {
    let {
      PubSub,
    } = await import('/core/PubSub.js');
    return PubSub.getCtx('APP').read('params');
  })).toEqual({
    id: 'a/b',
    term: 'a & b = %',
  });
  await page.evaluate(() => {
    history.pushState(null, '', '/not-a-route');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/\/404$/);
  await expect(page.getByRole('heading')).toHaveText('Not found');
});

test('query option values with reserved URL characters round-trip through AppRouter', async ({
  page,
}) => {
  await mount(page, routes,
    '<sym-context ctx="APP"><script type="application/json">{"params":{"term":"a & b = % ? /"}}</script></sym-context>',
    '<button type="button" value="settings" action-data="APP/params" bind="onclick: [navigate]ROUTER">With options</button>');
  await page.getByRole('button', {
    name: 'With options',
  }).click();
  expect(await page.evaluate(() => document.querySelector('sym-router').$.options.term)).toBe('a & b = % ? /');
});

test('bound links preserve modified, target, download, external, unknown and fragment navigation', async ({
  page,
}) => {
  await mount(page, routes, '',
    '<a href="https://example.com/" bind="onclick: [navigate]ROUTER">External</a>'
    + '<a href="?settings" target="_blank" bind="onclick: [navigate]ROUTER">New tab</a>'
    + '<a href="?settings" download bind="onclick: [navigate]ROUTER">Download</a>'
    + '<a href="#bookmark" bind="onclick: [navigate]ROUTER">Bookmark</a>'
    + '<a href="/another-app.html?settings" bind="onclick: [navigate]ROUTER">Another app</a>'
    + '<a href="?unknown" bind="onclick: [navigate]ROUTER">Unknown</a>');
  let results = await page.evaluate(() => {
    let attempt = (text, init = {}) => {
      let link = [...document.querySelectorAll('a')].find((link) => link.textContent === text);
      let handled;
      link.addEventListener('click', (event) => {
        handled = event.defaultPrevented;
        event.preventDefault();
      }, {
        once: true,
      });
      link.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        ...init,
      }));
      return handled;
    };
    return [
      attempt('Settings link', {
        ctrlKey: true,
      }),
      attempt('Settings link', {
        metaKey: true,
      }),
      attempt('External'),
      attempt('New tab'),
      attempt('Download'),
      attempt('Bookmark'),
      attempt('Another app'),
      attempt('Unknown'),
      attempt('Settings link'),
    ];
  });
  expect(results.slice(0, -1).every((handled) => handled === false)).toBe(true);
  expect(results.at(-1)).toBe(true);
  expect(await route(page)).toBe('settings');
});

test('replacing routes clears the previous native mode and reconnecting does not duplicate publications', async ({
  page,
}) => {
  await mount(page);
  expect(await page.evaluate(async () => {
    let {
      AppRouter,
    } = await import('/core/AppRouter.js');
    let owner = document.querySelector('sym-router');
    let calls = 0;
    let subscription = owner.localCtx.sub('route', () => calls++, false);
    for (let index = 0; index < 4; index++) {
      owner.remove();
      document.body.append(owner);
      await new Promise(queueMicrotask);
    }
    calls = 0;
    await AppRouter.navigate('settings');
    let notifications = calls;
    subscription.remove();
    let source = owner.$['+src'];
    owner.remove();
    owner.destroy();
    document.body.append(owner);
    await new Promise(queueMicrotask);
    await new Promise(queueMicrotask);
    let restoredSource = owner.$['+src'];
    owner.$.routes = {
      home: {
        pattern: '/',
        default: true,
        title: 'Path map',
      },
    };
    let pathMode = location.pathname === '/' && owner.$.route === 'home';
    owner.$.routes = {
      next: {
        default: true,
        title: 'Query map',
      },
    };
    let queryMode = location.search === '?next' && owner.$.route === 'next';
    owner.remove();
    owner.destroy();
    return {
      notifications,
      source,
      restoredSource,
      pathMode,
      queryMode,
      emptyMap: Object.keys(AppRouter.appMap).length === 0,
    };
  })).toEqual({
    notifications: 1,
    source: '/settings-panel.html',
    restoredSource: '/settings-panel.html',
    pathMode: true,
    queryMode: true,
    emptyMap: true,
  });
});

test('a second HTML router or an independent native router cannot be overwritten', async ({
  page,
}) => {
  await mount(page);
  expect(await page.evaluate(async () => {
    let {
      SymRouter,
    } = await import('/html-app/index.js');
    let duplicate = new SymRouter();
    duplicate.setAttribute('ctx', 'OTHER');
    duplicate.$ = {
      routes: {
        other: {
          default: true,
        },
      },
    };
    try {
      duplicate.prepare();
    } catch (error) {
      return error.message.includes('another router');
    }
    return false;
  })).toBe(true);
  await page.getByRole('button', {
    name: 'Settings',
    exact: true,
  }).click();
  expect(await route(page)).toBe('settings');
  expect(await page.evaluate(async () => {
    let {
      AppRouter,
    } = await import('/core/AppRouter.js');
    let {
      SymRouter,
    } = await import('/html-app/index.js');
    let current = document.querySelector('sym-router');
    current.remove();
    current.destroy();
    AppRouter.setRoutingMap({
      independent: {
        title: 'Owned by native code',
      },
    });
    let candidate = new SymRouter();
    candidate.setAttribute('ctx', 'OTHER');
    candidate.$ = {
      routes: {
        other: {},
      },
    };
    try {
      candidate.prepare();
    } catch {
      return AppRouter.appMap.independent.title === 'Owned by native code';
    }
    return false;
  })).toBe(true);
});

test('public WebMCP navigation awaits the native asynchronous guard', async ({
  page,
}) => {
  await mount(page);
  expect(await page.evaluate(async () => {
    let {
      AppRouter,
    } = await import('/core/AppRouter.js');
    let {
      DICT,
    } = await import('/core/Symbiote.js');
    let {
      getActiveWebMCPTools,
      executeWebMCPTool,
    } = await import('/core/webmcp.js');
    let owner = document.querySelector('sym-router');
    owner.mcpToolMode = true;
    owner.syncWebMCPTools();
    let entry = owner[DICT.MCP_EVENTS_KEY].find((binding) => binding.el.value === 'settings');
    // Event metadata is collected while rendering; enable before a fresh render.
    if (!entry) {
      owner.remove();
      owner.destroy();
      document.body.append(owner);
      await new Promise(queueMicrotask);
      entry = owner[DICT.MCP_EVENTS_KEY].find((binding) => binding.el.value === 'settings');
    }
    let tool = getActiveWebMCPTools().find((tool) => tool.ownerId === owner[DICT.MCP_OWNER_ID_KEY]
      && tool.key === 'auto:' + entry.key);
    let remove = AppRouter.beforeRoute(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
    let result = await executeWebMCPTool(tool.name, {});
    remove();
    return {
      invoked: !result.isError,
      route: owner.$.route,
      title: document.title,
    };
  })).toEqual({
    invoked: true,
    route: 'settings',
    title: 'Settings',
  });
});

test('the imported routing example navigates within the app and preserves its shell', async ({
  page,
}) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
  await page.goto('/html-app/examples/full-app.html?routing');
  let shell = await page.locator('sym-router').elementHandle();
  await page.getByRole('link', {
    name: 'Details',
    exact: true,
  }).click();
  await expect(page).toHaveURL(/\/full-app\.html\?routing&source=link&tab=details$/);
  await expect(page.getByRole('heading', {
    name: 'Routing',
    exact: true,
  })).toBeVisible();
  expect(await shell.evaluate((element) => element === document.querySelector('sym-router'))).toBe(true);
  expect(await page.evaluate(() => document.querySelector('sym-router').$.options)).toMatchObject({
    source: 'link',
    tab: 'details',
  });
  await expect(page.getByText('Source: link / selected tab: details')).toBeVisible();
  await expect(page.getByText('Details view selected.', {
    exact: false,
  })).toBeVisible();
  await page.getByRole('button', {
    name: 'Example',
  }).click();
  await expect(page.getByText('Source: button / selected tab: example')).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Source: link / selected tab: details')).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Source: direct / selected tab: example')).toBeVisible();
});

test('the feature guide shares collection data and persisted preferences across imported sections', async ({
  page,
}) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
  await page.route('**/assets/tasks.json', (route) => route.fulfill({
    json: {
      tasks: [],
    },
  }));
  await page.goto('/html-app/examples/full-app.html');
  await expect(page.locator('sym-context[ctx="APP"]')).toHaveJSProperty('connectedOnce', true);
  await expect.poll(() => page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$['+loading'])).toBe(false);
  await page.getByRole('link', {
    name: 'Collections',
    exact: true,
  }).click();
  await page.getByPlaceholder('New task').fill('Routed task');
  await page.getByRole('button', {
    name: 'Add task',
  }).click();
  await expect(page.locator('task-card')).toHaveCount(1);
  await page.getByRole('combobox', {
    name: 'Task order',
  }).selectOption('desc');
  await page.getByRole('link', {
    name: 'Browser storage',
    exact: true,
  }).click();
  await expect(page.locator('h1')).toHaveText('Browser storage');
  await page.getByRole('button', {
    name: 'Save in this browser',
  }).click();
  await expect.poll(() => page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$['+storageDirty'])).toBe(false);
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Browser storage');
  await page.getByRole('link', {
    name: 'Collections',
    exact: true,
  }).click();
  await expect(page.getByRole('combobox', {
    name: 'Task order',
  })).toHaveValue('desc');
  await expect(page.locator('task-card')).toHaveCount(1);
  await expect(page.locator('task-card input[name="title"]')).toHaveValue('Routed task');
});
