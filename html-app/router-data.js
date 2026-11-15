import { cloneData, recordData } from './collection-data.js';

/**
 * JSON configuration uses native descriptors, without executable loaders.
 * @param {unknown} value
 * @returns {typeof import('../core/AppRouter.js').AppRouter.appMap}
 */
export function routingMap(value) {
  let routes = cloneData(recordData(value));
  let entries = Object.values(routes);
  if (!entries.length) {
    throw new TypeError('sym-router requires a nonempty routes object.');
  }
  let patterns = 0;
  for (let value of entries) {
    let route = recordData(value);
    if (Object.hasOwn(route, 'load') || Object.hasOwn(route, '__loaded')) {
      throw new TypeError('HTML routes cannot define executable loaders. Use sym-import for fragments.');
    }
    if (Object.hasOwn(route, 'title') && typeof route.title !== 'string') {
      throw new TypeError('HTML route titles must be strings.');
    }
    for (let flag of [
      'default',
      'error',
    ]) {
      if (Object.hasOwn(route, flag) && typeof route[flag] !== 'boolean') {
        throw new TypeError('Route default and error flags must be booleans.');
      }
    }
    if (route.default && route.error) {
      throw new TypeError('The default and error routes must be distinct.');
    }
    if (Object.hasOwn(route, 'pattern')) {
      if (typeof route.pattern !== 'string' || !route.pattern.startsWith('/')) {
        throw new TypeError('Route patterns must be absolute URL paths.');
      }
      patterns++;
    }
  }
  if ((patterns && patterns !== entries.length)
    || entries.filter((route) => route.default).length > 1
    || entries.filter((route) => route.error).length > 1) {
    throw new TypeError('Use one route mode, at most one default and at most one error route.');
  }
  return routes;
}
