import assert from 'node:assert/strict';
import test from 'node:test';
import { conditionState } from '../../html-app/conditions.js';

test('conditions select the explicit matched state for each behavior', () => {
  for (let behavior of [
    'show',
    'hide',
    'dom-add',
    'dom-remove',
  ]) {
    let inverse = behavior === 'hide' || behavior === 'dom-remove';
    for (let value of [
      true,
      false,
    ]) {
      assert.deepEqual(conditionState(value, 'true', behavior), {
        visible: value !== inverse,
        dom: behavior.startsWith('dom-'),
      });
    }
  }
});

test('conditions use truthiness by default and cast only explicit boolean literals', () => {
  assert.equal(conditionState(0, null).visible, false);
  assert.equal(conditionState('', null).visible, false);
  assert.equal(conditionState(null, null).visible, false);
  assert.equal(conditionState('false', null).visible, true);
  assert.equal(conditionState(false, 'false').visible, true);
  assert.equal(conditionState('false', 'false').visible, false);
  assert.equal(conditionState('false', 'false', 'show', 'string').visible, true);
  assert.equal(conditionState(1, '1').visible, false);
  assert.equal(conditionState('settings', 'settings').visible, true);
  assert.throws(() => conditionState(true, 'true', 'constructor'), TypeError);
  assert.throws(() => conditionState(true, 'true', 'show', 'json'), TypeError);
  assert.throws(() => conditionState(true, null, 'show', 'string'), TypeError);
});
