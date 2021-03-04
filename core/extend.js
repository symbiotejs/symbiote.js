import { BaseComponent } from './BaseComponent.js';

/**
 * @param {...Function} extFnList
 * @returns {typeof import('./typing-fix.tmp').ExtendedBaseType}
 */
export function extend(...extFnList) {
  return extFnList.reduce((ext, extFn) => {
    return extFn(ext);
  }, BaseComponent);
}
