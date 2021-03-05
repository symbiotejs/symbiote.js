import { BaseComponent } from './BaseComponent.js';

/**
 * @param {...Function} extFnList
 * @returns {typeof import('./typing-fix.tmp').ExtendedBaseType}
 */
export function extend(...extFnList) {
  return extFnList.reduce((ext, extFn) => {
    if (!ext['__extSet']) {
      ext['__extSet'] = new Set();
    }
    return ext['__extSet'].has(extFn) ? ext : (ext['__extSet'].add(extFn), extFn(ext));
  }, BaseComponent);
}
