import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import PubSub from '../../core/PubSub.js';

describe('PubSub', () => {
  /** @type {PubSub} */
  let ps;

  beforeEach(() => {
    ps = new PubSub({ name: 'Alex', count: 0, flag: true });
  });

  // ── constructor ────────────────────────────────────────────

  describe('constructor', () => {
    it('should clone schema into store', () => {
      let original = { val: 1 };
      let ctx = new PubSub(original);
      assert.strictEqual(ctx.store.val, 1);
      ctx.pub('val', 99);
      assert.strictEqual(original.val, 1, 'original should not be mutated');
    });
  });

  // ── read ───────────────────────────────────────────────────

  describe('read', () => {
    it('should return stored value', () => {
      assert.strictEqual(ps.read('name'), 'Alex');
      assert.strictEqual(ps.read('count'), 0);
      assert.strictEqual(ps.read('flag'), true);
    });

    it('should warn and return null for unknown prop', () => {
      let result = ps.read('nonexistent');
      assert.strictEqual(result, null);
    });
  });

  // ── has ────────────────────────────────────────────────────

  describe('has', () => {
    it('should return true for existing props', () => {
      assert.strictEqual(ps.has('name'), true);
      assert.strictEqual(ps.has('count'), true);
    });

    it('should return false for non-existing props', () => {
      assert.strictEqual(ps.has('missing'), false);
    });
  });

  // ── pub ────────────────────────────────────────────────────

  describe('pub', () => {
    it('should update stored value', () => {
      ps.pub('name', 'Bob');
      assert.strictEqual(ps.read('name'), 'Bob');
    });

    it('should notify subscribers', () => {
      let received;
      ps.sub('name', (val) => { received = val; }, false);
      ps.pub('name', 'Charlie');
      assert.strictEqual(received, 'Charlie');
    });

    it('should not publish to unknown prop', () => {
      ps.pub('missing', 42);
      assert.strictEqual(ps.has('missing'), false);
    });
  });

  // ── sub ────────────────────────────────────────────────────

  describe('sub', () => {
    it('should fire immediately with init=true (default)', () => {
      let received;
      ps.sub('name', (val) => { received = val; });
      assert.strictEqual(received, 'Alex');
    });

    it('should not fire immediately with init=false', () => {
      let callCount = 0;
      ps.sub('name', () => { callCount++; }, false);
      assert.strictEqual(callCount, 0);
    });

    it('should fire on subsequent publishes', () => {
      let values = [];
      ps.sub('count', (val) => { values.push(val); }, false);
      ps.pub('count', 1);
      ps.pub('count', 2);
      ps.pub('count', 3);
      assert.deepStrictEqual(values, [1, 2, 3]);
    });

    it('should return object with remove()', () => {
      let callCount = 0;
      let sub = ps.sub('count', () => { callCount++; }, false);
      ps.pub('count', 1);
      assert.strictEqual(callCount, 1);

      sub.remove();
      ps.pub('count', 2);
      assert.strictEqual(callCount, 1, 'should not fire after remove');
    });

    it('should return null for unknown prop', () => {
      let sub = ps.sub('missing', () => {});
      assert.strictEqual(sub, null);
    });
  });

  // ── add ────────────────────────────────────────────────────

  describe('add', () => {
    it('should add a new property', () => {
      ps.add('newProp', 42);
      assert.strictEqual(ps.read('newProp'), 42);
    });

    it('should not overwrite existing property without rewrite flag', () => {
      ps.add('name', 'Overwrite');
      assert.strictEqual(ps.read('name'), 'Alex');
    });

    it('should overwrite existing property with rewrite=true', () => {
      ps.add('name', 'Overwritten', true);
      assert.strictEqual(ps.read('name'), 'Overwritten');
    });

    it('should notify subscribers when adding', () => {
      ps.add('fresh', 'value');
      let received;
      ps.sub('fresh', (val) => { received = val; });
      assert.strictEqual(received, 'value');
    });
  });

  // ── multiPub ───────────────────────────────────────────────

  describe('multiPub', () => {
    it('should update multiple props at once', () => {
      ps.multiPub({ name: 'Bob', count: 10 });
      assert.strictEqual(ps.read('name'), 'Bob');
      assert.strictEqual(ps.read('count'), 10);
    });

    it('should notify each subscriber', () => {
      let nameVal, countVal;
      ps.sub('name', (val) => { nameVal = val; }, false);
      ps.sub('count', (val) => { countVal = val; }, false);
      ps.multiPub({ name: 'Eve', count: 99 });
      assert.strictEqual(nameVal, 'Eve');
      assert.strictEqual(countVal, 99);
    });
  });

  // ── proxy ──────────────────────────────────────────────────

  describe('proxy', () => {
    it('should read values via proxy getter', () => {
      let p = ps.proxy;
      assert.strictEqual(p.name, 'Alex');
      assert.strictEqual(p.count, 0);
    });

    it('should publish values via proxy setter', () => {
      let received;
      ps.sub('name', (val) => { received = val; }, false);
      ps.proxy.name = 'Proxy';
      assert.strictEqual(received, 'Proxy');
      assert.strictEqual(ps.read('name'), 'Proxy');
    });

    it('should return the same proxy instance', () => {
      assert.strictEqual(ps.proxy, ps.proxy);
    });
  });

  // ── notify ─────────────────────────────────────────────────

  describe('notify', () => {
    it('should fire all subscribers for a prop', () => {
      let calls = 0;
      ps.sub('name', () => { calls++; }, false);
      ps.sub('name', () => { calls++; }, false);
      ps.notify('name');
      assert.strictEqual(calls, 2);
    });
  });

  // ── uid ────────────────────────────────────────────────────

  describe('uid', () => {
    it('should set uid once and not allow overwrite', () => {
      ps.uid = 'first';
      ps.uid = 'second';
      assert.strictEqual(ps.uid, 'first');
    });
  });

  // ── computed properties ────────────────────────────────────

  describe('computed properties', () => {
    it('should compute value from local deps', async () => {
      let ctx = new PubSub({
        a: 2,
        b: 3,
        '+sum': function () {
          return ctx.read('a') + ctx.read('b');
        },
      });

      assert.strictEqual(ctx.read('+sum'), 5);
    });

    it('should recalculate on dependency change (microtask)', async () => {
      let ctx = new PubSub({
        x: 10,
        '+double': function () {
          return ctx.read('x') * 2;
        },
      });

      // Initialize computed
      assert.strictEqual(ctx.read('+double'), 20);

      // Change dependency
      ctx.pub('x', 5);

      // Wait for microtask
      await new Promise((r) => queueMicrotask(r));
      assert.strictEqual(ctx.read('+double'), 10);
    });

    it('should batch multiple dep changes into one recalc', async () => {
      let calcCount = 0;
      let ctx = new PubSub({
        a: 1,
        b: 2,
        '+sum': function () {
          calcCount++;
          return ctx.read('a') + ctx.read('b');
        },
      });

      // Initialize
      ctx.read('+sum');
      calcCount = 0;

      // Change both deps synchronously
      ctx.pub('a', 10);
      ctx.pub('b', 20);

      // Wait for microtask batch
      await new Promise((r) => queueMicrotask(r));
      assert.strictEqual(ctx.read('+sum'), 30);
      assert.strictEqual(calcCount, 1, 'should recalculate only once');
    });
  });

  // ── static: registerCtx / getCtx / deleteCtx ──────────────

  describe('static context management', () => {
    let ctxKey = 'TEST_CTX_' + Date.now();

    afterEach(() => {
      PubSub.deleteCtx(ctxKey);
    });

    it('should register and retrieve a named context', () => {
      let ctx = PubSub.registerCtx({ val: 42 }, ctxKey);
      assert.strictEqual(ctx.read('val'), 42);

      let retrieved = PubSub.getCtx(ctxKey);
      assert.strictEqual(retrieved, ctx);
    });

    it('should return existing context on duplicate registration', () => {
      let ctx1 = PubSub.registerCtx({ x: 1 }, ctxKey);
      let ctx2 = PubSub.registerCtx({ x: 2 }, ctxKey);
      assert.strictEqual(ctx1, ctx2);
      assert.strictEqual(ctx1.read('x'), 1, 'should keep original data');
    });

    it('should delete a context', () => {
      PubSub.registerCtx({ x: 1 }, ctxKey);
      PubSub.deleteCtx(ctxKey);
      let result = PubSub.getCtx(ctxKey, false);
      assert.strictEqual(result, null);
    });

    it('should return null for unknown context (with notify=false)', () => {
      let result = PubSub.getCtx('NONEXISTENT', false);
      assert.strictEqual(result, null);
    });
  });
});
