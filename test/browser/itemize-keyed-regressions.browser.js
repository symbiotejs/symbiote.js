import { test, expect } from '@playwright/test';

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/itemize-keyed.html');
  await page.waitForFunction(() => window.__TEST_READY);
});

test('complete reversal preserves every record element instead of falling back to positional patches', async ({
  page,
}) => {
  expect(await page.evaluate(() => {
    let owner = document.querySelector('keyed-list');
    let original = owner.$.items;
    let nodes = [
      ...owner.querySelector('ul').children,
    ];
    owner.$.items = [
      ...original,
    ].reverse();
    return [
      ...owner.querySelector('ul').children,
    ].every((node, index) => node === nodes[nodes.length - 1 - index]);
  })).toBe(true);
  await expect(page.locator('li')).toHaveText([
    'Epsilon',
    'Delta',
    'Gamma',
    'Beta',
    'Alpha',
  ]);
});

test('append and truncate keep updates within an otherwise unchanged prefix', async ({
  page,
}) => {
  await page.evaluate(() => {
    let owner = document.querySelector('keyed-list');
    let original = owner.$.items;
    owner.$.items = [
      original[0],
      {
        ...original[1],
        name: 'Updated Beta',
      },
      ...original.slice(2),
      {
        id: 'f',
        name: 'Zeta',
      },
    ];
  });
  await expect(page.locator('li').nth(1)).toHaveText('Updated Beta');
  await page.evaluate(() => {
    let owner = document.querySelector('keyed-list');
    let original = owner.$.items;
    owner.$.items = [
      original[0],
      {
        ...original[1],
        name: 'Truncated Beta',
      },
      original[2],
    ];
  });
  await expect(page.locator('li')).toHaveText([
    'Alpha',
    'Truncated Beta',
    'Gamma',
  ]);
});

test('animated leaving elements cannot be reused or remove a newly added record later', async ({
  page,
}) => {
  await page.evaluate(() => {
    let owner = document.querySelector('keyed-list');
    let list = owner.querySelector('ul');
    let original = owner.$.items;
    for (let item of list.children) {
      item.style.transition = 'opacity 0.05s';
    }
    owner.$.items = [
      original[0],
      original[4],
    ];
    owner.$.items = original;
  });
  await expect(page.locator('ul > :not([leaving]) li')).toHaveText([
    'Alpha',
    'Beta',
    'Gamma',
    'Delta',
    'Epsilon',
  ]);
  await expect(page.locator('[leaving]')).toHaveCount(0);
  await expect(page.locator('li')).toHaveCount(5);
});

test('fallback DOM moves retain focus and text selection for the same keyed record', async ({
  page,
}) => {
  expect(await page.evaluate(() => {
    let owner = document.querySelector('keyed-list');
    let list = owner.querySelector('ul');
    Object.defineProperty(list, 'moveBefore', {
      value: undefined,
    });
    let item = list.children[1];
    let input = document.createElement('input');
    item.append(input);
    input.value = 'Draft';
    input.focus();
    input.setSelectionRange(1, 3);
    owner.$.items = [
      ...owner.$.items,
    ].reverse();
    return {
      sameElement: list.children[3] === item,
      focused: document.activeElement === input,
      start: input.selectionStart,
      end: input.selectionEnd,
    };
  })).toEqual({
    sameElement: true,
    focused: true,
    start: 1,
    end: 3,
  });
});
