import { test, expect } from '@playwright/test';

test.beforeEach(async ({
  page,
}) => {
  await page.route('**/html-app-todo.html', async (route) => {
    let response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace('[append]APP/tasks', '[prepend]APP/tasks'),
    });
  });
  await page.goto('/test/browser/fixtures/html-app-todo.html');
  await expect(page.locator('sym-collection')).toHaveJSProperty('connectedOnce', true);
  await page.locator('sym-collection').evaluate((element) => element.removeAttribute('sort'));
});

test('prepend validates, flushes and resets drafts while retaining existing item identity and focus', async ({
  page,
}) => {
  let form = page.getByRole('form', {
    name: 'New task',
  });
  let input = form.getByRole('textbox');
  await form.getByRole('button').click();
  await expect(page.locator('li')).toHaveCount(0);
  await input.fill('Existing');
  await input.press('Enter');
  await expect(page.locator('li')).toHaveCount(1);
  let original = await page.locator('li').elementHandle();
  await input.fill('First');
  await page.locator('li input[name="title"]').focus();
  await form.evaluate((element) => element.requestSubmit());
  await expect(page.locator('li')).toHaveCount(2);
  expect(await page.locator('li input[name="title"]').evaluateAll((inputs) => inputs.map((input) => input.value))).toEqual([
    'First',
    'Existing',
  ]);
  expect(await original.evaluate((element) => element === document.querySelectorAll('li')[1]
    && document.activeElement === element.querySelector('input[name="title"]'))).toBe(true);
  await expect(input).toHaveValue('');
  expect(await page.evaluate(() => {
    let state = document.querySelector('sym-context[ctx="APP"]').$;
    return {
      titles: state.tasks.map((item) => item.title),
      uniqueIds: new Set(state.tasks.map((item) => item.id)).size,
      draft: state.draft,
    };
  })).toEqual({
    titles: [
      'First',
      'Existing',
    ],
    uniqueIds: 2,
    draft: {
      title: '',
      done: false,
    },
  });
});

test('a failed prepend does not publish or reset its draft', async ({
  page,
}) => {
  let form = page.getByRole('form', {
    name: 'New task',
  });
  await form.getByRole('textbox').fill('Keep this draft');
  await form.evaluate((element) => element.setAttribute('action-reset', 'APP/undeclared'));
  let failure = page.waitForEvent('pageerror');
  await form.getByRole('button').click();
  expect((await failure).message).toContain('Unknown data target');
  await expect(page.locator('li')).toHaveCount(0);
  await expect(form.getByRole('textbox')).toHaveValue('Keep this draft');
});
