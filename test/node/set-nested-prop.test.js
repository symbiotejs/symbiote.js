import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setNestedProp } from '../../utils/setNestedProp.js';

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
