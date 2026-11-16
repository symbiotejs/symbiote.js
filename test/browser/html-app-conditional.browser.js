import { test, expect } from '@playwright/test';

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app-composition.html');
  await expect(page.getByRole('button', {
    name: 'Toggle content',
  })).toBeVisible();
  await expect(page.locator('sym-conditional[behavior="dom-remove"]')).toHaveJSProperty('connectedOnce', true);
});

async function toggle(page) {
  await page.getByRole('button', {
    name: 'Toggle content',
  }).click();
}

test('show/hide keep mounted drafts and block actions inside inactive content', async ({
  page,
}) => {
  await expect(page.getByText('Inverse visibility', {
    exact: true,
  })).toBeVisible();
  await page.evaluate(() => document.querySelector('sym-conditional:not([behavior]) button').click());
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="STATE"]').$.text)).toBe('');
  await toggle(page);
  await page.getByRole('textbox', {
    name: 'Kept draft',
  }).fill('Unpublished draft');
  await toggle(page);
  await expect(page.getByRole('textbox', {
    name: 'Kept draft',
  })).toBeHidden();
  await toggle(page);
  await expect(page.getByRole('textbox', {
    name: 'Kept draft',
  })).toHaveValue('Unpublished draft');
  await expect(page.getByText('Inverse visibility', {
    exact: true,
  })).toBeHidden();
});

test('DOM modes mount by matched state and dispose named providers and pending work immediately', async ({
  page,
}) => {
  await expect(page.locator('sym-context[ctx="DETAIL"]')).toHaveCount(0);
  expect(await page.evaluate(async () => {
    let {
      PubSub,
    } = await import('/core/index.js');
    return PubSub.getCtx('DETAIL', false);
  })).toBeNull();
  await expect(page.getByText('Inverse DOM', {
    exact: true,
  })).toBeVisible();
  await toggle(page);
  await expect(page.getByText('Inverse DOM', {
    exact: true,
  })).toHaveCount(0);
  await page.getByRole('textbox', {
    name: 'Mounted draft',
  }).fill('Pending');
  await toggle(page);
  expect(await page.evaluate(async () => {
    let {
      PubSub,
    } = await import('/core/index.js');
    return PubSub.getCtx('DETAIL', false);
  })).toBeNull();
  for (let index = 0; index < 5; index++) {
    await toggle(page);
    await expect(page.getByRole('textbox', {
      name: 'Mounted draft',
    })).toHaveValue('Fresh');
    await toggle(page);
  }
  await page.waitForTimeout(1100);
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="STATE"]').$.result)).toBe('');
});

test('retargeting releases old subscriptions and supports strict boolean or string matching', async ({
  page,
}) => {
  let result = await page.evaluate(() => {
    let state = document.querySelector('sym-context[ctx="STATE"]');
    let conditional = state.querySelector('sym-conditional[behavior="dom-add"]');
    let before = state.localCtx.callbackMap.open.size;
    conditional.setAttribute('when', 'STATE/other');
    let released = state.localCtx.callbackMap.open.size === before - 1;
    conditional.setAttribute('is', 'true');
    let booleanVisible = !conditional.hidden;
    conditional.setAttribute('is-type', 'string');
    let stringHidden = conditional.hidden;
    return {
      released,
      booleanVisible,
      stringHidden,
    };
  });
  expect(result).toEqual({
    released: true,
    booleanVisible: true,
    stringHidden: true,
  });
});

test('conditionals share their authored local state with the content without leaking managed handlers', async ({
  page,
}) => {
  await toggle(page);
  let baseline = await page.evaluate(() => {
    let state = document.querySelector('sym-context[ctx="STATE"]');
    return state.localCtx.callbackMap.open.size;
  });
  for (let index = 0; index < 6; index++) {
    await toggle(page);
  }
  expect(await page.evaluate(() => document.querySelector('sym-context[ctx="STATE"]').localCtx.callbackMap.open.size)).toBe(baseline);
  await page.evaluate(() => {
    window.savedConditional = document.querySelector('sym-conditional:not([behavior])');
    window.savedConditional.remove();
    window.savedConditional.destroy();
    document.querySelector('sym-context[ctx="STATE"]').append(window.savedConditional);
  });
  await expect(page.getByRole('textbox', {
    name: 'Kept draft',
  })).toBeVisible();
  expect(await page.evaluate(() => {
    let owner = window.savedConditional;
    let content = owner.firstElementChild;
    return {
      sameContext: content.localCtx === owner.localCtx,
      handlerCount: Object.keys(owner.localCtx.store).filter((key) => key.startsWith('__htmlAppAction')).length,
    };
  })).toEqual({
    sameContext: true,
    handlerCount: 1,
  });
});

