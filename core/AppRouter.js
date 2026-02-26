import PubSub from './PubSub.js';

export class AppRouter {

  /**
   * @typedef {{
   *   title?: String,
   *   default?: Boolean,
   *   error?: Boolean,
   *   pattern?: String,
   *   load?: () => Promise<*>,
   *   __loaded?: Boolean,
   * }} RouteDescriptor
   */

  /**
   * @typedef {{
   *   route: String,
   *   options: Object<string, any>,
   * }} RouteState
   */

  /**
   * @callback RouteGuard
   * @param {RouteState} to
   * @param {RouteState | null} from
   * @returns {string | boolean | void | Promise<string | boolean | void>}
   */

  /** @type {() => void} */
  static #onPopstate;
  /** @type {String} */
  static #separator;
  /** @type {String} */
  static #routingEventName;
  /** @type {Object<string, RouteDescriptor>} */
  static appMap = Object.create(null);
  /** @type {RouteGuard[]} */
  static #guards = [];
  /** @type {RouteState | null} */
  static #currentState = null;
  /** @type {boolean} */
  static #usePathMode = false;
  /** @type {Array<{regex: RegExp, keys: string[], route: string}>} */
  static #compiledPatterns = [];

  static #print(msg) {
    console.warn(`[Symbiote > AppRouter] ${msg}`);
  }

  /** @param {String} title */
  static setDefaultTitle(title) {
    this.defaultTitle = title;
  }

  /** @param {Object<string, {}>} map */
  static setRoutingMap(map) {
    Object.assign(this.appMap, map);
    for (let route in this.appMap) {
      let desc = this.appMap[route];
      if (!this.defaultRoute && desc.default === true) {
        this.defaultRoute = route;
      } else if (!this.errorRoute && desc.error === true) {
        this.errorRoute = route;
      }
      if (desc.pattern) {
        this.#usePathMode = true;
      }
    }
    if (this.#usePathMode) {
      this.#compilePatterns();
    }
  }

  /**
   * Compiles route patterns into regex matchers.
   * Pattern syntax: `/users/:id/posts/:postId` → regex with named groups
   */
  static #compilePatterns() {
    this.#compiledPatterns = [];
    for (let route in this.appMap) {
      let desc = this.appMap[route];
      if (!desc.pattern) continue;
      let keys = [];
      let regexStr = desc.pattern.replace(/:([^/]+)/g, (_, key) => {
        keys.push(key);
        return '([^/]+)';
      });
      this.#compiledPatterns.push({
        regex: new RegExp(`^${regexStr}$`),
        keys,
        route,
      });
    }
    // Sort by specificity: longer patterns first, patterns without params first
    this.#compiledPatterns.sort((a, b) => {
      if (a.keys.length !== b.keys.length) {
        return a.keys.length - b.keys.length;
      }
      return b.regex.source.length - a.regex.source.length;
    });
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
    if (this.#usePathMode) {
      return this.#readPath();
    }
    return this.#readQuery();
  }

  static #readQuery() {
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
      } else if (part) {
        result.options[part] = true;
      }
    });
    return result;
  }

  static #readPath() {
    let pathname = window.location.pathname;
    let result = {
      route: null,
      options: {},
    };

    for (let compiled of this.#compiledPatterns) {
      let match = pathname.match(compiled.regex);
      if (match) {
        result.route = compiled.route;
        for (let i = 0; i < compiled.keys.length; i++) {
          result.options[compiled.keys[i]] = decodeURIComponent(match[i + 1]);
        }
        // Also parse query string for additional options
        let searchParams = new URLSearchParams(window.location.search);
        searchParams.forEach((value, key) => {
          result.options[key] = value;
        });
        return result;
      }
    }

    return result;
  }

  /**
   * @param {RouteState} to
   * @returns {Promise<string | boolean | void>}
   */
  static async #runGuards(to) {
    let from = this.#currentState;
    for (let guard of this.#guards) {
      let result = await guard(to, from);
      if (result === false) return false;
      if (typeof result === 'string') return result;
    }
  }

  static async notify() {
    let routeBase = this.readAddressBar();
    let routeScheme = this.appMap[routeBase.route];

    if (routeBase.route === null) {
      // Path mode: null = no pattern matched = 404
      // Query mode: null = empty URL = go to default
      if (this.#usePathMode && this.errorRoute) {
        this.navigate(this.errorRoute);
      } else if (this.defaultRoute) {
        this.navigate(this.defaultRoute);
      } else {
        this.#print('No route matched and no default/error route configured.');
      }
      return;
    } else if (!routeScheme && this.errorRoute) {
      this.navigate(this.errorRoute);
      return;
    } else if (!routeScheme && this.defaultRoute) {
      this.navigate(this.defaultRoute);
      return;
    } else if (!routeScheme) {
      this.#print(`Route "${routeBase.route}" not found...`);
      return;
    }

    // Run guards
    if (this.#guards.length) {
      let guardResult = await this.#runGuards(routeBase);
      if (guardResult === false) return;
      if (typeof guardResult === 'string') {
        this.navigate(guardResult);
        return;
      }
    }

    // Lazy load if needed
    if (routeScheme.load && !routeScheme.__loaded) {
      try {
        await routeScheme.load();
        routeScheme.__loaded = true;
      } catch (err) {
        this.#print(`Failed to load route "${routeBase.route}": ${err}`);
        if (this.errorRoute) {
          this.navigate(this.errorRoute);
        }
        return;
      }
    }

    if (routeScheme.title) {
      document.title = routeScheme.title;
    }

    this.#currentState = routeBase;

    let schemeOptions = {};
    for (let key in routeScheme) {
      if (key === 'pattern' || key === 'load' || key === '__loaded' || key === 'default' || key === 'error') continue;
      schemeOptions[key] = routeScheme[key];
    }

    let event = new CustomEvent(AppRouter.routingEventName, {
      detail: {
        route: routeBase.route,
        options: {...schemeOptions, ...routeBase.options},
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

    let url;
    if (this.#usePathMode && routeScheme.pattern) {
      url = routeScheme.pattern.replace(/:([^/]+)/g, (_, key) => {
        let val = options[key];
        delete options[key];
        return encodeURIComponent(val ?? '');
      });
      // Append remaining options as query string
      let remaining = Object.entries(options).filter(([, v]) => v !== undefined);
      if (remaining.length) {
        url += '?' + remaining.map(([k, v]) =>
          v === true ? k : `${k}=${encodeURIComponent(v)}`
        ).join('&');
      }
    } else {
      url = '?' + route;
      for (let prop in options) {
        if (options[prop] === true) {
          url += this.separator + prop;
        } else {
          url += this.separator + prop + '=' + `${options[prop]}`;
        }
      }
    }

    let title = routeScheme.title || this.defaultTitle || '';
    try {
      window.history.pushState(null, title, url);
    } catch (err) {
      console.warn('[Symbiote > AppRouter] History API is not available.');
    }
    document.title = title;
  }

  /**
   * @param {String} route
   * @param {Object<string, any>} [options]
   */
  static navigate(route, options = {}) {
    this.reflect(route, options);
    this.notify();
  }

  /**
   * Register a route guard. Guards run before navigation.
   * Return `false` to cancel, a route string to redirect, or nothing to proceed.
   * @param {RouteGuard} fn
   * @returns {() => void} unsubscribe function
   */
  static beforeRoute(fn) {
    this.#guards.push(fn);
    return () => {
      let idx = this.#guards.indexOf(fn);
      if (idx !== -1) {
        this.#guards.splice(idx, 1);
      }
    };
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
    this.#onPopstate = () => {
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
