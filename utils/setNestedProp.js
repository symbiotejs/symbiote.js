/**
 * @param {any} parent
 * @param {String} path
 * @param {any} value
 */
export function setNestedProp(parent, path, value) {
  let success = true;
  /** @type {String} */
  let lastStep;
  let propPath = path.split('.');
  // Register incoming child fields before its deferred connection initializes defaults.
  if (propPath.length === 2 && propPath[0] === '$' && typeof parent?.add$ === 'function'
    && !parent.connectedOnce) {
    parent.$ = {
      [propPath[1]]: value,
    };
    return true;
  }
  propPath.forEach((step, idx) => {
    if (idx < propPath.length - 1) {
      parent = parent[step];
    } else {
      lastStep = step;
    }
  });
  if (parent) {
    parent[lastStep] = value;
  } else {
    success = false;
  }
  return success;
}
