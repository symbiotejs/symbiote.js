import { resolveData, controlValue, validateValue } from './action-data.js';
import { initialDefaults } from './initial-data.js';
import { appendRecord, prependRecord, cloneData, collectionData, recordData, updateMatching, updateRecord } from './collection-data.js';
import { findCollectionItem } from './collection-items.js';

let insertionActions = {
  append: appendRecord,
  prepend: prependRecord,
};

/**
 * @param {import('./BaseClass.js').BaseClass} owner
 * @param {Element} element
 * @param {Element} operand
 * @param {string} name
 */
function readOperand(owner, element, operand, name) {
  let reference = operand.getAttribute(name) ?? element.getAttribute(name);
  if (!reference) {
    throw new TypeError('Collection action requires ' + name + '.');
  }
  let target = resolveData(owner, reference, true);
  return target.ctx.read(target.name);
}

/**
 * Prepare a validated immutable update; publication remains in the action runtime.
 * @param {import('./BaseClass.js').BaseClass} owner
 * @param {ReturnType<import('./action-data.js').parseAction>} action
 * @param {Element} element
 * @param {Element} operand
 */
export function prepareCollectionAction(owner, action, element, operand) {
  if (action.operation.startsWith('item-')) {
    let {
      collection,
      id,
    } = findCollectionItem(owner);
    let target = collection.source();
    let before = collectionData(target.ctx.read(target.name));
    let record = before.find((item) => item.id === id);
    if (!record) {
      throw new TypeError('The collection record no longer exists.');
    }
    let patch = null;
    if (action.operation !== 'item-remove') {
      let field = action.reference;
      if (field === 'id' || !Object.hasOwn(record, field)) {
        throw new TypeError('Item actions require an existing mutable field.');
      }
      let value;
      if (action.operation === 'item-toggle') {
        if (typeof record[field] !== 'boolean') {
          throw new TypeError('item-toggle requires a boolean field.');
        }
        value = !record[field];
      } else {
        let control = controlValue(operand, record[field]);
        if (control.skip) {
          return;
        }
        value = control.value;
        validateValue(record[field], value);
      }
      patch = {
        [field]: value,
      };
    }
    return {
      target,
      value: updateRecord(before, id, patch),
      resolve: () => collection.source(),
    };
  }
  let target = resolveData(owner, action.reference);
  let before = target.ctx.read(target.name);
  let value;
  /** @type {(() => void) | undefined} */
  let after;
  if (Object.hasOwn(insertionActions, action.operation)) {
    value = insertionActions[action.operation](before, readOperand(owner, element, operand, 'action-data'));
    let reference = operand.getAttribute('action-reset') ?? element.getAttribute('action-reset');
    if (reference !== null) {
      let reset = resolveData(owner, reference);
      let defaults = initialDefaults.get(reset.ctx);
      if (!defaults || !Object.hasOwn(defaults, reset.name)) {
        throw new TypeError('action-reset requires a declared JSON default.');
      }
      let initial = cloneData(recordData(defaults[reset.name]));
      after = () => reset.ctx.pub(reset.name, initial);
    }
  } else {
    let match = readOperand(owner, element, operand, 'action-match');
    value = action.operation === 'patch-matching'
      ? updateMatching(before, match, readOperand(owner, element, operand, 'action-data'))
      : updateMatching(before, match);
  }
  return {
    target,
    value,
    after,
    resolve: () => resolveData(owner, action.reference),
  };
}
