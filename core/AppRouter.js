import PubSub from './PubSub.js';
import { warnMsg } from './warn.js';

export class AppRouter {

  /**
   * @typedef {{
   *   title?: String | (() => String),
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
  static #navigationVersion = 0;

  static get #isBrowser() {
    return typeof window !== 'undefined' && !globalThis.__SYMBIOTE_SSR;
  }

  static #print(msg) {
    warnMsg(13, msg);
  }

  /** @param {String | (() => String)} title */
  static setDefaultTitle(title) {
    this.defaultTitle = title;
  }

  /** @param {String | (() => String) | undefined} title */
  static #resolveTitle(title) {
    return typeof title === 'function' ? title() : title;
  }

  /**
   * @param {Object<string, RouteDescriptor>} map
   * @param {boolean} [replace]
   */
  static setRoutingMap(map, replace = false) {
    let nextMap = Object.assign(Object.create(null), replace ? {} : this.appMap, map);
    let defaultRoute = replace ? undefined : this.defaultRoute;
    let errorRoute = replace ? undefined : this.errorRoute;
    let usePathMode = false;
    for (let route in nextMap) {
      let desc = nextMap[route];
      if (!defaultRoute && desc.default === true) {
        defaultRoute = route;
      } else if (!errorRoute && desc.error === true) {
        errorRoute = route;
      }
      usePathMode ||= !!desc.pattern;
    }
    // Compile before publishing configuration so malformed patterns are atomic.
    let patterns = usePathMode ? this.#compilePatterns(nextMap) : [];
    if (replace) {
      this.appMap = nextMap;
      this.#currentState = null;
    } else {
      Object.assign(this.appMap, map);
    }
    this.defaultRoute = defaultRoute;
    this.errorRoute = errorRoute;
    this.#usePathMode = usePathMode;
    this.#compiledPatterns = patterns;
    this.#navigationVersion++;
  }

  /**
   * Compiles route patterns into regex matchers.
   * Pattern syntax: `/users/:id/posts/:postId` → regex with named groups
   * @param {Object<string, RouteDescriptor>} map
   */
  static #compilePatterns(map) {
    let patterns = [];
    for (let route in map) {
      let desc = map[route];
      if (!desc.pattern) continue;
      let keys = [];
      let regexStr = desc.pattern.replace(/:([^/]+)/g, (_, key) => {
        keys.push(key);
        return '([^/]+)';
      });
      patterns.push({
        regex: new RegExp(`^${regexStr}$`),
        keys,
        route,
      });
    }
    // Sort by specificity: longer patterns first, patterns without params first
    patterns.sort((a, b) => {
      if (a.keys.length !== b.keys.length) {
        return a.keys.length - b.keys.length;
      }
      return b.regex.source.length - a.regex.source.length;
    });
    return patterns;
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

  /** @param {Pick<Location, 'search' | 'pathname'>} [address] */
  static readAddressBar(address = window.location) {
    try {
      return this.#usePathMode ? this.#readPath(address) : this.#readQuery(address);
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
      return {
        route: null,
        options: {},
      };
    }
  }

  /** @param {Pick<Location, 'search'>} address */
  static #readQuery(address) {
    let result = {
      route: null,
      options: {},
    };
    let paramsArr = address.search.replace(/^\?/, '').split(this.separator);
    result.route = decodeURIComponent(paramsArr.shift() || '') || null;
    paramsArr.forEach((part) => {
      if (part.includes('=')) {
        let index = part.indexOf('=');
        result.options[decodeURIComponent(part.slice(0, index))] = decodeURIComponent(part.slice(index + 1));
      } else if (part) {
        result.options[decodeURIComponent(part)] = true;
      }
    });
    return result;
  }

  /** @param {Pick<Location, 'search' | 'pathname'>} address */
  static #readPath(address) {
    let pathname = address.pathname;
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
        let searchParams = new URLSearchParams(address.search);
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

  /** @returns {Promise<void>} */
  static async notify() {
    if (!this.#isBrowser) return;
    let version = ++this.#navigationVersion;
    let routeBase = this.readAddressBar();
    let routeScheme = this.appMap[routeBase.route];

    if (routeBase.route === null) {
      // Path mode: null = no pattern matched = 404
      // Query mode: null = empty URL = go to default
      if (this.#usePathMode && this.errorRoute) {
        return this.navigate(this.errorRoute);
      } else if (this.defaultRoute) {
        return this.navigate(this.defaultRoute);
      } else {
        this.#print('No route matched and no default/error route configured.');
      }
      return;
    } else if (!routeScheme && this.errorRoute) {
      return this.navigate(this.errorRoute);
    } else if (!routeScheme && this.defaultRoute) {
      return this.navigate(this.defaultRoute);
    } else if (!routeScheme) {
      this.#print(`Route "${routeBase.route}" not found...`);
      return;
    }

    // Run guards
    if (this.#guards.length) {
      let guardResult = await this.#runGuards(routeBase);
      if (version !== this.#navigationVersion) return;
      if (guardResult === false) return;
      if (typeof guardResult === 'string') {
        return this.navigate(guardResult);
      }
    }

    // Lazy load if needed
    if (routeScheme.load && !routeScheme.__loaded) {
      try {
        await routeScheme.load();
        if (version !== this.#navigationVersion) return;
        routeScheme.__loaded = true;
      } catch (err) {
        if (version !== this.#navigationVersion) return;
        this.#print(`Failed to load route "${routeBase.route}": ${err}`);
        if (this.errorRoute) {
          return this.navigate(this.errorRoute);
        }
        return;
      }
    }

    let resolvedTitle = this.#resolveTitle(routeScheme.title);
    if (resolvedTitle) {
      document.title = resolvedTitle;
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
    if (!this.#isBrowser) return;
    let routeScheme = this.appMap[route];
    if (!routeScheme) {
      this.#print('Wrong route: ' + route);
      return;
    }

    // Path substitution consumes keys; caller-owned data must remain unchanged.
    options = {
      ...options,
    };
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
      url = '?' + encodeURIComponent(route);
      for (let prop in options) {
        if (options[prop] === true) {
          url += this.separator + encodeURIComponent(prop);
        } else {
          url += this.separator + encodeURIComponent(prop) + '=' + encodeURIComponent(`${options[prop]}`);
        }
      }
    }

    let title = this.#resolveTitle(routeScheme.title) || this.#resolveTitle(this.defaultTitle) || '';
    try {
      window.history.pushState(null, title, url);
    } catch (err) {
      warnMsg(14);
    }
    document.title = title;
  }

  /**
   * @param {String} route
   * @param {Object<string, any>} [options]
   * @returns {Promise<void>}
   */
  static navigate(route, options = {}) {
    this.reflect(route, options);
    return this.notify();
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
   * @param {{ signal?: AbortSignal }} [options]
   * @returns {PubSub}
   */
  static initRoutingCtx(ctxName, routingMap, options = {}) {
    this.setRoutingMap(routingMap);
    let initial = {
      route: null,
      options: null,
      title: null,
    };
    let routingCtx = PubSub.getCtx(ctxName, false) || PubSub.registerCtx(initial, ctxName);
    for (let [
      key,
      value,
    ] of Object.entries(initial)) {
      routingCtx.add(key, value);
    }
    if (this.#isBrowser) {
      if (options.signal?.aborted) return routingCtx;
      window.addEventListener(this.routingEventName, (/** @type {CustomEvent} */ e) => {
        routingCtx.multiPub({
          options: e.detail.options,
          title: this.#resolveTitle(e.detail.options?.title) || this.#resolveTitle(this.defaultTitle) || '',
          route: e.detail.route,
        });
      }, {
        signal: options.signal,
      });
      void AppRouter.notify();
      this.#initPopstateListener();
    } else if (this.defaultRoute) {
      let defaultDesc = this.appMap[this.defaultRoute];
      routingCtx.multiPub({
        route: this.defaultRoute,
        options: {},
        title: this.#resolveTitle(defaultDesc?.title) || this.#resolveTitle(this.defaultTitle) || '',
      });
    }
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
    if (!this.#isBrowser) return;
    window.removeEventListener('popstate', this.#onPopstate);
    this.#onPopstate = null;
  }
}

export default AppRouter;
