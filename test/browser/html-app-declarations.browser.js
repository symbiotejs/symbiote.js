import { test, expect } from '@playwright/test';

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app-composition.html');
  await expect(page.locator('declared-feature').first().locator('p')).toHaveText('Default');
});

test('declarations upgrade earlier instances without rendering or processing their own actions', async ({
  page,
}) => {
  await expect(page.locator('declared-feature p')).toHaveText([
    'Default',
    'Default',
    'Alternate',
    'Instance',
  ]);
  await expect(page.locator('direct-feature h2')).toHaveText('Direct');
  expect(await page.evaluate(() => {
    let declaration = document.querySelector('sym-component[reg="declared-feature"]');
    let instances = document.querySelectorAll('declared-feature');
    return {
      ran: document.querySelector('sym-context[ctx="STATE"]').$.used,
      handlers: declaration.actionBindings.bindings.length,
      initialized: !!declaration.connectedOnce,
      independent: instances[0].$.notes !== instances[1].$.notes,
    };
  })).toEqual({
    ran: false,
    handlers: 0,
    initialized: false,
    independent: true,
  });
  await page.locator('declared-feature').first().getByRole('button').click();
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="STATE"]').$.used)).toBe(true);
  await page.evaluate(() => {
    let first = document.querySelector('declared-feature');
    first.$.title = 'Edited';
    first.$.notes.push('Local');
  });
  await expect(page.locator('declared-feature').nth(1).locator('p')).toHaveText('Default');
  expect(await page.evaluate(() => document.querySelectorAll('declared-feature')[1].$.notes)).toEqual([]);
});

test('identical declarations are idempotent and conflicting definitions cannot replace a tag', async ({
  page,
}) => {
  expect(await page.evaluate(() => {
    let original = customElements.get('declared-feature');
    let declaration = document.querySelector('sym-component[reg="declared-feature"]');
    document.body.append(declaration.cloneNode(true));
    return customElements.get('declared-feature') === original;
  })).toBe(true);
  let failure = page.waitForEvent('pageerror');
  await page.evaluate(() => {
    let declaration = document.createElement('sym-component');
    declaration.setAttribute('reg', 'declared-feature');
    declaration.innerHTML = '<template><p>Conflict</p></template>';
    document.body.append(declaration);
  });
  expect((await failure).message).toContain('already registered');
  await expect(page.locator('declared-feature').first().locator('p')).toHaveText('Default');
});

test('invalid names and missing template references fail explicitly', async ({
  page,
}) => {
  for (let name of [
    'div',
    'Upper-Case',
    'font-face',
  ]) {
    let failure = page.waitForEvent('pageerror');
    await page.evaluate((name) => {
      let declaration = document.createElement('sym-component');
      declaration.setAttribute('reg', name);
      declaration.innerHTML = '<template><p>Invalid</p></template>';
      document.body.append(declaration);
    }, name);
    await failure;
  }
  let failure = page.waitForEvent('pageerror');
  await page.evaluate(() => {
    let declaration = document.createElement('sym-component');
    declaration.setAttribute('reg', 'missing-template-feature');
    declaration.setAttribute('use-template', '#missing-template');
    document.body.append(declaration);
  });
  expect((await failure).message).toContain('template');
  expect(await page.evaluate(() => customElements.get('missing-template-feature'))).toBeUndefined();
});

test('native root lookup and instance overrides take precedence over declaration defaults', async ({
  page,
}) => {
  await page.evaluate(() => {
    let host = document.createElement('section');
    let root = host.attachShadow({
      mode: 'open',
    });
    root.innerHTML = '<template id="feature-template"><script type="application/json">{"title":"Shadow"}</script><p>{{title}}</p></template>'
      + '<sym-component reg="shadow-feature" use-template="#feature-template"><template><p>Unused</p></template></sym-component>'
      + '<shadow-feature></shadow-feature>';
    document.body.append(host);
    let outside = document.createElement('shadow-feature');
    outside.setAttribute('use-template', '#alternate-template');
    document.body.append(outside);
  });
  await expect(page.locator('section shadow-feature p')).toHaveText('Shadow');
  await expect(page.locator('body > shadow-feature p')).toHaveText('Alternate');
});

for (let mode of [
  'extracted',
  'direct',
  'referenced',
]) {
  test('Todo actions work with ' + mode + ' item templates', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(async (mode) => {
      await import('/html-app/index.js');
      let source = await (await fetch('/html-app/todo-ref.html')).text();
      let parsed = new DOMParser().parseFromString(source, 'text/html');
      let list = parsed.querySelector('ul[itemize]');
      let template = list.querySelector('template');
      if (mode === 'extracted' || mode === 'referenced') {
        template.id = 'todo-item-template';
        parsed.body.append(template);
      }
      if (mode === 'extracted') {
        list.setAttribute('use-template', '#todo-item-template');
      } else {
        let declaration = parsed.createElement('sym-component');
        declaration.setAttribute('reg', 'todo-task');
        if (mode === 'direct') {
          declaration.append(template);
        } else {
          declaration.setAttribute('use-template', '#todo-item-template');
        }
        list.setAttribute('item-tag', 'todo-task');
        // Deliberately place the declaration after its first use.
        parsed.body.append(declaration);
      }
      document.body.replaceChildren(...parsed.body.childNodes);
    }, mode);
    let form = page.getByRole('form', {
      name: 'New task',
    });
    await form.getByRole('textbox').fill('Alpha');
    await form.getByRole('textbox').press('Enter');
    await expect(page.locator('li')).toHaveCount(1);
    await page.locator('li').getByRole('textbox').fill('Edited');
    await page.locator('li').getByRole('checkbox').check();
    await expect(page.getByRole('status')).toHaveText('1 shown / 1 total');
    expect(await page.evaluate(() => document.querySelector('sym-context[ctx="APP"]').$.tasks.map((item) => ({
      title: item.title,
      done: item.done,
    })))).toEqual([
      {
        title: 'Edited',
        done: true,
      },
    ]);
    await page.locator('li').getByRole('button').click();
    await expect(page.getByText('No matching tasks.', {
      exact: true,
    })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('0 shown / 0 total');
  });
}
