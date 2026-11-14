import BaseClass from './BaseClass.js';
import { itemizeProcessor } from '../core/itemizeProcessor.js';
import { collectionItemsProcessor } from './collection-items.js';
import { resolveData } from './action-data.js';
import { projectCollection } from './collection-data.js';

export class SymCollection extends BaseClass {
  static observedAttributes = [
    ...BaseClass.observedAttributes,
    'data',
    'filter',
    'search',
    'search-fields',
    'sort',
  ];

  init$ = {
    items: [],
    count: 0,
    totalCount: 0,
    empty: true,
  };

  /** @type {{ remove(): void }[]} */
  #subscriptions = [];
  #active = false;

  /**
   * @param {string} name
   * @param {string | null} previous
   * @param {string | null} value
   */
  attributeChangedCallback(name, previous, value) {
    if (name === 'pub-map') {
      super.attributeChangedCallback(name, previous, value);
    } else if (previous !== value && this.#active) {
      this.bindSource();
    }
  }

  source() {
    let reference = this.getAttribute('data');
    if (!reference) {
      throw new TypeError('sym-collection requires a data context reference.');
    }
    let target = resolveData(this, reference);
    if (target.ctx === this.localCtx && target.name === 'items') {
      throw new TypeError('Collection data must be separate from its derived items.');
    }
    return target;
  }

  prepare() {
    super.prepare();
    this.templateProcessors.add(collectionItemsProcessor);
    this.#active = true;
    this.bindSource();
  }

  connectFoundation() {
    super.connectFoundation();
    if (this.isConnected && this.connectedOnce && !this.#active) {
      this.#active = true;
      this.bindSource();
    }
  }

  /**
   * @param {string | DocumentFragment} [template]
   * @param {boolean} [shadow]
   */
  render(template, shadow) {
    this.templateProcessors.delete(itemizeProcessor);
    super.render(template, shadow);
  }

  bindSource() {
    for (let subscription of this.#subscriptions) {
      subscription.remove();
    }
    this.#subscriptions = [];
    let references = [
      this.source(),
    ];
    for (let name of [
      'filter',
      'search',
      'sort',
    ]) {
      let reference = this.getAttribute(name);
      if (reference) {
        references.push(resolveData(this, reference, true));
      }
    }
    // Project before installing subscriptions so invalid data never replaces a view.
    this.project();
    for (let reference of references) {
      let subscription = reference.ctx.sub(reference.name, () => this.project(), false);
      if (subscription) {
        this.#subscriptions.push(subscription);
      }
    }
  }

  project() {
    let source = this.source();
    let data = source.ctx.read(source.name);
    let read = (/** @type {string} */ name, /** @type {unknown} */ fallback) => {
      let reference = this.getAttribute(name);
      if (!reference) {
        return fallback;
      }
      let target = resolveData(this, reference, true);
      return target.ctx.read(target.name);
    };
    let fields = (this.getAttribute('search-fields') || '').split(',').map((field) => field.trim()).filter(Boolean);
    let items = projectCollection(data, read('filter', {}), read('search', ''), fields, read('sort', null));
    this.$ = {
      count: items.length,
      totalCount: data.length,
      empty: items.length === 0,
      items,
    };
  }

  disconnectedCallback() {
    this.#active = false;
    for (let subscription of this.#subscriptions) {
      subscription.remove();
    }
    this.#subscriptions = [];
    super.disconnectedCallback();
  }
}

export default SymCollection;
