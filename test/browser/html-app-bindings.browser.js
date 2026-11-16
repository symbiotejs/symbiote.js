import { test, expect } from '@playwright/test';

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app.html');
  await expect(page.locator('h1')).toHaveText('Application');
});

test('conditional fragments pass initial scalar and array fields to deferred child components', async ({
  page,
}) => {
  await page.evaluate(async () => {
    let {
      BaseClass,
    } = await import('/html-app/index.js');
    class BoundWidget extends BaseClass {
      init$ = {
        value: 'Fallback',
        options: [],
      };
    }
    BoundWidget.template = '<output>{{value}}</output><ul itemize="options"><template><li>{{name}}</li></template></ul>';
    BoundWidget.reg('bound-widget');
    let owner = document.querySelector('sym-context[ctx="APP"]');
    let branch = document.createElement('sym-conditional');
    branch.setAttribute('when', 'APP/title');
    branch.innerHTML = '<bound-widget bind="$.value: APP/title; $.options: APP/items"></bound-widget>';
    owner.append(branch);
  });
  await expect(page.locator('bound-widget output')).toHaveText('Application');
  await expect(page.locator('bound-widget li')).toHaveText([
    'First',
    'Second',
  ]);
  await page.evaluate(() => {
    document.querySelector('sym-context[ctx="APP"]').$.title = 'Updated';
  });
  await expect(page.locator('bound-widget output')).toHaveText('Updated');
});

test('a later child upgrade does not replay a superseded deferred binding', async ({
  page,
}) => {
  await page.evaluate(async () => {
    let {
      BaseClass,
    } = await import('/html-app/index.js');
    let owner = document.querySelector('sym-context[ctx="APP"]');
    let feature = document.createElement('sym-component');
    feature.innerHTML = '<late-bound-widget bind="$.value: APP/title"></late-bound-widget>';
    owner.append(feature);
    await new Promise(queueMicrotask);
    class LateBoundWidget extends BaseClass {
      init$ = {
        value: 'Fallback',
      };
    }
    LateBoundWidget.template = '<output>{{value}}</output>';
    LateBoundWidget.reg('late-bound-widget');
    // Registration constructs the child; its foundation connection is still queued.
    owner.$.title = 'Latest';
  });
  await expect(page.locator('late-bound-widget output')).toHaveText('Latest');
});

test('an explicitly non-parsing layout delegates its item bindings to the surrounding template', async ({
  page,
}) => {
  await page.evaluate(async () => {
    let {
      BaseClass,
    } = await import('/html-app/index.js');
    class ItemLayout extends BaseClass {}
    ItemLayout.reg('item-layout');
    let feature = document.createElement('sym-component');
    feature.innerHTML = '<ul itemize="APP/items"><template><item-layout process-inner-html="false"><li><span>{{name}}</span><input bind="value: name"></li></item-layout></template></ul>';
    document.body.append(feature);
  });
  await expect(page.locator('item-layout span')).toHaveText([
    'First',
    'Second',
  ]);
  await expect(page.locator('item-layout input').first()).toHaveValue('First');
  await page.evaluate(() => {
    document.querySelector('sym-context[ctx="APP"]').$.items = [
      {
        name: 'Updated',
      },
    ];
  });
  await expect(page.locator('item-layout span')).toHaveText('Updated');
});

test('a conditional observes the initial value of a named owner registered later', async ({
  page,
}) => {
  await page.evaluate(() => {
    let branch = document.createElement('sym-conditional');
    branch.setAttribute('when', 'LATE/visible');
    branch.setAttribute('behavior', 'dom-add');
    branch.innerHTML = '<output>Late owner</output>';
    document.body.append(branch);
  });
  await expect(page.locator('sym-conditional output')).toHaveCount(0);
  await page.evaluate(() => {
    let owner = document.createElement('sym-context');
    owner.setAttribute('ctx', 'LATE');
    owner.innerHTML = '<script type="application/json">{"visible":true}</script>';
    document.body.append(owner);
  });
  await expect(page.locator('sym-conditional output')).toHaveText('Late owner');
});
