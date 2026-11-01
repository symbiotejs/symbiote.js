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

  // ── $ setter ──

  test('$ assignment should update bindings and preserve the state proxy', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('sym-batch');
      let state = el.$;
      el.$ = { a: 'X', b: 'Y' };
      let values = { a: state.a, b: state.b };
      el.$ = { a: 'Z' };
      let merged = { a: state.a, b: state.b };
      state.b = 'W';
      return { values, merged, sameProxy: state === el.$, a: el.$.a, b: el.$.b };
    });
    expect(result).toEqual({
      values: { a: 'X', b: 'Y' }, merged: { a: 'Z', b: 'Y' }, sameProxy: true, a: 'Z', b: 'W',
    });
    expect(await page.textContent('#batch-a')).toBe('Z');
    expect(await page.textContent('#batch-b')).toBe('W');
  });

  test('$ assignment should notify subscribers even for unchanged primitive values', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('sym-basic');
      el.add$({ count: 1, enabled: true });
      let changes = { label: [], count: [], enabled: [] };
      for (let prop of Object.keys(changes)) {
        el.sub(prop, (value) => changes[prop].push(value), false);
      }
      el.$ = { label: 'initial', count: 1, enabled: true };
      el.$ = { label: '', count: 0, enabled: false };
      el.$ = { label: '', count: 0, enabled: false };
      return changes;
    });
    expect(result).toEqual({ label: ['initial', '', ''], count: [1, 0, 0], enabled: [true, false, false] });
    expect(await page.textContent('#basic-label')).toBe('');
  });

  test('$ assignment should republish objects, arrays, functions, null and undefined', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('sym-basic');
      let values = { object: { count: 0 }, array: [], fn: () => 42, nil: null, unset: undefined };
      el.add$(values);
      let changes = {};
      let sameValues = true;
      for (let prop of Object.keys(values)) {
        changes[prop] = 0;
        el.sub(prop, (value) => {
          changes[prop]++;
          sameValues = sameValues && value === values[prop];
        }, false);
      }
      values.object.count = 1;
      values.array.push('item');
      el.$ = values;
      el.$ = values;
      return { changes, sameValues, count: el.$.object.count, array: el.$.array, fnResult: el.$.fn() };
    });
    expect(result).toEqual({
      changes: { object: 2, array: 2, fn: 2, nil: 2, unset: 2 },
      sameValues: true, count: 1, array: ['item'], fnResult: 42,
    });
  });

  test('$ assignment with an empty object should preserve state without notifications', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('sym-batch');
      let notifications = 0;
      el.sub('a', () => { notifications++; }, false);
      el.sub('b', () => { notifications++; }, false);
      el.$ = {};
      return { a: el.$.a, b: el.$.b, notifications };
    });
    expect(result).toEqual({ a: 'A', b: 'B', notifications: 0 });
  });

  test('$ assignment should merge new properties into existing reactive state', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('sym-batch');
      let state = el.$;
      el.$ = { a: 'updated', count: 1 };
      let changes = [];
      el.sub('count', (value) => changes.push(value), false);
      el.$ = { count: 2, extra: 'added' };
      return {
        a: state.a, b: state.b, count: state.count, extra: state.extra,
        hasCount: el.has('count'), hasExtra: el.has('extra'), changes,
      };
    });
    expect(result).toEqual({
      a: 'updated', b: 'B', count: 2, extra: 'added', hasCount: true, hasExtra: true, changes: [2],
    });
    expect(await page.textContent('#batch-a')).toBe('updated');
    expect(await page.textContent('#batch-b')).toBe('B');
  });

  test('$ assignment should route shared, named and parent properties to their contexts', async ({ page }) => {
    let result = await page.evaluate(() => {
      let shared = document.querySelector('#shared-a');
      shared.$ = { '*sharedCount': 42, '*added': 'shared' };
      let named = document.querySelector('sym-ctx');
      named.$ = { 'TESTCTX/appName': 'merged', 'TESTCTX/added': 'named' };
      document.querySelector('sym-child').$ = { '^parentVal': 'merged parent' };
      return {
        shared: document.querySelector('#shared-b').$['*added'],
        named: named.$['TESTCTX/added'], parent: document.querySelector('#parent-el').$.parentVal,
      };
    });
    expect(result).toEqual({ shared: 'shared', named: 'named', parent: 'merged parent' });
    expect(await page.textContent('#shared-count-a')).toBe('42');
    expect(await page.textContent('#shared-count-b')).toBe('42');
    expect(await page.textContent('#ctx-val')).toBe('merged');
    expect(await page.textContent('#bubble-text')).toBe('merged parent');
  });

  test('$ assignment should register state before the first state read and connection', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.createElement('sym-batch');
      el.$ = { a: 'before connection', extra: 42 };
      let before = { a: el.$.a, extra: el.$.extra };
      document.querySelector('#mount').append(el);
      return { before, text: el.querySelector('#batch-a').textContent, b: el.$.b, extra: el.$.extra };
    });
    expect(result).toEqual({
      before: { a: 'before connection', extra: 42 }, text: 'before connection', b: 'B', extra: 42,
    });
  });

  test('$ template binding should merge parent objects into child state', async ({ page }) => {
    await page.evaluate(async () => {
      let { default: Symbiote, html } = await import('/core/Symbiote.js');
      class ProfileCard extends Symbiote {
        init$ = { name: '', role: 'Reader' };
      }
      ProfileCard.template = html`
        <strong ${{textContent: 'name'}}></strong>
        <span ${{textContent: 'role'}}></span>
      `;
      ProfileCard.reg('profile-card');
      class ProfilePanel extends Symbiote {
        init$ = { profile: { name: 'Alex' } };
      }
      ProfilePanel.template = html`<profile-card ${{$: 'profile'}}></profile-card>`;
      ProfilePanel.reg('profile-panel');
      document.querySelector('#mount').append(document.createElement('profile-panel'));
    });
    let card = page.locator('profile-card');
    await expect(card.locator('strong')).toHaveText('Alex');
    await expect(card.locator('span')).toHaveText('Reader');

    let result = await page.evaluate(() => {
      let parent = document.querySelector('profile-panel');
      let child = document.querySelector('profile-card');
      let state = child.$;
      parent.$.profile = { role: 'Editor', extra: 42 };
      return {
        sameProxy: state === child.$, name: state.name, role: state.role, extra: state.extra,
      };
    });
    expect(result).toEqual({ sameProxy: true, name: 'Alex', role: 'Editor', extra: 42 });
    await expect(card.locator('strong')).toHaveText('Alex');
    await expect(card.locator('span')).toHaveText('Editor');
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

  // ── Pop-up binding (^) ──

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

  // ── isoMode Shadow DOM with slot children ──

  test('isoMode Shadow DOM should render template even when Light DOM slot children exist', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('#iso-shadow-el');
      return {
        hasShadow: !!el.shadowRoot,
        heading: el.shadowRoot?.querySelector('#iso-shadow-heading')?.textContent,
        hasSlot: !!el.shadowRoot?.querySelector('slot'),
      };
    });
    expect(result.hasShadow).toBe(true);
    expect(result.heading).toBe('shadow heading');
    expect(result.hasSlot).toBe(true);
  });

  test('isoMode Shadow DOM should preserve slotted Light DOM content', async ({ page }) => {
    let slotted = await page.evaluate(() => {
      let el = document.querySelector('#iso-shadow-el');
      let em = el.querySelector('em');
      return em?.textContent;
    });
    expect(slotted).toBe('slotted content');
  });

  test('isoMode Light DOM should render template when no children exist', async ({ page }) => {
    let info = await page.textContent('#iso-light-info');
    expect(info).toBe('light info');
  });

  // ── Combined rootStyles + shadowStyles ──

  test('component with both rootStyles and shadowStyles should have shadow root', async ({ page }) => {
    let result = await page.evaluate(() => {
      let el = document.querySelector('#dual-styled-el');
      return {
        hasShadow: !!el.shadowRoot,
        content: el.shadowRoot?.querySelector('#dual-inner')?.textContent,
      };
    });
    expect(result.hasShadow).toBe(true);
    expect(result.content).toBe('dual styled');
  });

  test('rootStyles should apply to document even when shadowStyles exist', async ({ page }) => {
    let color = await page.evaluate(() => {
      let el = document.querySelector('#dual-styled-el');
      return getComputedStyle(el).color;
    });
    expect(color).toBe('rgb(0, 128, 0)');
  });

  test('shadowStyles should apply inside shadow root when rootStyles also exist', async ({ page }) => {
    let borderStyle = await page.evaluate(() => {
      let el = document.querySelector('#dual-styled-el');
      return getComputedStyle(el).borderStyle;
    });
    expect(borderStyle).toBe('solid');
  });
});
