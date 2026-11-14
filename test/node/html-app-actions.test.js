import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAction, isDataReference, validateValue } from '../../html-app/action-data.js';
import { parseInitialData } from '../../html-app/initial-data.js';
test('action descriptors allow only the fixed operations and data references', () => {
  assert.deepEqual(parseAction('[pub-to-200]APP/note'), {
    operation: 'pub-to',
    reference: 'APP/note',
    delay: 200,
  });
  for (let reference of [
    'name',
    '^name',
    '*name',
    'APP/name',
    'APP/user.name',
  ]) {
    assert.equal(isDataReference(reference), true);
  }
  for (let source of [
    '[eval]APP/name',
    '[toggle-100]APP/name',
    '[set-1]APP/name',
    '[pub-to--1]APP/name',
    '[pub-to-1.5]APP/name',
    '[pub-to-2147483648]APP/name',
    '[set]',
    '[set]APP/name,other',
    '[set]APP/name;other',
    '[set]APP/+computed',
    '[set]@name',
    '[set]--name',
    '[set]APP/__proto__',
    '[set]APP/__htmlAppAction0',
  ]) {
    assert.throws(() => parseAction(source), TypeError);
  }
  assert.throws(() => parseInitialData('{"__htmlAppAction0":"injected"}'));
});
test('action values preserve types and permit explicit null values', () => {
  validateValue('0012', '0013');
  validateValue(false, true);
  validateValue(2, null);
  validateValue(null, 2);
  validateValue([], [
    'a',
  ]);
  for (let [
    before,
    value,
  ] of [
    [
      1,
      '1',
    ],
    [
      false,
      'false',
    ],
    [
      [],
      {},
    ],
    [
      {},
      [],
    ],
    [
      0,
      NaN,
    ],
    [
      '',
      undefined,
    ],
    [
      '',
      () => { },
    ],
  ]) {
    assert.throws(() => validateValue(before, value), TypeError);
  }
});
