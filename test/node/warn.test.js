import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { warnMsg, errMsg, devState } from '../../core/warn.js';

describe('warn module', () => {

  it('should log short code without dev log handler', () => {
    let saved = globalThis.__SYMBIOTE_DEV_LOG;
    delete globalThis.__SYMBIOTE_DEV_LOG;
    let warnings = [];
    let origWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);

    warnMsg(99);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0], '[Symbiote W99]');

    console.warn = origWarn;
    if (saved) globalThis.__SYMBIOTE_DEV_LOG = saved;
  });

  it('should log short error code without dev log handler', () => {
    let saved = globalThis.__SYMBIOTE_DEV_LOG;
    delete globalThis.__SYMBIOTE_DEV_LOG;
    let errors = [];
    let origError = console.error;
    console.error = (msg) => errors.push(msg);

    errMsg(98);
    assert.equal(errors.length, 1);
    assert.equal(errors[0], '[Symbiote E98]');

    console.error = origError;
    if (saved) globalThis.__SYMBIOTE_DEV_LOG = saved;
  });

  it('should delegate to globalThis.__SYMBIOTE_DEV_LOG when set', () => {
    let calls = [];
    let saved = globalThis.__SYMBIOTE_DEV_LOG;
    globalThis.__SYMBIOTE_DEV_LOG = (type, code, args) => {
      calls.push({ type, code, args });
    };

    warnMsg(42, 'a', 'b');
    errMsg(43, 'c');

    assert.equal(calls.length, 2);
    assert.equal(calls[0].type, 'warn');
    assert.equal(calls[0].code, 42);
    assert.deepEqual(calls[0].args, ['a', 'b']);
    assert.equal(calls[1].type, 'error');
    assert.equal(calls[1].code, 43);
    assert.deepEqual(calls[1].args, ['c']);

    if (saved) globalThis.__SYMBIOTE_DEV_LOG = saved;
    else delete globalThis.__SYMBIOTE_DEV_LOG;
  });
});

describe('devState (globalThis-based devMode)', () => {

  afterEach(() => {
    delete globalThis.__SYMBIOTE_DEV_MODE;
  });

  it('should default to false when globalThis flag is unset', () => {
    delete globalThis.__SYMBIOTE_DEV_MODE;
    assert.equal(devState.devMode, false);
  });

  it('should read from globalThis.__SYMBIOTE_DEV_MODE', () => {
    globalThis.__SYMBIOTE_DEV_MODE = true;
    assert.equal(devState.devMode, true);
  });

  it('should write to globalThis.__SYMBIOTE_DEV_MODE', () => {
    devState.devMode = true;
    assert.equal(globalThis.__SYMBIOTE_DEV_MODE, true);

    devState.devMode = false;
    assert.equal(globalThis.__SYMBIOTE_DEV_MODE, false);
  });

  it('devState setter should be visible via globalThis getter', () => {
    devState.devMode = true;
    assert.equal(globalThis.__SYMBIOTE_DEV_MODE, true);
    assert.equal(devState.devMode, true);

    devState.devMode = false;
    assert.equal(globalThis.__SYMBIOTE_DEV_MODE, false);
    assert.equal(devState.devMode, false);
  });

  it('globalThis setter should be visible via devState getter', () => {
    globalThis.__SYMBIOTE_DEV_MODE = true;
    assert.equal(devState.devMode, true);

    globalThis.__SYMBIOTE_DEV_MODE = false;
    assert.equal(devState.devMode, false);
  });
});

describe('devMessages auto-enable', () => {

  afterEach(() => {
    delete globalThis.__SYMBIOTE_DEV_MODE;
  });

  it('should set devMode to true on import', async () => {
    delete globalThis.__SYMBIOTE_DEV_MODE;
    await import('../../core/devMessages.js');
    assert.equal(globalThis.__SYMBIOTE_DEV_MODE, true);
  });

  it('should register log handler on import', async () => {
    await import('../../core/devMessages.js');
    assert.equal(typeof globalThis.__SYMBIOTE_DEV_LOG, 'function');
  });

  it('should format messages via log handler', async () => {
    await import('../../core/devMessages.js');
    let warnings = [];
    let origWarn = console.warn;
    console.warn = (...args) => warnings.push(args);

    warnMsg(1, 'test-uid', 'read', 'unknownProp');
    assert.ok(warnings.length > 0);
    let output = warnings[0].join(' ');
    assert.ok(output.includes('test-uid'));
    assert.ok(output.includes('unknownProp'));

    console.warn = origWarn;
  });
});
