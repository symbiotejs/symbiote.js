import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { reassignDictionary } from '../../utils/reassignDictionary.js';
import { DICT } from '../../core/dictionary.js';

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
