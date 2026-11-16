import { test, expect } from '@playwright/test';
test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app-actions.html');
  await expect(page.locator('h1')).toHaveText('Actions');
});
/**
 * @param {import('@playwright/test').Page} page
 * @param {string} key
 */
async function data(page, key) {
  return page.locator('sym-context[ctx="APP"]').evaluate((element, name) => element.$[name], key);
}
test('native controls publish typed data and use the bound control rather than a clicked child', async ({
  page,
}) => {
  await page.getByRole('button', {
    name: 'Toggle flag',
    exact: true,
  }).locator('span').click();
  expect(await data(page, 'flag')).toBe(true);
  await page.getByRole('button', {
    name: 'Set false',
    exact: true,
  }).click();
  expect(await data(page, 'flag')).toBe(false);
  await page.getByRole('button', {
    name: 'Set true',
    exact: true,
  }).click();
  expect(await data(page, 'flag')).toBe(true);
  await page.getByLabel('Text', {
    exact: true,
  }).fill('0012');
  expect(await data(page, 'text')).toBe('0012');
  await page.getByLabel('Number', {
    exact: true,
  }).fill('12.5');
  expect(await data(page, 'number')).toBe(12.5);
  await page.getByLabel('Number', {
    exact: true,
  }).fill('');
  expect(await data(page, 'number')).toBe(null);
  await page.getByLabel('Flag', {
    exact: true,
  }).uncheck();
  expect(await data(page, 'flag')).toBe(false);
  await page.getByLabel('B', {
    exact: true,
  }).check();
  expect(await data(page, 'choice')).toBe('b');
  await page.getByLabel('A', {
    exact: true,
  }).dispatchEvent('change');
  expect(await data(page, 'choice')).toBe('b');
  await page.locator('select[name="multi"]').selectOption([
    'a',
    'c',
  ]);
  expect(await data(page, 'multi')).toEqual([
    'a',
    'c',
  ]);
  await page.getByRole('button', {
    name: 'Copy typed data',
    exact: true,
  }).click();
  expect(await data(page, 'copied')).toEqual({
    name: 'typed',
  });
});
test('template boundaries preserve nested action owners', async ({
  page,
}) => {
  await page.getByRole('button', {
    name: 'Inner toggle',
    exact: true,
  }).click();
  await expect(page.locator('output')).toHaveText('true');
  expect(await data(page, 'flag')).toBe(false);
});
test('debounced publication snapshots values, flushes on submit and honors submitter and constraints', async ({
  page,
}) => {
  await page.clock.install();
  await page.getByLabel('Delayed', {
    exact: true,
  }).fill('first');
  await page.getByLabel('Delayed', {
    exact: true,
  }).fill('latest');
  expect(await data(page, 'delayed')).toBe('');
  await page.clock.fastForward(10001);
  expect(await data(page, 'delayed')).toBe('latest');
  await page.getByRole('button', {
    name: 'Submit note',
    exact: true,
  }).click();
  expect(await data(page, 'formValue')).toBe('');
  await page.getByLabel('Note', {
    exact: true,
  }).fill('Final note');
  await page.getByRole('button', {
    name: 'Submit note',
    exact: true,
  }).click();
  expect(await data(page, 'formValue')).toBe('Final note');
  await page.getByRole('button', {
    name: 'Publish',
    exact: true,
  }).click();
  expect(await data(page, 'formChoice')).toBe('publish');
  await page.getByRole('button', {
    name: 'Save draft',
    exact: true,
  }).click();
  expect(await data(page, 'formChoice')).toBe('draft');
});
test('composition is held until completion and stale, detached and reused item publications are canceled', async ({
  page,
}) => {
  await page.clock.install();
  let delayed = page.getByLabel('Delayed', {
    exact: true,
  });
  await delayed.focus();
  await delayed.dispatchEvent('compositionstart');
  // Firefox's fill() commits a composition; model an in-progress IME input instead.
  await delayed.evaluate((input) => {
    input.value = '変換';
    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertCompositionText',
      data: '変換',
      isComposing: true,
    }));
  });
  await page.clock.fastForward(20000);
  expect(await data(page, 'delayed')).toBe('');
  await delayed.dispatchEvent('compositionend');
  await page.clock.fastForward(10001);
  expect(await data(page, 'delayed')).toBe('変換');
  await delayed.fill('stale');
  await page.locator('sym-context[ctx="APP"]').evaluate((owner) => { owner.$.delayed = 'Incoming'; });
  await page.clock.fastForward(10001);
  expect(await data(page, 'delayed')).toBe('Incoming');
  await page.getByLabel('Row note', {
    exact: true,
  }).fill('Old row edit');
  await page.locator('sym-context[ctx="APP"]').evaluate((owner) => {
    owner.$.rows = [
      {
        id: 'b',
        label: 'Replacement',
      },
    ];
  });
  await page.clock.fastForward(10001);
  expect(await data(page, 'delayed')).toBe('Incoming');
  await delayed.fill('Detached edit');
  await delayed.evaluate((element) => element.remove());
  await page.clock.fastForward(10001);
  expect(await data(page, 'delayed')).toBe('Incoming');
});
test('pub-map coalesces values and removes old subscriptions on remap and removal', async ({
  page,
}) => {
  await expect.poll(() => data(page, 'mappedCount')).toBe(1);
  expect(await data(page, 'mappedName')).toBe('Initial');
  let mapped = page.locator('sym-component[pub-map]');
  await mapped.evaluate((owner) => {
    owner.$ = {
      name: 'Changed',
      count: 2,
    };
    owner.$.count = 3;
  });
  await expect.poll(() => data(page, 'mappedCount')).toBe(3);
  expect(await data(page, 'mappedName')).toBe('Changed');
  await mapped.evaluate((owner) => {
    owner.setAttribute('pub-map', 'APP/mappedName: name');
    owner.$.count = 4;
  });
  expect(await data(page, 'mappedCount')).toBe(3);
  await mapped.evaluate((owner) => {
    owner.remove();
    owner.$.name = 'Detached';
  });
  expect(await data(page, 'mappedName')).toBe('Changed');
});
test('disabled, read-only and invalid action targets cannot mutate state', async ({
  page,
}) => {
  let result = await page.evaluate(() => {
    let disabled = [
      ...document.querySelectorAll('button'),
    ].find((element) => element.textContent === 'Disabled toggle');
    disabled.onclick({});
    let readonly = document.querySelector('input[readonly]');
    readonly.value = 'Attempted write';
    readonly.oninput({});
    let invalid = [
      ...document.querySelectorAll('button'),
    ].find((element) => element.textContent === 'Invalid toggle');
    try {
      invalid.onclick({});
      return false;
    }
    catch {
      return true;
    }
  });
  expect(result).toBe(true);
  expect(await data(page, 'flag')).toBe(false);
  expect(await data(page, 'text')).toBe('');
});
test('named handlers and optional WebMCP reuse the native binding and discovery path', async ({
  page,
}) => {
  await page.goto('/');
  let result = await page.evaluate(async () => {
    let {
      Symbiote,
    } = await import('/core/index.js');
    let {
      getActiveWebMCPTools,
      executeWebMCPTool,
      ToolDescriptor,
    } = await import('/core/webmcp.js');
    let {
      WEBMCP_DICT: MCP,
    } = await import('/core/webmcp-dictionary.js');
    Symbiote.mcpToolMode = true;
    let {
      SymComponent,
    } = await import('/html-app/index.js');
    class MixedActions extends SymComponent {
      init$ = {
        flag: false,
        calls: 0,
        described: new ToolDescriptor({
          execute: () => { this.$.calls++; },
        }),
      };
      increment() { this.$.calls++; }
    }
    MixedActions.template = '<button type="button" bind="onclick: described">Descriptor</button><button type="button" bind="onclick: increment">Named</button>'
      + '<button type="button" bind="onclick: [toggle]flag">Declarative</button>';
    MixedActions.reg('mixed-actions');
    let owner = document.createElement('mixed-actions');
    document.body.append(owner);
    await new Promise((resolve) => setTimeout(resolve, 25));
    for (let button of [
      ...owner.querySelectorAll('button'),
    ].slice(0, 2)) {
      button.click();
    }
    let entry = owner[MCP.EVENTS_KEY].find((binding) => binding.el.textContent === 'Declarative');
    let tool = getActiveWebMCPTools().find((tool) => tool.ownerId === owner[MCP.OWNER_ID_KEY] && tool.key === 'auto:' + entry.key);
    if (!tool) {
      throw new Error('Declarative action was not discovered.');
    }
    await executeWebMCPTool(tool.name, {});
    let state = {
      calls: owner.$.calls,
      flag: owner.$.flag,
    };
    let ownerId = owner[MCP.OWNER_ID_KEY];
    owner.remove();
    await new Promise((resolve) => setTimeout(resolve, 125));
    return {
      ...state,
      cleaned: getActiveWebMCPTools().every((item) => item.ownerId !== ownerId),
    };
  });
  expect(result).toEqual({
    calls: 2,
    flag: true,
    cleaned: true,
  });
});
test('shared and pop-up actions use native context resolution', async ({
  page,
}) => {
  await page.evaluate(() => {
    let owner = document.createElement('sym-context');
    owner.setAttribute('ctx', 'SHARED');
    owner.innerHTML = '<script type="application/json">{"flag":false}</script>'
      + '<button type="button" bind="onclick: [toggle]*flag">Shared toggle</button>'
      + '<sym-component><button type="button" bind="onclick: [toggle]^flag">Parent toggle</button></sym-component>';
    document.body.append(owner);
  });
  await page.getByRole('button', {
    name: 'Shared toggle',
    exact: true,
  }).click();
  expect(await page.locator('sym-context[ctx="SHARED"]').evaluate((owner) => owner.$.flag)).toBe(true);
  await page.getByRole('button', {
    name: 'Parent toggle',
    exact: true,
  }).click();
  expect(await page.locator('sym-context[ctx="SHARED"]').evaluate((owner) => owner.$.flag)).toBe(false);
});
test('rebind and reconnect cancel pending work without accumulating handlers', async ({
  page,
}) => {
  await page.clock.install();
  let delayed = page.getByLabel('Delayed', {
    exact: true,
  });
  await delayed.fill('Old target');
  await delayed.evaluate((element) => {
    element.setAttribute('bind', 'oninput: [pub-to-10000]APP/text');
    element.closest('sym-context').render();
  });
  await delayed.fill('New target');
  await page.clock.fastForward(10001);
  expect(await data(page, 'delayed')).toBe('');
  expect(await data(page, 'text')).toBe('New target');
  await page.locator('sym-context[ctx="APP"]').evaluate((owner) => {
    owner.remove();
    document.body.append(owner);
  });
  await page.getByRole('button', {
    name: 'Toggle flag',
    exact: true,
  }).click();
  expect(await data(page, 'flag')).toBe(true);
  await page.locator('sym-context[ctx="APP"]').evaluate((owner) => {
    window.reconnectActions = owner;
    owner.remove();
  });
  await page.clock.fastForward(200);
  await page.evaluate(() => document.body.append(window.reconnectActions));
  await page.getByRole('button', {
    name: 'Toggle flag',
    exact: true,
  }).click();
  expect(await data(page, 'flag')).toBe(false);
});
