import Symbiote, { css } from '../core/Symbiote.js';
import { DICT } from '../core/dictionary.js';
import { ActionBindings, actionProcessor } from './actions.js';
import { PubMap } from './pub-map.js';
import { declarationProcessor } from './declarations.js';
import { initialDataProcessor, isDataKey, readInitialData, readTemplateData, rememberDefaults } from './initial-data.js';

export class BaseClass extends Symbiote {
  static observedAttributes = [
    'pub-map',
  ];
  actionBindings = new ActionBindings(this);
  outgoingBindings = new PubMap(this);
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

  /** @param {string | null} _value */
  set 'pub-map'(_value) {
    this.outgoingBindings.refresh();
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
      // An ancestor may remove this child while deciding conditional content.
      if (!this.isConnected) { return; }
      if (this.#rebuild) { this.connectedOnce = false; }
      if (!this.connectedOnce) { this.prepare(); }
      super.connectedCallback();
      this.actionBindings.connect();
      this.outgoingBindings.connect();
    } finally {
      this.#connecting = false;
    }
  }

  seedDefaults() {
    if (this.#seeded) { return; }
    if (this.#markup === undefined) { this.#markup = this.innerHTML; }
    let root = this.#rebuild ? this.authoredContent() : this;
    let defaults = {
      ...readTemplateData(this),
      ...readInitialData(root),
    };
    rememberDefaults(this.localCtx, defaults);
    this.init$ = {
      ...defaults,
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
    this.templateProcessors.add(declarationProcessor);
    this.templateProcessors.add(initialDataProcessor);
    this.templateProcessors.add(actionProcessor);
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
    this.restoreContent();
    super.render(template, shadow);
    this.actionBindings.connect();
    this.outgoingBindings.connect();
  }

  restoreContent() {
    if (this.#rebuild) {
      this.#rebuild = false;
      this.ref = Object.create(null);
      this.replaceChildren(this.authoredContent());
    }
  }

  /**
   * @param {Record<string, unknown>} values
   * @param {boolean} [force]
   */
  set$(values, force = false) {
    if (Reflect.has(this, DICT.MCP_ITEM_INDEX_KEY) && Object.keys(values).some(isDataKey)) {
      this.actionBindings.invalidate();
    }
    super.set$(values, force);
  }

  /**
   * @param {Record<string, unknown>} values
   * @param {boolean} [rewrite]
   */
  add$(values, rewrite = false) {
    if (Reflect.has(this, DICT.MCP_ITEM_INDEX_KEY) && Object.keys(values).some(isDataKey)) {
      this.actionBindings.invalidate();
    }
    super.add$(values, rewrite);
  }

  disconnectedCallback() {
    this.actionBindings.disconnect();
    this.outgoingBindings.disconnect();
    super.disconnectedCallback();
  }

  destroyCallback() {
    this.actionBindings.destroy();
    this.outgoingBindings.disconnect();
    // Native teardown removes subscriptions. Reconnect reprocesses authored RAT,
    // retaining state rather than trying to reuse nodes with removed bindings.
    this.#snapshot = Object.fromEntries(Object.entries(this.localCtx.store).filter(([
      key,
    ]) => !key.startsWith('__htmlApp')));
    this.#rebuild = true;
    this.#seeded = false;
    super.destroyCallback();
  }
}

export default BaseClass;

BaseClass.rootStyles = css`
  sym-component,
  sym-context,
  sym-collection,
  sym-conditional,
  sym-import,
  sym-router {
    display: contents;
  }
  sym-component[hidden],
  sym-context[hidden],
  sym-collection[hidden],
  sym-conditional[hidden],
  sym-import[hidden],
  sym-router[hidden],
  sym-component[reg] {
    display: none;
  }
`;
