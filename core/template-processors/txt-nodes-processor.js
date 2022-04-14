const OPEN_TOKEN = '{{';
const CLOSE_TOKEN = '}}';
const SKIP_ATTR = 'skip-text';

function getTextNodesWithTokens(el) {
  let node;
  let result = [];
  let walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (txt) => {
      return !txt.parentElement?.hasAttribute(SKIP_ATTR) && txt.textContent.includes(OPEN_TOKEN) && txt.textContent.includes(CLOSE_TOKEN) && 1;
    },
  });
  while ((node = walk.nextNode())) {
    result.push(node);
  }
  return result;
}

/** @type {import('./typedef.js').TplProcessor} */
export const txtNodesProcessor = (fr, fnCtx) => {
  let txtNodes = getTextNodesWithTokens(fr);
  txtNodes.forEach((/** @type {Text} */ txtNode) => {
    let tokenNodes = [];
    let offset;
    // Splitting of the text node:
    while (txtNode.textContent.includes(CLOSE_TOKEN)) {
      if (txtNode.textContent.startsWith(OPEN_TOKEN)) {
        offset = txtNode.textContent.indexOf(CLOSE_TOKEN) + CLOSE_TOKEN.length;
        txtNode.splitText(offset);
        tokenNodes.push(txtNode);
      } else {
        offset = txtNode.textContent.indexOf(OPEN_TOKEN);
        txtNode.splitText(offset);
      }
      // @ts-ignore
      txtNode = txtNode.nextSibling;
    }
    tokenNodes.forEach((tNode) => {
      let prop = tNode.textContent.replace(OPEN_TOKEN, '').replace(CLOSE_TOKEN, '');
      fnCtx.sub(prop, (val) => {
        tNode.textContent = /** @type {String} */ (val);
      });
    });
  });
};
