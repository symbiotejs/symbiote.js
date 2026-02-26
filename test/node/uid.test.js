import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UID } from '../../utils/UID.js';

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
