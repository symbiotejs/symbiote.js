import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { warnMsg, errMsg, registerMessages, devState } from '../../core/warn.js';

describe('warn module', () => {

  it('should log short code without messages loaded', () => {
    let warnings = [];
    let origWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);

    warnMsg(99);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0], '[Symbiote W99]');

    console.warn = origWarn;
  });

  it('should format message after registerMessages', () => {
    let warnings = [];
    let origWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);

    registerMessages(new Map([
      [99, (name) => `Test warning for "${name}"`],
    ]));

    warnMsg(99, 'my-el');
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0], 'Test warning for "my-el"');

    console.warn = origWarn;
  });

  it('should use console.error for errMsg', () => {
    let errors = [];
    let origError = console.error;
    console.error = (msg) => errors.push(msg);

    errMsg(98);
    assert.equal(errors.length, 1);
    assert.equal(errors[0], '[Symbiote E98]');

    console.error = origError;
  });

  it('should format errMsg after registerMessages', () => {
    let errors = [];
    let origError = console.error;
    console.error = (msg) => errors.push(msg);

    registerMessages(new Map([
      [98, (val) => `Error: value is ${val}`],
    ]));

    errMsg(98, 'null');
    assert.equal(errors.length, 1);
    assert.equal(errors[0], 'Error: value is null');

    console.error = origError;
  });

  it('should pass multiple args to formatter', () => {
    let warnings = [];
    let origWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);

    registerMessages(new Map([
      [97, (a, b, c) => `${a} - ${b} - ${c}`],
    ]));

    warnMsg(97, 'x', 'y', 'z');
    assert.equal(warnings[0], 'x - y - z');

    console.warn = origWarn;
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

  it('should register message formatters on import', async () => {
    let warnings = [];
    let origWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);

    await import('../../core/devMessages.js');
    warnMsg(1, 'test-uid', 'read', 'unknownProp');
    assert.ok(warnings[0].includes('test-uid'));
    assert.ok(warnings[0].includes('unknownProp'));

    console.warn = origWarn;
  });

  it('should share messages via globalThis across module scopes', () => {
    let map = globalThis.__SYMBIOTE_DEV_MESSAGES;
    assert.ok(map instanceof Map);
    assert.ok(map.size > 0);
    assert.equal(typeof map.get(1), 'function');
  });
});

