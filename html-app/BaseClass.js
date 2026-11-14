import Symbiote, { css } from '../core/Symbiote.js';
import { initialDataProcessor, isDataKey, readInitialData } from './initial-data.js';

export class BaseClass extends Symbiote {
  processInnerHtml = true;
  allowCustomTemplate = true;
  #scheduled = false;
  #connecting = false;
  /** @type {string | undefined} */
  #markup;
  #rebuild = false;
  #seeded = false;
  /** @type {Record<string, unknown>} */
  #snapshot = {};

  // Native Itemize uses this class for its generated item owners.
  get Symbiote() {
    return BaseClass;
  }

  connectedCallback() {
    this.seedDefaults();
    if (this.#scheduled) { return; }
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      this.connectFoundation();
    });
  }

  connectFoundation() {
    if (!this.isConnected || this.#connecting) { return; }
    this.#connecting = true;
    try {
      // All foundation tags can upgrade before nested owners initialize.
      let parent = this.parentNode;
      while (parent) {
        if (parent instanceof BaseClass) {
          parent.connectFoundation();
          break;
        }
        parent = parent.parentNode || (parent instanceof ShadowRoot ? parent.host : null);
      }
      if (this.#rebuild) { this.connectedOnce = false; }
      if (!this.connectedOnce) { this.prepare(); }
      super.connectedCallback();
    } finally {
      this.#connecting = false;
    }
  }

  seedDefaults() {
    if (this.#seeded) { return; }
    if (this.#markup === undefined) { this.#markup = this.innerHTML; }
    let root = this.#rebuild ? this.authoredContent() : this;
    this.init$ = {
      ...readInitialData(root),
      ...this.init$,
      ...this.#snapshot,
    };
    for (let [
      key,
      value,
    ] of Object.entries(this.init$)) {
      if (isDataKey(key)) { this.localCtx.add(key, value); }
    }
    this.#seeded = true;
  }

  prepare() {
    this.seedDefaults();
    this.templateProcessors.add(initialDataProcessor);
    let parsing = this.getAttribute('process-inner-html');
    if (parsing !== null) {
      if (![
        'true',
        'false',
      ].includes(parsing)) {
        throw new TypeError('process-inner-html must be true or false.');
      }
      this.processInnerHtml = parsing === 'true';
    }
  }

  authoredContent() {
    let template = this.ownerDocument.createElement('template');
    template.innerHTML = this.#markup ?? '';
    return /** @type {DocumentFragment} */ (template.content.cloneNode(true));
  }

  /**
   * @param {string | DocumentFragment} [template]
   * @param {boolean} [shadow]
   */
  render(template, shadow) {
    if (this.#rebuild) {
      this.#rebuild = false;
      this.ref = Object.create(null);
      this.replaceChildren(this.authoredContent());
    }
    super.render(template, shadow);
  }

  destroyCallback() {
    // Native teardown removes subscriptions. Reconnect reprocesses authored RAT,
    // retaining state rather than trying to reuse nodes with removed bindings.
    this.#snapshot = {
      ...this.localCtx.store,
    };
    this.#rebuild = true;
    this.#seeded = false;
    super.destroyCallback();
  }
}

export default BaseClass;

BaseClass.rootStyles = css`
  sym-component,
  sym-context {
    display: contents;
  }
  sym-component[hidden],
  sym-context[hidden] {
    display: none;
  }
`;
