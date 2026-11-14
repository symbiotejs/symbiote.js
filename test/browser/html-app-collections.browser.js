import { test, expect } from '@playwright/test';

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/html-app/todo-ref.html');
  await expect(page.locator('sym-collection')).toHaveJSProperty('connectedOnce', true);
});

async function addTask(page, title) {
  let form = page.getByRole('form', {
    name: 'New task',
  });
  await form.getByRole('textbox').fill(title);
  await form.getByRole('button', {
    name: 'Add task',
  }).click();
}

test('HTML-only Todo creates records dynamically, flushes drafts and resets after valid submission', async ({
  page,
}) => {
  let errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let form = page.getByRole('form', {
    name: 'New task',
  });
  await form.getByRole('button').click();
  await expect(page.locator('li')).toHaveCount(0);
  for (let index = 0; index < 40; index++) {
    await form.getByRole('textbox').fill('Task ' + String(index).padStart(2, '0'));
    await form.getByRole('textbox').press('Enter');
  }
  await expect(page.locator('li')).toHaveCount(40);
  await expect(page.getByRole('status')).toHaveText('40 shown / 40 total');
  await expect(form.getByRole('textbox')).toHaveValue('');
  expect(await page.evaluate(() => {
    let app = document.querySelector('sym-context[ctx="APP"]');
    return {
      unique: new Set(app.$.tasks.map((task) => task.id)).size,
      draft: app.$.draft,
      executable: document.querySelectorAll('script:not([type="application/json"]):not([src])').length,
    };
  })).toEqual({
    unique: 40,
    draft: {
      title: '',
      done: false,
    },
    executable: 0,
  });
  expect(errors).toEqual([]);
});

test('row edits and bulk actions update authoritative records and filtered counts', async ({
  page,
}) => {
  for (let title of [
    'Alpha',
    'Beta',
    'Gamma',
  ]) {
    await addTask(page, title);
  }
  await page.locator('li').nth(1).getByRole('checkbox').check();
  await page.getByRole('button', {
    name: 'Active',
    exact: true,
  }).click();
  await expect(page.locator('li')).toHaveCount(2);
  await expect(page.getByRole('status')).toHaveText('2 shown / 3 total');
  await page.locator('li').first().getByRole('textbox').fill('Zeta');
  await expect(page.locator('li').last().getByRole('textbox')).toHaveValue('Zeta');
  await page.getByRole('button', {
    name: 'Complete all',
    exact: true,
  }).click();
  await expect(page.locator('li')).toHaveCount(0);
  await expect(page.getByText('No matching tasks.', {
    exact: true,
  })).toBeVisible();
  await page.getByRole('button', {
    name: 'Completed',
    exact: true,
  }).click();
  await expect(page.locator('li')).toHaveCount(3);
  await page.getByRole('button', {
    name: 'Clear completed',
    exact: true,
  }).click();
  await expect(page.getByRole('status')).toHaveText('0 shown / 0 total');
});

test('invalid drafts do not corrupt records and focus follows a stable row through sorting', async ({
  page,
}) => {
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  let first = page.locator('li').first().getByRole('textbox');
  await first.fill('');
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$.tasks[0].title)).toBe('Alpha');
  await expect(first).toHaveValue('');
  await first.fill('Zulu');
  await expect(page.locator('li').last().getByRole('textbox')).toBeFocused();
  await expect(page.locator('li').last().getByRole('textbox')).toHaveValue('Zulu');
  await page.evaluate(() => {
    document.querySelector('sym-context[ctx="APP"]').$.sort = {
      field: 'title',
      direction: 'desc',
    };
  });
  await expect(page.locator('li').first().getByRole('textbox')).toBeFocused();
});

test('first, middle and last removal plus immediate refill preserve the correct records', async ({
  page,
}) => {
  for (let title of [
    'Alpha',
    'Beta',
    'Gamma',
    'Omega',
    'Zulu',
  ]) {
    await addTask(page, title);
  }
  await page.locator('li').first().getByRole('button').click();
  await page.locator('li').nth(1).getByRole('button').click();
  await page.locator('li').last().getByRole('button').click();
  let values = () => page.locator('li input[name="title"]').evaluateAll((inputs) => inputs.map((input) => input.value));
  await expect.poll(values).toEqual([
    'Beta',
    'Omega',
  ]);
  await page.evaluate(() => {
    let app = document.querySelector('sym-context[ctx="APP"]');
    let items = app.$.tasks;
    app.$.tasks = [];
    app.$.tasks = items;
  });
  await expect.poll(values).toEqual([
    'Beta',
    'Omega',
  ]);
});

test('delayed edits never reach a replaced source record', async ({
  page,
}) => {
  await addTask(page, 'Alpha');
  await page.evaluate(() => {
    let collection = document.createElement('sym-collection');
    collection.setAttribute('data', 'APP/tasks');
    collection.innerHTML = '<div itemize="items"><template>'
      + '<label>Delayed title<input bind="value: title; oninput: [item-pub-80]title"></label>'
      + '</template></div>';
    document.querySelector('sym-context[ctx="APP"]').append(collection);
  });
  await page.getByRole('textbox', {
    name: 'Delayed title',
  }).fill('Pending');
  await page.evaluate(() => {
    document.querySelector('sym-context[ctx="APP"]').$.tasks = [
      {
        id: 'replacement',
        title: 'Replacement',
        done: false,
      },
    ];
  });
  await page.waitForTimeout(120);
  await expect(page.getByRole('textbox', {
    name: 'Delayed title',
  })).toHaveValue('Replacement');
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$.tasks[0].title)).toBe('Replacement');
});