test('native immediate cleanup is idempotent and preserves the normal connected owner', async ({
  page,
}) => {
  expect(await page.evaluate(async () => {
    let {
      BaseClass,
    } = await import('/html-app/index.js');
    let calls = 0;
    class CleanupProbe extends BaseClass {
      destroyCallback() {
        calls++;
        super.destroyCallback();
      }
    }
    CleanupProbe.reg('cleanup-probe');
    let owner = new CleanupProbe();
    document.body.append(owner);
    await new Promise(queueMicrotask);
    owner.destroy();
    let connected = calls;
    owner.remove();
    owner.destroy();
    owner.destroy();
    await new Promise((done) => setTimeout(done, 150));
    return {
      connected,
      removed: calls,
      subscriptions: owner.allSubs.size,
    };
  })).toEqual({
    connected: 0,
    removed: 1,
    subscriptions: 0,
  });
});

test('conditional content keeps native template selection and manual inner parsing controls', async ({
  page,
}) => {
  await page.evaluate(() => {
    let template = document.createElement('template');
    template.id = 'conditional-template';
    template.innerHTML = '<script type="application/json">{"note":"Template"}</script><output>{{note}}</output>';
    document.body.append(template);
    let owner = document.createElement('sym-conditional');
    owner.setAttribute('when', 'STATE/other');
    owner.setAttribute('use-template', '#conditional-template');
    document.querySelector('sym-context[ctx="STATE"]').append(owner);
    let raw = document.createElement('sym-conditional');
    raw.setAttribute('when', 'STATE/other');
    raw.setAttribute('process-inner-html', 'false');
    raw.innerHTML = '<output>{{unparsed}}</output><sym-component><script type="application/json">{"label":"Nested"}</script><strong>{{label}}</strong></sym-component>';
    document.querySelector('sym-context[ctx="STATE"]').append(raw);
  });
  await expect(page.locator('sym-conditional[use-template] output')).toHaveText('Template');
  await expect(page.locator('sym-conditional[process-inner-html="false"] output')).toHaveText('{{unparsed}}');
  await expect(page.locator('sym-conditional[process-inner-html="false"] strong')).toHaveText('Nested');
});

test('DOM disposal removes only the content owner tools from the public WebMCP catalog', async ({
  page,
}) => {
  expect(await page.evaluate(async () => {
    let {
      Symbiote,
    } = await import('/core/Symbiote.js');
    let { WEBMCP_DICT: MCP } = await import('/core/webmcp-dictionary.js');
    let {
      getActiveWebMCPTools,
      executeWebMCPTool,
    } = await import('/core/webmcp.js');
    Symbiote.mcpToolMode = true;
    let state = document.querySelector('sym-context[ctx="STATE"]');
    let conditional = document.createElement('sym-conditional');
    conditional.setAttribute('when', 'STATE/other');
    conditional.setAttribute('behavior', 'dom-add');
    conditional.innerHTML = '<button type="button" value="called" bind="onclick: [set]STATE/text">Conditional tool</button>';
    state.append(conditional);
    await new Promise((done) => setTimeout(done, 25));
    let owner = conditional.firstElementChild;
    let entry = owner[MCP.EVENTS_KEY].find((binding) => binding.el.textContent === 'Conditional tool');
    let ownerId = owner[MCP.OWNER_ID_KEY];
    let tool = getActiveWebMCPTools().find((tool) => tool.ownerId === ownerId && tool.key === 'auto:' + entry.key);
    if (!tool) {
      throw new Error('Conditional content action was not discovered.');
    }
    await executeWebMCPTool(tool.name, {});
    state.$.other = false;
    return {
      invoked: state.$.text === 'called',
      removed: getActiveWebMCPTools().every((tool) => tool.ownerId !== ownerId),
    };
  })).toEqual({
    invoked: true,
    removed: true,
  });
});
