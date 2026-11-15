import BaseClass from './BaseClass.js';
import { FragmentContent, disposeContent } from './fragment-content.js';
import { fragmentSources, fragmentTemplate, importSource } from './fragment-source.js';
import { fetchSource, requestLimits, SourceError } from './fetch-source.js';

export class SymImport extends BaseClass {
  static observedAttributes = [
    ...BaseClass.observedAttributes,
    'src',
    'request-timeout',
    'max-bytes',
  ];
  #active = false;
  #scheduled = false;
  /** @type {AbortController | undefined} */
  #controller;
  /** @type {FragmentContent | undefined} */
  #content;

  /**
   * @param {string} name
   * @param {string | null} previous
   * @param {string | null} value
   */
  attributeChangedCallback(name, previous, value) {
    if (name === 'pub-map') {
      super.attributeChangedCallback(name, previous, value);
    } else if (previous !== value && this.#active) {
      this.cancel();
      this.schedule();
    }
  }

  prepare() {
    super.prepare();
    this.processInnerHtml = false;
    this.localCtx.add('__htmlAppImport', {}, true);
    for (let key of [
      'loading',
      'loadError',
      'loadErrorMessage',
    ]) {
      this.localCtx.add('+' + key, () => this.$.__htmlAppImport[key], true);
    }
    this.status(false);
  }

  /**
   * @param {string | DocumentFragment} [template]
   * @param {boolean} [shadow]
   */
  render(template, shadow) {
    this.restoreContent();
    let fallback = this.ownerDocument.createDocumentFragment();
    fallback.append(...this.childNodes);
    let custom = this.allowCustomTemplate;
    this.allowCustomTemplate = false;
    try {
      super.render(template, shadow);
    } finally {
      this.allowCustomTemplate = custom;
    }
    if (fallback.childNodes.length) {
      this.mount(fallback);
    }
  }

  connectFoundation() {
    super.connectFoundation();
    if (this.isConnected && this.connectedOnce && !this.#active) {
      this.#active = true;
      this.schedule();
    }
  }

  /**
   * @param {boolean} loading
   * @param {{ operation: string, code: string, message: string, status: number | null } | null} [error]
   */
  status(loading, error = null) {
    this.localCtx.pub('__htmlAppImport', {
      loading,
      loadError: error,
      loadErrorMessage: error?.message ?? '',
    });
  }

  cancel() {
    this.#controller?.abort();
    this.#controller = undefined;
    this.#scheduled = false;
    if (this.connectedOnce) {
      this.status(false);
    }
  }

  schedule() {
    if (this.#scheduled || !this.#active || globalThis.__SYMBIOTE_SSR) {
      return;
    }
    this.#scheduled = true;
    queueMicrotask(() => {
      if (this.#scheduled && this.isConnected) {
        this.#scheduled = false;
        void this.load();
      }
    });
  }

  /**
   * @param {DocumentFragment} fragment
   * @param {ReturnType<typeof importSource>} [source]
   */
  mount(fragment, source) {
    let content = new FragmentContent();
    content.context = this.localCtx;
    content.style.display = 'contents';
    content.mcpToolMode = this.mcpToolMode;
    if (source) {
      fragmentSources.set(content, source);
    }
    let parsing = this.getAttribute('process-inner-html');
    if (parsing !== null) {
      content.setAttribute('process-inner-html', parsing);
    }
    content.append(this.ownerDocument.importNode(fragment, true));
    this.unmount();
    this.#content = content;
    this.append(content);
  }

  unmount() {
    let content = this.#content;
    this.#content = undefined;
    if (content) {
      content.remove();
      disposeContent(content);
    }
  }

  async load() {
    this.cancel();
    if (!this.isConnected || globalThis.__SYMBIOTE_SSR) {
      return;
    }
    let src = this.getAttribute('src')?.trim();
    if (!src) {
      return;
    }
    let controller = new AbortController();
    this.#controller = controller;
    this.status(true);
    try {
      let source = importSource(this, src);
      let response = await fetchSource(source.url, {
        ...requestLimits(this),
        signal: controller.signal,
      });
      if (!/^text\/html(?:;|$)/i.test(response.contentType)) {
        throw new SourceError('INVALID_CONTENT_TYPE', 'Expected an HTML fragment response.');
      }
      let fragment = fragmentTemplate(this.ownerDocument, response.text, source.url);
      if (this.#controller !== controller || !this.isConnected) {
        return;
      }
      this.mount(fragment, source);
      await new Promise(queueMicrotask);
      if (this.#controller === controller && this.isConnected) {
        this.status(false);
        this.dispatchEvent(new CustomEvent('load', {
          detail: {
            ok: true,
            operation: 'load',
            url: source.url,
          },
        }));
      }
    } catch (failure) {
      if (this.#controller !== controller || controller.signal.aborted) {
        return;
      }
      let error = {
        operation: 'load',
        code: failure instanceof SourceError ? failure.code : 'INVALID_TEMPLATE',
        message: failure instanceof Error ? failure.message : 'The fragment could not be loaded.',
        status: failure instanceof SourceError ? failure.status : null,
      };
      this.status(false, error);
      this.dispatchEvent(new CustomEvent('error', {
        detail: error,
      }));
    } finally {
      if (this.#controller === controller) {
        this.#controller = undefined;
      }
    }
  }

  disconnectedCallback() {
    this.#active = false;
    this.cancel();
    super.disconnectedCallback();
  }

  destroyCallback() {
    this.unmount();
    for (let key of [
      'loading',
      'loadError',
      'loadErrorMessage',
    ]) {
      this.localCtx.delete('+' + key);
    }
    super.destroyCallback();
  }
}

export default SymImport;
