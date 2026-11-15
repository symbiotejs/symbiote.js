import { AppRouter } from '../core/AppRouter.js';
import { SymContext } from './sym-context.js';
import { routingMap } from './router-data.js';
import { isDataKey } from './initial-data.js';

/** @type {SymRouter | undefined} */
let activeRouter;

export class SymRouter extends SymContext {
  init$ = {
    route: null,
    options: null,
    title: null,
  };
  /** @type {AbortController | undefined} */
  #controller;
  /** @type {{ remove(): void } | undefined} */
  #subscription;

  prepare() {
    if (!this.getAttribute('ctx')?.trim()) {
      throw new TypeError('sym-router requires a ctx name.');
    }
    this.checkOwnership();
    if (this.localCtx.has('routes')) {
      routingMap(this.localCtx.read('routes'));
    } else if (!this.getAttribute('src')?.trim()) {
      throw new TypeError('sym-router requires routes or a JSON src.');
    }
    super.prepare();
    this.localCtx.add('+src', () => {
      // Fragment sources come from the validated map, never URL options.
      let routes = /** @type {ReturnType<typeof routingMap>} */ (AppRouter.appMap);
      return routes[this.$.route]?.src ?? '';
    }, true);
    this.localCtx.add('+params', () => Object.fromEntries(Object.entries(this.$.options ?? {}).filter(([
      key,
      value,
    ]) => isDataKey(key) && (value === null || typeof value === 'string' || typeof value === 'boolean'
      || typeof value === 'number' && Number.isFinite(value)))), true);
  }

  checkOwnership() {
    if ((activeRouter && activeRouter !== this)
      || (!activeRouter && Object.keys(AppRouter.appMap).length)) {
      throw new TypeError('AppRouter supports one application router; another router already owns it.');
    }
  }

  connectFoundation() {
    super.connectFoundation();
    if (!this.isConnected || !this.connectedOnce || this.#controller) {
      return;
    }
    this.checkOwnership();
    this.#controller = new AbortController();
    activeRouter = this;
    this.localCtx.add('__htmlAppNavigate', (route, options) => {
      if (this.isConnected && activeRouter === this && this.#controller) {
        return AppRouter.navigate(route, options);
      }
    }, true);
    let initialized = false;
    this.#subscription = this.sub('routes', () => {
      let routes = routingMap(this.$.routes);
      AppRouter.setRoutingMap(routes, true);
      if (initialized) {
        void AppRouter.notify();
      } else {
        initialized = true;
        AppRouter.initRoutingCtx(this.getAttribute('ctx').trim(), {}, {
          signal: this.#controller.signal,
        });
      }
    }, this.localCtx.has('routes'));
  }

  /** @param {Record<string, unknown>} data */
  mergeSource(data) {
    if (Object.hasOwn(data, 'routes') || !this.localCtx.has('routes')) {
      routingMap(data.routes);
    }
    super.mergeSource(data);
  }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#controller = undefined;
    this.#subscription?.remove();
    this.#subscription = undefined;
    this.localCtx.delete('__htmlAppNavigate');
    if (activeRouter === this) {
      AppRouter.removePopstateListener();
      AppRouter.setRoutingMap({}, true);
      activeRouter = undefined;
    }
    super.disconnectedCallback();
  }

  destroyCallback() {
    this.localCtx.delete('+src');
    this.localCtx.delete('+params');
    super.destroyCallback();
  }
}

export default SymRouter;
