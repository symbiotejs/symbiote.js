import { DICT } from '../core/dictionary.js';
import { ownElements } from '../core/ownElements.js';
import { controlValue, parseAction, resolveData, unavailable, validateValue } from './action-data.js';
import { prepareCollectionAction } from './collection-actions.js';
import { contextRequests, observeDataTarget } from './context-requests.js';
/**
 * @typedef {Object} ActionEvent
 * @property {boolean} [defaultPrevented]
 * @property {boolean} [isComposing]
 * @property {Element | null} [submitter]
 * @property {() => void} [preventDefault]
 *
 * @typedef {Object} Binding
 * @property {Element} element
 * @property {string} property
 * @property {string} source
 * @property {string} key
 * @property {ReturnType<typeof parseAction>} action
 * @property {boolean} composing
 * @property {(() => boolean) | undefined} pending
 * @property {ReturnType<typeof setTimeout> | undefined} timer
 * @property {(() => void)[]} cleanup
 * @property {{ remove(): void }[]} subscriptions
 */
let configuredForms = new WeakSet();
/**
 * @param {Element | DocumentFragment} root
 * @param {import('./BaseClass.js').BaseClass} owner
 */
export function actionProcessor(root, owner) {
  owner.actionBindings.process(root);
}
export class ActionBindings {
  /** @type {Binding[]} */
  bindings = [];
  connected = false;
  version = 0;
  sequence = 0;
  /** @param {import('./BaseClass.js').BaseClass} owner */
  constructor(owner) {
    this.owner = owner;
  }
  connect() {
    this.connected = true;
    if (this.bindings.some((binding) => [
      'pub-to',
      'item-pub',
    ].includes(binding.action.operation))) {
      this.owner.ownerDocument.addEventListener('submit', this.onSubmit, true);
    }
  }
  disconnect() {
    this.connected = false;
    this.version += 1;
    this.owner.ownerDocument.removeEventListener('submit', this.onSubmit, true);
    for (let binding of this.bindings) {
      this.cancel(binding);
      binding.composing = false;
    }
  }
  invalidate() {
    this.version += 1;
    for (let binding of this.bindings) {
      this.cancel(binding);
    }
  }
  /**
   * @param {Element | DocumentFragment} root
   */
  process(root) {
    for (let element of ownElements(root, '[bind]')) {
      let parts = element.getAttribute('bind').split(';');
      let events = parts.map((part) => part.split(':')[0].trim());
      let changed = false;
      let compiled = parts.map((part) => {
        let colon = part.indexOf(':');
        if (colon < 0) {
          return part;
        }
        let property = part.slice(0, colon).trim();
        let source = part.slice(colon + 1).trim();
        if (!source.startsWith('[')) {
          if (/^!+\[/.test(source)) {
            throw new TypeError('Actions cannot use boolean binding casts.');
          }
          return part;
        }
        if (!/^on[a-z]+$/.test(property) || events.filter((event) => event === property).length !== 1) {
          throw new TypeError('Each declarative action requires one event binding.');
        }
        let action = parseAction(source);
        let old = this.bindings.find((binding) => binding.element === element && binding.property === property);
        if (old) {
          this.drop(old);
        }
        let key = '__htmlAppAction' + this.sequence++;
        while (this.owner.localCtx.has(key)) {
          key = '__htmlAppAction' + this.sequence++;
        }
        /** @type {Binding} */
        let binding = {
          element,
          property,
          source,
          key,
          action,
          composing: false,
          pending: undefined,
          timer: undefined,
          cleanup: [],
          subscriptions: [],
        };
        this.bindings.push(binding);
        this.owner.localCtx.add(key, (/** @type {ActionEvent} */ event) => this.activate(binding, event));
        if (element instanceof HTMLFormElement && property === 'onsubmit') {
          configuredForms.add(element);
        }
        if (property === 'oninput' && [
          'pub-to',
          'item-pub',
        ].includes(action.operation)) {
          let start = () => {
            this.cancel(binding);
            binding.composing = true;
          };
          let end = () => {
            binding.composing = false;
            this.activate(binding);
          };
          element.addEventListener('compositionstart', start);
          element.addEventListener('compositionend', end);
          binding.cleanup.push(() => {
            element.removeEventListener('compositionstart', start);
            element.removeEventListener('compositionend', end);
          });
        }
        changed = true;
        return property + ': ' + key;
      });
      if (changed) {
        element.setAttribute('bind', compiled.join(';'));
      }
    }
  }
  /** @param {Binding} binding */
  cancel(binding) {
    clearTimeout(binding.timer);
    binding.timer = undefined;
    binding.pending = undefined;
    for (let subscription of binding.subscriptions) {
      subscription.remove();
    }
    binding.subscriptions = [];
  }
  /** @param {Binding} binding */
  drop(binding) {
    this.cancel(binding);
    for (let cleanup of binding.cleanup) {
      cleanup();
    }
    if (binding.element instanceof HTMLFormElement) {
      configuredForms.delete(binding.element);
    }
    this.owner.localCtx.delete(binding.key);
    this.bindings.splice(this.bindings.indexOf(binding), 1);
  }
  destroy() {
    this.disconnect();
    for (let binding of [
      ...this.bindings,
    ]) {
      this.drop(binding);
    }
  }
  /** @param {SubmitEvent} event */
  onSubmit = (event) => {
    if (!(event.target instanceof HTMLFormElement) || event.defaultPrevented) {
      return;
    }
    if (!this.flushForm(event.target) && configuredForms.has(event.target)) {
      event.preventDefault();
    }
  };
  /** @param {HTMLFormElement} form */
  flushForm(form) {
    let ready = true;
    for (let binding of this.bindings) {
      if (Reflect.get(binding.element, 'form') !== form) {
        continue;
      }
      if (binding.composing) {
        ready = false;
      }
      let commit = binding.pending;
      if (commit) {
        commit();
      }
    }
    return ready;
  }
  identity() {
    /** @type {Element | null} */
    let node = this.owner;
    while (node) {
      let runtime = Reflect.get(node, 'actionBindings');
      if (Reflect.has(node, DICT.MCP_ITEM_INDEX_KEY) && runtime instanceof ActionBindings) {
        return {
          runtime,
          version: runtime.version,
        };
      }
      node = node.parentElement;
    }
  }
  /**
   * @param {Binding} binding
   * @param {ActionEvent} [event]
   */
  activate(binding, event = {}) {
    let element = binding.element;
    if (!this.bindings.includes(binding) || event.defaultPrevented || unavailable(element, this.owner)) {
      return {
        changed: false,
      };
    }
    let operand = element;
    if (element instanceof HTMLFormElement && binding.property === 'onsubmit') {
      event.preventDefault?.();
      if (!this.flushForm(element)) {
        return {
          changed: false,
        };
      }
      if (event.submitter) {
        operand = event.submitter;
      }
      if (unavailable(operand, this.owner) || (!element.noValidate
        && !operand.hasAttribute('formnovalidate') && !element.checkValidity())) {
        return {
          changed: false,
        };
      }
    }
    this.cancel(binding);
    if (binding.composing || event.isComposing) {
      return {
        changed: false,
      };
    }
    let operation = binding.action.operation;
    if (operation === 'load' || operation === 'sync') {
      return contextRequests(binding.action.reference)[operation]();
    }
    if (operation === 'item-pub' && Reflect.get(element, 'validity')?.valid === false) {
      return {
        changed: false,
      };
    }
    let isCollection = ![
      'toggle',
      'set',
      'pub-to',
    ].includes(operation);
    let prepared = isCollection ? prepareCollectionAction(this.owner, binding.action, element, operand) : undefined;
    if (isCollection && !prepared) {
      return {
        changed: false,
      };
    }
    let target = prepared?.target || resolveData(this.owner, binding.action.reference);
    let before = target.ctx.read(target.name);
    let value;
    if (prepared) {
      value = prepared.value;
    } else if (binding.action.operation === 'toggle') {
      if (typeof before !== 'boolean') {
        throw new TypeError('toggle requires a boolean target.');
      }
      value = !before;
    }
    else {
      let data = operand.getAttribute('action-data') ?? element.getAttribute('action-data');
      if (data !== null && binding.action.operation === 'set') {
        let source = resolveData(this.owner, data, true);
        value = source.ctx.read(source.name);
      }
      else {
        let result = controlValue(operand, before);
        if (result.skip) {
          return {
            changed: false,
          };
        }
        value = result.value;
      }
      validateValue(before, value);
    }
    let identity = this.identity();
    let commit = () => {
      this.cancel(binding);
      if (unavailable(element, this.owner)
        || (identity && identity.runtime.version !== identity.version)) {
        return false;
      }
      let latest;
      try {
        latest = prepared ? prepared.resolve() : resolveData(this.owner, binding.action.reference);
      }
      catch {
        return false;
      }
      if (latest.ctx !== target.ctx || latest.name !== target.name || !Object.is(latest.ctx.read(latest.name), before)) {
        return false;
      }
      if (Object.is(before, value)) {
        return false;
      }
      observeDataTarget(latest);
      latest.ctx.pub(latest.name, value);
      prepared?.after?.();
      return true;
    };
    if (binding.action.delay) {
      if (!Object.is(before, value)) {
        let intent = observeDataTarget(target)?.intent(target.name, value);
        if (intent) {
          binding.subscriptions.push(intent);
        }
      }
      binding.pending = commit;
      let subscription = target.ctx.sub(target.name, () => this.cancel(binding), false);
      if (subscription) {
        binding.subscriptions.push(subscription);
      }
      binding.timer = setTimeout(commit, binding.action.delay);
      return {
        changed: false,
        pending: true,
      };
    }
    return {
      changed: commit(),
    };
  }
}
