import { BaseComponent } from './BaseComponent.js';

/**
 * @param {...Function} extFnList
 * @returns {typeof BaseComponent}
 */
export function extend(...extFnList) {
  let extended = BaseComponent;
  extFnList.forEach((extFn) => {
    extended = extFn(extended);
  });
  // @ts-ignore
  return extended;
}
