import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UID } from '../utils/UID.js';
import { kebabToCamel } from '../utils/kebabToCamel.js';
import { setNestedProp } from '../utils/setNestedProp.js';
import { parseCssPropertyValue } from '../utils/parseCssPropertyValue.js';
import { reassignDictionary } from '../utils/reassignDictionary.js';
import { DICT } from '../core/dictionary.js';

// ── UID ──

describe('UID', () => {

  it('should generate string matching default pattern length', () => {
    let uid = UID.generate();
    assert.equal(uid.length, 'XXXXXXXXX-XXX'.length);
  });

  it('should preserve dashes from pattern', () => {
    let uid = UID.generate('XXX-XXX-XXX');
    assert.equal(uid[3], '-');
    assert.equal(uid[7], '-');
  });

  it('should use custom pattern length', () => {
    let uid = UID.generate('XXXXX');
    assert.equal(uid.length, 5);
  });

  it('should generate unique values', () => {
    let a = UID.generate();
    let b = UID.generate();
    assert.notEqual(a, b);
  });

  it('should only contain alphanumeric chars and dashes', () => {
    let uid = UID.generate('XXXXXXXXXX-XXXXX');
    assert.match(uid, /^[a-zA-Z0-9-]+$/);
  });
});

// ── kebabToCamel ──

describe('kebabToCamel', () => {

  it('should convert simple kebab-case', () => {
    assert.equal(kebabToCamel('my-component'), 'myComponent');
  });

  it('should convert multi-segment kebab-case', () => {
    assert.equal(kebabToCamel('my-long-name'), 'myLongName');
  });

  it('should return single word unchanged', () => {
    assert.equal(kebabToCamel('hello'), 'hello');
  });

  it('should handle underscore separation (UPPER)', () => {
    assert.equal(kebabToCamel('my_var'), 'myVAR');
  });

  it('should handle mixed kebab and underscore', () => {
    assert.equal(kebabToCamel('my-component_name'), 'myComponentNAME');
  });

  it('should handle empty string', () => {
    assert.equal(kebabToCamel(''), '');
  });
});

// ── setNestedProp ──

describe('setNestedProp', () => {

  it('should set a top-level property', () => {
    let obj = { name: '' };
    let result = setNestedProp(obj, 'name', 'Alice');
    assert.equal(obj.name, 'Alice');
    assert.equal(result, true);
  });

  it('should set a nested property via dot path', () => {
    let obj = { style: { color: '' } };
    let result = setNestedProp(obj, 'style.color', 'red');
    assert.equal(obj.style.color, 'red');
    assert.equal(result, true);
  });

  it('should set deeply nested property', () => {
    let obj = { a: { b: { c: 0 } } };
    setNestedProp(obj, 'a.b.c', 42);
    assert.equal(obj.a.b.c, 42);
  });

  it('should return false for broken path', () => {
    let obj = { a: null };
    let result = setNestedProp(obj, 'a.b', 'val');
    assert.equal(result, false);
  });
});

// ── parseCssPropertyValue ──

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

// ── reassignDictionary ──

describe('reassignDictionary', () => {

  it('should override DICT values', () => {
    let original = DICT.BIND_ATTR;
    reassignDictionary({ BIND_ATTR: 'data-bind' });
    assert.equal(DICT.BIND_ATTR, 'data-bind');
    // Restore
    reassignDictionary({ BIND_ATTR: original });
  });

  it('should return DICT reference', () => {
    let result = reassignDictionary({});
    assert.equal(result, DICT);
  });

  it('should not remove existing keys', () => {
    reassignDictionary({ BIND_ATTR: 'custom' });
    assert.ok(DICT.LIST_ATTR);
    // Restore
    reassignDictionary({ BIND_ATTR: 'bind' });
  });
});
