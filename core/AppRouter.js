import PubSub from './PubSub.js';

export class AppRouter {

  /**
   * @typedef {{title?: String, default?: Boolean, error?: Boolean}} RouteDescriptor
   */

  /** @type {() => void} */
  static #onPopstate;
  /** @type {String} */
  static #separator;
  /** @type {String} */
  static #routingEventName;
  /** @type {Object<string, RouteDescriptor>} */
  static appMap = Object.create(null);

  static #print(msg) {
    console.warn(msg);
  }

  /** @param {String} title */
  static setDefaultTitle(title) {
    this.defaultTitle = title;
  }

  /** @param {Object<string, {}>} map */
  static setRoutingMap(map) {
    Object.assign(this.appMap, map);
    for (let route in this.appMap) {
      if (!this.defaultRoute && this.appMap[route].default === true) {
        this.defaultRoute = route;
      } else if (!this.errorRoute && this.appMap[route].error === true) {
        this.errorRoute = route;
      }
    }
  }

  /** @param {String} name */
  static set routingEventName(name) {
    /** @private */
    this.#routingEventName = name;
  }

  /** @returns {String} */
  static get routingEventName() {
    return this.#routingEventName || 'sym-on-route';
  }

  static readAddressBar() {
    let result = {
      route: null,
      options: {},
    };
    let paramsArr = window.location.search.split(this.separator);
    paramsArr.forEach((part) => {
      if (part.includes('?')) {
        result.route = part.replace('?', '');
      } else if (part.includes('=')) {
        let pair = part.split('=');
        result.options[pair[0]] = decodeURI(pair[1]);
      } else {
        result.options[part] = true;
      }
    });
    return result;
  }

  static notify() {
    let routeBase = this.readAddressBar();
    let routeScheme = this.appMap[routeBase.route];
    if (routeScheme && routeScheme.title) {
      document.title = routeScheme.title;
    }
    if (routeBase.route === null && this.defaultRoute) {
      this.applyRoute(this.defaultRoute);
      return;
    } else if (!routeScheme && this.errorRoute) {
      this.applyRoute(this.errorRoute);
      return;
    } else if (!routeScheme && this.defaultRoute) {
      this.applyRoute(this.defaultRoute);
      return;
    } else if (!routeScheme) {
      this.#print(`Route "${routeBase.route}" not found...`);
      return;
    }
    let event = new CustomEvent(AppRouter.routingEventName, {
      detail: {
        route: routeBase.route,
        options: {...(routeScheme || {}), ...routeBase.options},
      },
    });
    window.dispatchEvent(event);
  }

  /**
   * @param {String} route
   * @param {Object<string, any>} [options]
   */
  static reflect(route, options = {}) {
    let routeScheme = this.appMap[route];
    if (!routeScheme) {
      this.#print('Wrong route: ' + route);
      return;
    }
    let routeStr = '?' + route;
    for (let prop in options) {
      if (options[prop] === true) {
        routeStr += this.separator + prop;
      } else {
        routeStr += this.separator + prop + '=' + `${options[prop]}`;
      }
    }
    let title = routeScheme.title || this.defaultTitle || '';
    try {
      window.history.pushState(null, title, routeStr);
    } catch (err) {
      console.warn('AppRouter: History API not available.');
    }
    document.title = title;
  }

  /**
   * @param {String} route
   * @param {Object<string, any>} [options]
   */
  static applyRoute(route, options = {}) {
    this.reflect(route, options);
    this.notify();
  }

  /** @param {String} char */
  static setSeparator(char) {
    /** @private */
    this.#separator = char;
  }

  /** @returns {String} */
  static get separator() {
    return this.#separator || '&';
  }

  /**
   * @param {String} ctxName
   * @param {Object<string, RouteDescriptor>} routingMap
   * @returns {PubSub}
   */
  static initRoutingCtx(ctxName, routingMap) {
    this.setRoutingMap(routingMap);
    let routingCtx = PubSub.registerCtx(
      {
        route: null,
        options: null,
        title: null,
      },
      ctxName
    );
    window.addEventListener(this.routingEventName, (/** @type {CustomEvent} */ e) => {
      routingCtx.multiPub({
        options: e.detail.options,
        title: e.detail.options?.title || this.defaultTitle || '',
        route: e.detail.route,
      });
    });
    AppRouter.notify();
    this.#initPopstateListener();
    return routingCtx;
  }

  static #initPopstateListener() {
    if (this.#onPopstate) {
      return;
    }
    /** @private */
    this.__onPopstate = () => {
      this.notify();
    };
    window.addEventListener('popstate', this.#onPopstate);
  }

  static removePopstateListener() {
    window.removeEventListener('popstate', this.#onPopstate);
    this.#onPopstate = null;
  }
}

export default AppRouter;
