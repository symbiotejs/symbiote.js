import { test, expect } from '@playwright/test';

test.describe('Symbiote class', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/test/browser/fixtures/symbiote.html');
    await page.waitForFunction(() => window.__TEST_READY === true);
  });

  // ── reg() ──

  test('reg() should register custom element and return class', async ({ page }) => {
    let exists = await page.evaluate(() => !!customElements.get('sym-basic'));
    expect(exists).toBe(true);

    let returned = await page.evaluate(() => window.__regReturnedClass);
    expect(returned).toBe(true);
  });

  // ── init$ and $ proxy ──

  test('init$ should create reactive state with $ proxy', async ({ page }) => {
    expect(await page.textContent('#basic-label')).toBe('initial');

    await page.evaluate(() => {
      document.querySelector('sym-basic').$.label = 'updated';
    });
    expect(await page.textContent('#basic-label')).toBe('updated');
  });

  // ── set$ batch update ──

  test('set$() should batch update multiple props', async ({ page }) => {
    expect(await page.textContent('#batch-a')).toBe('A');
    expect(await page.textContent('#batch-b')).toBe('B');

    await page.evaluate(() => {
      document.querySelector('sym-batch').set$({ a: 'X', b: 'Y' });
    });
    expect(await page.textContent('#batch-a')).toBe('X');
    expect(await page.textContent('#batch-b')).toBe('Y');
  });

  // ── initCallback / renderCallback ──

  test('initCallback and renderCallback should fire', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('#lifecycle');
      return {
        initCalled: el._initCalled,
        renderCalled: el._renderCalled,
        status: el.$.status,
      };
    });
    expect(result.initCalled).toBe(true);
    expect(result.renderCalled).toBe(true);
    expect(result.status).toBe('init');
  });

  // ── destroyCallback ──

  test('destroyCallback should fire on removal', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#lifecycle');
      el.readyToDestroy = true;
      el.remove();
    });
    // Wait for destructionDelay (100ms default)
    await page.waitForTimeout(200);
    let destroyed = await page.evaluate(() => window.__destroyCalled);
    expect(destroyed).toBe(true);
  });

  // ── sub() ──

  test('sub() should subscribe to state changes', async ({ page }) => {
    expect(await page.textContent('#sub-mirror')).toBe('HELLO');

    await page.evaluate(() => {
      document.querySelector('sym-sub').$.source = 'world';
    });
    expect(await page.textContent('#sub-mirror')).toBe('WORLD');
  });

  // ── ref ──

  test('ref should provide element references', async ({ page }) => {
    expect(await page.textContent('#ref-btn')).toBe('ref works');
  });

  // ── has() / add() / add$() ──

  test('has() should check property existence', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('#add-el');
      return {
        hasExisting: el.has('existing'),
        hasMissing: el.has('missing'),
      };
    });
    expect(result.hasExisting).toBe(true);
    expect(result.hasMissing).toBe(false);
  });

  test('add() should add new state properties', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('#add-el');
      el.add('dynamic', 42);
      return el.$.dynamic;
    });
    expect(result).toBe(42);
  });

  test('add$() should add multiple properties', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('#add-el');
      el.add$({ x: 1, y: 2 });
      return { x: el.$.x, y: el.$.y };
    });
    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
  });

  // ── Shadow DOM ──

  test('renderShadow should create shadow root', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('#shadow-el');
      return {
        hasShadow: !!el.shadowRoot,
        content: el.shadowRoot.querySelector('#shadow-inner')?.textContent,
      };
    });
    expect(result.hasShadow).toBe(true);
    expect(result.content).toBe('shadow content');
  });

  // ── rootStyles ──

  test('rootStyles should apply styles to light DOM', async ({ page }) => {
    let color = await page.evaluate(() => {
      let el = document.querySelector('sym-styled');
      return getComputedStyle(el).color;
    });
    expect(color).toBe('rgb(255, 0, 0)');
  });

  // ── bindAttributes ──

  test('bindAttributes should sync attribute to state', async ({ page }) => {
    expect(await page.textContent('#attr-mode')).toBe('custom');

    await page.evaluate(() => {
      document.querySelector('#attr-el').setAttribute('mode', 'updated');
    });
    // Wait for attribute observer
    await page.waitForTimeout(50);
    expect(await page.textContent('#attr-mode')).toBe('updated');
  });

  // ── animateOut ──

  test('Symbiote.animateOut should set [leaving] and remove after transition', async ({ page }) => {
    let exists = await page.evaluate(() => !!document.querySelector('#animated-el'));
    expect(exists).toBe(true);

    await page.evaluate(async () => {
      let el = document.querySelector('#animated-el');
      let Sym = customElements.get('sym-animated').prototype.constructor;
      await Sym.animateOut(el);
    });

    let gone = await page.evaluate(() => !document.querySelector('#animated-el'));
    expect(gone).toBe(true);
  });

  // ── {{prop}} text node binding ──

  test('{{prop}} should bind text nodes', async ({ page }) => {
    let text = await page.textContent('#text-output');
    expect(text).toBe('Hi, World!');

    await page.evaluate(() => {
      let el = document.querySelector('sym-text');
      el.$.greeting = 'Bye';
      el.$.name = 'Earth';
    });
    text = await page.textContent('#text-output');
    expect(text).toBe('Bye, Earth!');
  });

  // ── Named context ──

  test('named context should share state across components', async ({ page }) => {
    expect(await page.textContent('#ctx-val')).toBe('TestApp');

    await page.evaluate(() => {
      let Symbiote = customElements.get('sym-ctx');
      let el = document.querySelector('sym-ctx');
      el.$['TESTCTX/appName'] = 'Updated';
    });
    expect(await page.textContent('#ctx-val')).toBe('Updated');
  });

  // ── Attribute binding (@attr) ──

  test('@attr binding should set/remove attributes', async ({ page }) => {
    let hidden = await page.evaluate(() => {
      return document.querySelector('#attr-div').hasAttribute('hidden');
    });
    expect(hidden).toBe(false);

    await page.evaluate(() => {
      document.querySelector('#attr-bind-el').$.isHidden = true;
    });
    hidden = await page.evaluate(() => {
      return document.querySelector('#attr-div').hasAttribute('hidden');
    });
    expect(hidden).toBe(true);
  });

  // ── notify() ──

  test('notify() should re-fire subscribers', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('sym-basic');
      let callCount = 0;
      el.sub('label', () => { callCount++; }, false);
      el.notify('label');
      el.notify('label');
      return callCount;
    });
    expect(result).toBe(2);
  });

  // ── Bubbling binding (^) ──

  test('^ should bind text node to parent property', async ({ page }) => {
    expect(await page.textContent('#bubble-text')).toBe('from-parent');

    await page.evaluate(() => {
      document.querySelector('#parent-el').$.parentVal = 'changed';
    });
    expect(await page.textContent('#bubble-text')).toBe('changed');
  });

  test('^ should bind event handler to parent method', async ({ page }) => {
    expect(await page.textContent('#bubble-log')).toBe('');

    await page.click('#bubble-btn');
    expect(await page.textContent('#bubble-log')).toBe('clicked');
  });

  // ── Shared context (*) ──

  test('* props should share state between siblings with same ctx-name', async ({ page }) => {
    // Both components read from same shared context
    expect(await page.textContent('#shared-label-a')).toBe('hello');
    expect(await page.textContent('#shared-label-b')).toBe('hello');
  });

  test('* prop update from one component should reflect in sibling', async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector('#shared-a').$['*sharedCount'] = 42;
    });
    // Both should show updated value
    expect(await page.textContent('#shared-count-a')).toBe('42');
    expect(await page.textContent('#shared-count-b')).toBe('42');
  });

  test('first registered * value should win (no ctxOwner needed)', async ({ page }) => {
    // SymSharedA registers first with *sharedLabel = 'hello'
    // SymSharedB registers second with *sharedLabel = '' but add() doesn't overwrite
    expect(await page.textContent('#shared-label-a')).toBe('hello');
    expect(await page.textContent('#shared-label-b')).toBe('hello');
  });

  // ── CSS data binding (--prop) ──

  test('--prop via cssInit$ should read CSS custom property value', async ({ page }) => {
    expect(await page.textContent('#css-color')).toBe('crimson');
    expect(await page.textContent('#css-count')).toBe('5');
  });

  test('updateCssData should refresh state from changed CSS', async ({ page }) => {
    await page.evaluate(() => {
      let el = document.querySelector('#css-data-el');
      el.style.setProperty('--theme-color', "'blue'");
      el.updateCssData();
    });
    expect(await page.textContent('#css-color')).toBe('blue');
  });

  // ── Itemize class property fallback ──

  test('itemize should use class property fallback for data source', async ({ page }) => {
    let items = await page.$$eval('#itemize-fb-list li', (els) => els.map((e) => e.textContent));
    expect(items).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
});
