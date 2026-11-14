import Symbiote from '../core/Symbiote.js';
import BaseClass from './BaseClass.js';
import { resolveData } from './action-data.js';
import { conditionState } from './conditions.js';

// A separate native owner lets DOM modes dispose only the conditional content.
// Sharing the controller's context keeps authored local bindings in the same scope.
class ConditionalContent extends BaseClass {
  /** @type {import('../core/PubSub.js').PubSub | undefined} */
  context;

  get localCtx() {
    return this.context ?? super.localCtx;
  }
}
ConditionalContent.reg();

/** @param {Element} element */
function disposeContent(element) {
  for (let child of [
    ...element.children,
    ...(element.shadowRoot?.children || []),
  ]) {
    disposeContent(child);
  }
  if (element instanceof Symbiote) {
    element.destroy();
  }
}

export class SymConditional extends BaseClass {
  static observedAttributes = [
    ...BaseClass.observedAttributes,
    'when',
    'is',
    'is-type',
    'behavior',
  ];

  /** @type {ReturnType<typeof resolveData> | undefined} */
  #source;
  /** @type {{ remove(): void } | undefined} */
  #subscription;
  /** @type {DocumentFragment | undefined} */
  #blueprint;
  /** @type {ConditionalContent | undefined} */
  #content;
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
      this.bindCondition();
    }
  }

  prepare() {
    super.prepare();
    this.processInnerHtml = false;
  }

  /**
   * @param {string | DocumentFragment} [template]
   * @param {boolean} [shadow]
   */
  render(template, shadow) {
    this.restoreContent();
    this.#blueprint = this.ownerDocument.createDocumentFragment();
    this.#blueprint.append(...this.childNodes);
    let custom = this.allowCustomTemplate;
    this.allowCustomTemplate = false;
    try {
      super.render(template, shadow);
    } finally {
      this.allowCustomTemplate = custom;
    }
    this.#active = true;
    this.bindCondition();
  }

  connectFoundation() {
    super.connectFoundation();
    if (this.isConnected && this.connectedOnce && !this.#active) {
      this.#active = true;
      this.bindCondition();
    }
  }

  bindCondition() {
    this.#subscription?.remove();
    this.#subscription = undefined;
    let reference = this.getAttribute('when');
    if (!reference) {
      throw new TypeError('sym-conditional requires a when context reference.');
    }
    this.#source = resolveData(this, reference, true);
    this.updateContent();
    this.#subscription = this.#source.ctx.sub(this.#source.name, () => this.updateContent(), false) || undefined;
  }

  updateContent() {
    if (!this.#active || !this.isConnected || !this.#source) {
      return;
    }
    let {
      visible,
      dom,
    } = conditionState(
      this.#source.ctx.read(this.#source.name),
      this.getAttribute('is'),
      this.getAttribute('behavior') ?? 'show',
      this.getAttribute('is-type'),
    );
    this.hidden = !visible;
    this.inert = !visible;
    if (dom && !visible) {
      this.unmount();
    } else if (!this.#content) {
      let content = new ConditionalContent();
      content.context = this.localCtx;
      content.style.display = 'contents';
      content.append(this.#blueprint.cloneNode(true));
      for (let name of [
        'use-template',
        'process-inner-html',
      ]) {
        if (this.hasAttribute(name)) {
          content.setAttribute(name, this.getAttribute(name));
        }
      }
      this.#content = content;
      this.append(content);
    }
  }

  unmount() {
    let content = this.#content;
    this.#content = undefined;
    if (content) {
      content.remove();
      disposeContent(content);
    }
  }

  disconnectedCallback() {
    this.#active = false;
    this.#subscription?.remove();
    this.#subscription = undefined;
    super.disconnectedCallback();
  }

  destroyCallback() {
    this.unmount();
    super.destroyCallback();
  }
}

export default SymConditional;
