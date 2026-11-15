import Symbiote from '../core/Symbiote.js';
import BaseClass from './BaseClass.js';

// A native owner isolates fragment subscriptions while retaining local scope.
export class FragmentContent extends BaseClass {
  /** @type {import('../core/PubSub.js').PubSub | undefined} */
  context;

  get localCtx() {
    return this.context ?? super.localCtx;
  }
}
FragmentContent.reg();

/** @param {Element} element */
export function disposeContent(element) {
  for (let child of [
    ...element.children,
    ...(element.shadowRoot?.children || []),
  ]) {
    disposeContent(child);
  }
  if (element instanceof Symbiote) {
    element.destroy();
    if (!element.isConnected) {
      element.ref = Object.create(null);
    }
  }
}
