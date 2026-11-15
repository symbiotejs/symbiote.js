import { test, expect } from '@playwright/test';

let data = {
  routes: {
    tasks: {
      title: 'Tasks',
      src: '/panels/tasks.html',
      default: true,
    },
    settings: {
      title: 'Settings',
      src: '/panels/settings.html',
    },
  },
};

async function mount(page) {
  await page.goto('/test/browser/fixtures/html-app-sources.html');
  await page.evaluate(() => {
    history.replaceState(null, '', '?settings');
    document.body.innerHTML = '<sym-router ctx="ROUTER" src="/routes.json">'
      + '<h1>{{title}}</h1><p bind="textContent: +loadErrorMessage"></p>'
      + '<button type="button" bind="onclick: [load]ROUTER">Retry</button>'
      + '<sym-import bind="@src: ROUTER/+src"></sym-import></sym-router>';
  });
}

test('JSON routes wait for data and preserve deep links through the existing context loader', async ({
  page,
}) => {
  let release;
  let ready = new Promise((resolve) => { release = resolve; });
  await page.route('**/routes.json', async (route) => {
    await ready;
    await route.fulfill({
      json: data,
    });
  });
  await page.route('**/panels/settings.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<p>External settings</p>',
  }));
  await mount(page);
  await expect.poll(() => page.evaluate(() => document.querySelector('sym-router').$['+loading'])).toBe(true);
  await expect(page).toHaveURL(/\?settings$/);
  expect(await page.evaluate(() => document.querySelector('sym-router').$.route)).toBeNull();
  release();
  await expect(page.getByRole('heading')).toHaveText('Settings');
  await expect(page.getByText('External settings', {
    exact: true,
  })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.querySelector('sym-router').$['+loading'])).toBe(false);
});

test('invalid fetched routes report a load error before publication and support explicit retry', async ({
  page,
}) => {
  let attempts = 0;
  await page.route('**/routes.json', (route) => route.fulfill({
    json: attempts++ ? data : {
      routes: {
        tasks: {
          src: 42,
        },
      },
    },
  }));
  await page.route('**/panels/settings.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<p>Recovered settings</p>',
  }));
  await mount(page);
  await expect(page.locator('sym-router > p')).toHaveText('HTML route sources must be strings.');
  expect(await page.evaluate(() => document.querySelector('sym-router').localCtx.has('routes'))).toBe(false);
  await page.getByRole('button', {
    name: 'Retry',
  }).click();
  await expect(page.getByRole('heading')).toHaveText('Settings');
  await expect(page.getByText('Recovered settings', {
    exact: true,
  })).toBeVisible();
  expect(await page.evaluate(() => document.querySelector('sym-router').$['+loadError'])).toBeNull();
});
