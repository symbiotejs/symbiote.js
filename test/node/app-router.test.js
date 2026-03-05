import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppRouter } from '../../core/AppRouter.js';
import PubSub from '../../core/PubSub.js';

describe('AppRouter (SSR / Node.js)', () => {
  let ctxKey = 'ROUTER_TEST_' + Date.now();

  afterEach(() => {
    PubSub.deleteCtx(ctxKey);
  });

  it('initRoutingCtx should create PubSub context without errors', () => {
    let ctx = AppRouter.initRoutingCtx(ctxKey, {
      home: { title: 'Home', default: true },
      about: { title: 'About' },
    });
    assert.ok(ctx instanceof PubSub);
    assert.strictEqual(PubSub.getCtx(ctxKey), ctx);
  });

  it('context should have default route/options/title properties', () => {
    let ctx = AppRouter.initRoutingCtx(ctxKey, {
      home: { title: 'Home', default: true },
    });
    assert.strictEqual(ctx.read('route'), 'home');
    assert.deepStrictEqual(ctx.read('options'), {});
    assert.strictEqual(ctx.read('title'), 'Home');
  });

  it('notify should not throw in Node.js', () => {
    assert.doesNotThrow(() => {
      AppRouter.notify();
    });
  });

  it('navigate should not throw in Node.js', () => {
    AppRouter.setRoutingMap({ home: { title: 'Home', default: true } });
    assert.doesNotThrow(() => {
      AppRouter.navigate('home');
    });
  });

  it('reflect should not throw in Node.js', () => {
    AppRouter.setRoutingMap({ home: { title: 'Home', default: true } });
    assert.doesNotThrow(() => {
      AppRouter.reflect('home');
    });
  });

  it('removePopstateListener should not throw in Node.js', () => {
    assert.doesNotThrow(() => {
      AppRouter.removePopstateListener();
    });
  });
});
