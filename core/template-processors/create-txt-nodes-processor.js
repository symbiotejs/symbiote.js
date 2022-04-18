const OPEN_TOKEN = '{{';
const CLOSE_TOKEN = '}}';
const SKIP_ATTR = 'skip-text';

/**
 * @param {Element | DocumentFragment} el
 * @returns {Text[]}
 */
function getTextNodesWithTokens(el) {
  let node;
  let result = [];
  let walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (txt) => {
      return !txt.parentElement?.hasAttribute(SKIP_ATTR) && txt.textContent.includes(OPEN_TOKEN) && txt.textContent.includes(CLOSE_TOKEN) && 1;
    },
  });
  while ((node = walk.nextNode())) {
    result.push(/** @type {Text} */ (node));
  }
  return result;
}

/** @returns {import('./typedef.js').TplProcessor} */
export const createTxtNodesProcessor = (createSub, removeSub) => {
  return (fr, fnCtx) => {
    let sub = createSub(fnCtx);

    let txtNodes = getTextNodesWithTokens(fr);
    let tokenNodes = new Set();
    for (let txtNode of txtNodes) {
      let offset;
      // Splitting of the text node:
      while (txtNode.textContent.includes(CLOSE_TOKEN)) {
        if (txtNode.textContent.startsWith(OPEN_TOKEN)) {
          offset = txtNode.textContent.indexOf(CLOSE_TOKEN) + CLOSE_TOKEN.length;
          txtNode.splitText(offset);
          tokenNodes.add(txtNode);
        } else {
          offset = txtNode.textContent.indexOf(OPEN_TOKEN);
          txtNode.splitText(offset);
        }
        // @ts-ignore
        txtNode = txtNode.nextSibling;
      }
    }

    for (let tNode of tokenNodes) {
      let prop = tNode.textContent.replace(OPEN_TOKEN, '').replace(CLOSE_TOKEN, '');
      sub(prop, (val) => {
        tNode.textContent = /** @type {String} */ (val);
      });
    }

    return removeSub(fnCtx);
  };
};
