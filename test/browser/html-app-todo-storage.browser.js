import { test, expect } from '@playwright/test';
import { useLocalExampleModules } from '../helpers/html-app-example.js';

let record = {
  id: 'task',
  title: 'JSON task',
  note: '',
  done: false,
  pinned: false,
};

test.beforeEach(async ({
  page,
}) => {
  await useLocalExampleModules(page);
  await page.route('**/assets/tasks.json', (route) => route.fulfill({
    json: {
      tasks: [
        record,
      ],
    },
  }));
});

function button(page, name) {
  return page.getByRole('button', {
    name,
    exact: true,
  });
}

async function savedTasks(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('html-app-workspace'))?.data.tasks);
}

test('Collections loads, saves, restores and replaces tasks without leaving the view', async ({
  page,
}) => {
  await page.goto('/html-app/examples/full-app.html?collections');
  let title = page.locator('task-card input[name="title"]');
  await expect(title).toHaveValue('JSON task');
  await button(page, 'Restore saved tasks').click();
  await expect(page.getByText('No browser save yet. Use Save tasks to create one.', {
    exact: true,
  })).toBeVisible();
  await expect(title).toHaveValue('JSON task');
  await title.fill('Saved task');
  await button(page, 'Save tasks').click();
  await expect.poll(() => savedTasks(page)).toEqual([
    {
      ...record,
      title: 'Saved task',
    },
  ]);
  // Restore is independent of form validation and works with an invalid draft.
  await title.fill('');
  await button(page, 'Restore saved tasks').click();
  await expect(title).toHaveValue('Saved task');
  await button(page, 'Delete').click();
  await expect(title).toHaveCount(0);
  await button(page, 'Reload JSON').click();
  await expect(title).toHaveValue('JSON task');
  expect((await savedTasks(page))[0].title).toBe('Saved task');
  await button(page, 'Restore saved tasks').click();
  await expect(title).toHaveValue('Saved task');
  await page.route('https://example.test/tasks.json', (route) => route.fulfill({
    headers: {
      'access-control-allow-origin': '*',
    },
    json: {
      tasks: [
        {
          ...record,
          title: 'External task',
        },
      ],
    },
  }));
  let source = page.getByRole('textbox', {
    name: 'JSON source',
    exact: true,
  });
  await source.fill('https://example.test/tasks.json');
  await source.blur();
  await button(page, 'Reload JSON').click();
  await expect(title).toHaveValue('External task');
  await page.route('https://example.test/tasks.json', (route) => route.fulfill({
    status: 503,
    headers: {
      'access-control-allow-origin': '*',
    },
  }));
  await title.fill('Retained after failure');
  await button(page, 'Reload JSON').click();
  await expect.poll(() => page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$['+loadError']?.status)).toBe(503);
  await expect(title).toHaveValue('Retained after failure');
  expect((await savedTasks(page))[0].title).toBe('Saved task');
  await button(page, 'Restore saved tasks').click();
  await expect(title).toHaveValue('Saved task');
  await page.reload();
  await expect(title).toHaveValue('Saved task');
});

test('Browser storage restore publishes the saved tasks back to Collections', async ({
  page,
}) => {
  await page.goto('/html-app/examples/full-app.html?collections');
  let title = page.locator('task-card input[name="title"]');
  await expect(title).toHaveValue('JSON task');
  await title.fill('Saved task');
  await button(page, 'Save tasks').click();
  await expect.poll(async () => (await savedTasks(page))?.[0].title).toBe('Saved task');
  await title.fill('Unsaved task');
  await page.locator('aside').getByRole('link', {
    name: 'Browser storage',
    exact: true,
  }).click();
  await button(page, 'Restore browser data').click();
  await page.locator('aside').getByRole('link', {
    name: 'Collections',
    exact: true,
  }).click();
  await expect(title).toHaveValue('Saved task');
});

test('explicit JSON replacement still protects incoming bindings and newer edits', async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app-sources.html');
  await page.evaluate(() => {
    document.body.innerHTML = '<sym-context ctx="OUTER"><script type="application/json">{"record":{"bound":"Parent"}}</script>'
      + '<sym-context ctx="APP" bind="$: OUTER/record"><script type="application/json">{"name":"Default","bound":"Default"}</script>'
      + '<button action-overwrite bind="onclick: [load]APP">Replace</button>'
      + '<output>{{name}}</output></sym-context></sym-context>';
  });
  let pending;
  await page.route('**/values.json', (route) => { pending = route; });
  await expect(page.locator('sym-context[ctx="APP"]')).toHaveJSProperty('connectedOnce', true);
  await page.evaluate(() => {
    let owner = document.querySelector('sym-context[ctx="APP"]');
    owner.$.name = 'Prior edit';
    owner.setAttribute('src', '/values.json');
  });
  await expect.poll(() => Boolean(pending)).toBe(true);
  await pending.fulfill({
    json: {
      name: 'Source',
      bound: 'Source',
    },
  });
  await expect(button(page, 'Replace')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$['+loading'])).toBe(false);
  await expect(page.locator('output')).toHaveText('Prior edit');
  pending = undefined;
  await button(page, 'Replace').click();
  await expect.poll(() => Boolean(pending)).toBe(true);
  await page.evaluate(() => { document.querySelector('sym-context[ctx="APP"]').$.name = 'Newer edit'; });
  await pending.fulfill({
    json: {
      name: 'Late source',
      bound: 'Late source',
    },
  });
  await expect.poll(() => page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$['+loading'])).toBe(false);
  await expect(page.locator('output')).toHaveText('Newer edit');
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$.bound)).toBe('Parent');
});
