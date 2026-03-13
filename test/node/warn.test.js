import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { warnMsg, errMsg, registerMessages } from '../../core/warn.js';

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