test('two local Todo owners keep independent collections, drafts and counts', async ({
  page,
}) => {
  await addTask(page, 'Original');
  await page.evaluate(() => {
    let root = document.querySelector('sym-context[ctx="APP"]');
    let template = document.createElement('template');
    template.content.append(root.authoredContent());
    let independent = document.createElement('sym-context');
    independent.innerHTML = template.innerHTML.replaceAll('APP/', '^');
    document.body.append(independent);
  });
  let owners = page.locator('body > sym-context');
  let second = owners.nth(1);
  let form = second.getByRole('form', {
    name: 'New task',
  });
  await form.getByRole('textbox').fill('Independent');
  await form.getByRole('button').click();
  await expect(second.locator('li').getByRole('textbox')).toHaveValue('Independent');
  await expect(owners.first().locator('li').getByRole('textbox')).toHaveValue('Original');
});

test('search preserves source data and moving the controller does not duplicate subscriptions', async ({
  page,
}) => {
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await page.getByRole('searchbox').fill('alp');
  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('1 shown / 2 total');
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$.tasks.length)).toBe(2);
  await page.getByRole('searchbox').fill('');
  await expect(page.locator('li')).toHaveCount(2);
  let subscriptions = await page.evaluate(async () => {
    let app = document.querySelector('sym-context[ctx="APP"]');
    let collection = app.querySelector('sym-collection');
    let before = app.localCtx.callbackMap.tasks.size;
    collection.remove();
    app.append(collection);
    await new Promise(queueMicrotask);
    return {
      before,
      after: app.localCtx.callbackMap.tasks.size,
    };
  });
  expect(subscriptions.before).toBeGreaterThan(0);
  expect(subscriptions.after).toBe(subscriptions.before);
  await page.locator('li').first().getByRole('checkbox').check();
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$.tasks[0].done)).toBe(true);
});

test('registered foundation item components use the same stable record actions', async ({
  page,
}) => {
  await addTask(page, 'Alpha');
  await page.evaluate(async () => {
    let {
      BaseClass,
    } = await import('/html-app/index.js');
    class RegisteredTask extends BaseClass {}
    RegisteredTask.template = '<strong>{{title}}</strong>'
      + '<button type="button" bind="onclick: [item-toggle]done">Toggle registered task</button>'
      + '<button type="button" bind="onclick: [item-remove]">Remove registered task</button>';
    RegisteredTask.reg('registered-task');
    let collection = document.createElement('sym-collection');
    collection.setAttribute('data', 'APP/tasks');
    collection.innerHTML = '<div itemize="items" item-tag="registered-task"></div>';
    document.querySelector('sym-context[ctx="APP"]').append(collection);
  });
  await page.getByRole('button', {
    name: 'Toggle registered task',
  }).click();
  await expect(page.locator('li').getByRole('checkbox')).toBeChecked();
  await page.getByRole('button', {
    name: 'Remove registered task',
  }).click();
  await expect(page.locator('registered-task')).toHaveCount(0);
  await expect(page.locator('li')).toHaveCount(0);
});

test('failed append leaves collection and draft intact without executing reset', async ({
  page,
}) => {
  await addTask(page, 'Original');
  await page.evaluate(() => {
    let app = document.querySelector('sym-context[ctx="APP"]');
    app.$.draft = {
      id: app.$.tasks[0].id,
      title: 'Duplicate',
      done: false,
    };
  });
  let failure = page.waitForEvent('pageerror');
  await page.getByRole('form', {
    name: 'New task',
  }).getByRole('button').click();
  expect((await failure).message).toContain('unique');
  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.getByRole('form', {
    name: 'New task',
  }).getByRole('textbox')).toHaveValue('Duplicate');
});

test('retargeting and full disconnect dispose source subscriptions before reconnecting', async ({
  page,
}) => {
  await addTask(page, 'Original');
  let retarget = await page.evaluate(async () => {
    let app = document.querySelector('sym-context[ctx="APP"]');
    let collection = app.querySelector('sym-collection');
    let before = app.localCtx.callbackMap.tasks.size;
    app.$ = {
      otherTasks: [
        {
          id: 'other',
          title: 'Other',
          done: false,
        },
      ],
    };
    let baseline = app.localCtx.callbackMap.otherTasks.size;
    collection.setAttribute('data', 'APP/otherTasks');
    return {
      released: app.localCtx.callbackMap.tasks.size === before - 1,
      baseline,
      bound: app.localCtx.callbackMap.otherTasks.size,
    };
  });
  expect(retarget.released).toBe(true);
  expect(retarget.bound).toBe(retarget.baseline + 1);
  await expect(page.locator('li').getByRole('textbox')).toHaveValue('Other');
  await page.evaluate(() => {
    window.detachedCollection = document.querySelector('sym-collection');
    window.detachedCollection.remove();
  });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').localCtx.callbackMap.otherTasks.size)).toBe(retarget.baseline);
  await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').append(window.detachedCollection));
  await expect(page.locator('li').getByRole('textbox')).toHaveValue('Other');
  await page.locator('li').getByRole('checkbox').check();
  expect(await page.evaluate(() => {
    let app = document.querySelector('sym-context[ctx="APP"]');
    return {
      original: app.$.tasks[0].done,
      other: app.$.otherTasks[0].done,
    };
  })).toEqual({
    original: false,
    other: true,
  });
});
