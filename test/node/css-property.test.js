import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCssPropertyValue } from '../../utils/parseCssPropertyValue.js';

describe('parseCssPropertyValue', () => {

  it('should parse number', () => {
    assert.equal(parseCssPropertyValue('42'), 42);
  });

  it('should parse single-quoted string', () => {
    assert.equal(parseCssPropertyValue("'hello'"), 'hello');
  });

  it('should parse double-quoted string', () => {
    assert.equal(parseCssPropertyValue('"world"'), 'world');
  });

  it('should parse boolean true', () => {
    assert.equal(parseCssPropertyValue('true'), true);
  });

  it('should parse boolean false', () => {
    assert.equal(parseCssPropertyValue('false'), false);
  });

  it('should parse null', () => {
    assert.equal(parseCssPropertyValue('null'), null);
  });

  it('should unescape CSS unicode sequences', () => {
    // \41 is 'A' in CSS hex escape
    assert.equal(parseCssPropertyValue("'\\41 '"), 'A');
  });

  it('should throw on invalid value', () => {
    assert.throws(() => parseCssPropertyValue('not-valid'), /Failed to parse/);
  });

  it('should parse negative numbers', () => {
    assert.equal(parseCssPropertyValue('-10'), -10);
  });

  it('should parse zero', () => {
    assert.equal(parseCssPropertyValue('0'), 0);
  });

  it('should parse float', () => {
    assert.equal(parseCssPropertyValue('3.14'), 3.14);
  });
});
