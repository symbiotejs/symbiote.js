/**
 * Native use-template lookup: the containing root takes precedence.
 * @param {Element} element
 * @param {string} selector
 * @returns {HTMLTemplateElement | null}
 */
export function resolveTemplate(element, selector) {
  let root = /** @type {Document | ShadowRoot | DocumentFragment} */ (element.getRootNode());
  return /** @type {HTMLTemplateElement | null} */ (
    root.querySelector?.(selector) || element.ownerDocument.querySelector(selector)
  );
}
