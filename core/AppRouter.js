 export class AppRouter {

  static _print(msg) {
    console.warn(msg);
  }

  /**
   *
   * @param {String} title
   */
  static setDefaultTitle(title) {
    this.defaultTitle = title;
  }

  /**
   *
   * @param {Object<string, {}>} map
   */
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

  static set routingEventName(name) {
    this.__routingEventName = name;
  }

  static get routingEventName() {
    return this.__routingEventName || 'sym-on-route';
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
      this._print(`Route "${routeBase.route}" not found...`);
      return;
    }
    let event = new CustomEvent(AppRouter.routingEventName, {
      detail: {
        route: routeBase.route,
        options: Object.assign(routeScheme || {}, routeBase.options),
      },
    });
    window.dispatchEvent(event);
  }

  /**
   *
   * @param {String} route
   * @param {Object<string, *>} [options]
   */
  static reflect(route, options = {}) {
    let routeScheme = this.appMap[route];
    if (!routeScheme) {
      this._print('Wrong route: ' + route);
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
    window.history.pushState(null, title, routeStr);
    document.title = title;
  }

  /**
  *
  * @param {String} route
  * @param {Object<string, *>} [options]
  */
  static applyRoute(route, options = {}) {
    this.reflect(route, options);
    this.notify();
  }

  /**
   * 
   * @param {String} char 
   */
  static setSeparator(char) {
    this._separator = char;
  }

  static get separator() {
    return this._separator || '&';
  }

}

AppRouter.appMap = Object.create(null);

window.onpopstate = () => {
  AppRouter.notify();
};