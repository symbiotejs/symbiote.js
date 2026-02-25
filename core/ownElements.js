/**
 * querySelectorAll scoped to own elements only.
 * During ssrMode hydration, `fr` is the component itself (an HTMLElement).
 * querySelectorAll matches ALL descendants, including those inside child components.
 * This helper excludes elements whose closest custom-element ancestor is not `fr`.
 * @param {Element | DocumentFragment} fr
 * @param {string} selector
 * @returns {Element[]}
 */
export function ownElements(fr, selector) {
  let all = [...fr.querySelectorAll(selector)];
  if (!(fr instanceof HTMLElement) || !fr.localName?.includes('-')) {
    return all;
  }
  return all.filter((el) => {
    let parent = el.parentElement;
    while (parent && parent !== fr) {
      if (parent.localName?.includes('-')) return false;
      parent = parent.parentElement;
    }
    return true;
  });
}

/**
 * Check if a node belongs to `root` and not to a nested custom element.
 * @param {Node} node
 * @param {Element} root
 * @returns {boolean}
 */
export function isOwnNode(node, root) {
  let parent = node.parentElement;
  while (parent && parent !== root) {
    if (parent.localName?.includes('-')) return false;
    parent = parent.parentElement;
  }
  return true;
}
