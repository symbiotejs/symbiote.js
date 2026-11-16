/**
 * querySelectorAll scoped to own elements only.
 * During ssrMode hydration, `fr` is the component itself (an HTMLElement).
 * querySelectorAll matches ALL descendants, including those inside child components.
 * Nested custom elements own their contents, except explicitly non-parsing hosts that delegate to `fr`.
 * @param {Element | DocumentFragment} fr
 * @param {string} selector
 * @returns {Element[]}
 */
export function ownElements(fr, selector) {
  let all = [...fr.querySelectorAll(selector)];
  return all.filter((el) => {
    let parent = el.parentElement;
    while (parent && parent !== fr) {
      if (parent.localName?.includes('-') && parent.getAttribute('process-inner-html') !== 'false') return false;
      parent = parent.parentElement;
    }
    return true;
  });
}

/**
 * Check if a node belongs to `root` and not to a nested custom element.
 * @param {Node} node
 * @param {Element | DocumentFragment} root
 * @returns {boolean}
 */
export function isOwnNode(node, root) {
  let parent = node.parentElement;
  while (parent && parent !== root) {
    if (parent.localName?.includes('-') && parent.getAttribute('process-inner-html') !== 'false') return false;
    parent = parent.parentElement;
  }
  return true;
}
