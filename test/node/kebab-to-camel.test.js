import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { kebabToCamel } from '../../utils/kebabToCamel.js';

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
