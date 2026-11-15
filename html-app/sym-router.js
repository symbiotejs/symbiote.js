import { AppRouter } from '../core/AppRouter.js';
import { SymContext } from './sym-context.js';
import { routingMap } from './router-data.js';

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
    routingMap(this.localCtx.read('routes'));
    super.prepare();
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
    let routes = routingMap(this.$.routes);
    AppRouter.setRoutingMap(routes, true);
    this.#controller = new AbortController();
    activeRouter = this;
    this.localCtx.add('__htmlAppNavigate', (route, options) => {
      if (this.isConnected && activeRouter === this && this.#controller) {
        return AppRouter.navigate(route, options);
      }
    }, true);
    AppRouter.initRoutingCtx(this.getAttribute('ctx').trim(), {}, {
      signal: this.#controller.signal,
    });
    this.#subscription = this.sub('routes', () => {
      let routes = routingMap(this.$.routes);
      AppRouter.setRoutingMap(routes, true);
      void AppRouter.notify();
    }, false);
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
}

export default SymRouter;
