import { DICT } from './dictionary.js';
import { warnMsg, devState } from './warn.js';
import { setNestedProp } from '../utils/setNestedProp.js';
import { ownElements, isOwnNode } from './ownElements.js';
import { initPropFallback } from './initPropFallback.js';
import { parseProp } from './parseProp.js';

// Should go first among other processors:
import { itemizeProcessor } from './itemizeProcessor.js';

export { initPropFallback };

/**
 * @typedef {Object} MCPEventBinding
 * @property {string} prop
 * @property {string} key
 * @property {Element} el
 * @property {string} [sourceKey]
 * @property {import('./Symbiote.js').Symbiote} [sourceOwner]
 */

/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {T} fnCtx
 * @returns {boolean}
 */
function mcpToolMode(fnCtx) {
  return !!(fnCtx.mcpToolMode || /** @type {any} */ (fnCtx.constructor)?.mcpToolMode);
}

/**
 * @param {any} val
 * @returns {boolean}
 */
function isToolDescriptor(val) {
  return !!val?.[DICT.MCP_TOOL_DESCRIPTOR_MARKER];
}

/**
 * @param {import('./Symbiote.js').Symbiote} owner
 * @param {MCPEventBinding} entry
 */
function addMcpEventHandler(owner, entry) {
  if (!owner[DICT.MCP_EVENTS_KEY]) {
    owner[DICT.MCP_EVENTS_KEY] = [];
  }
  let exists = owner[DICT.MCP_EVENTS_KEY].some((item) => {
    return item.prop === entry.prop && item.key === entry.key && item.el === entry.el
      && item.sourceOwner === entry.sourceOwner;
  });
  if (!exists) {
    owner[DICT.MCP_EVENTS_KEY].push(entry);
  }
}

/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {T} fnCtx
 * @param {string} prop
 * @param {string} valKey
 * @param {Element} el
 */
function collectMcpEventHandler(fnCtx, prop, valKey, el) {
  if (!mcpToolMode(fnCtx) && !isToolDescriptor(fnCtx.$?.[valKey])) {
    return;
  }
  if (!prop.startsWith('on')) {
    return;
  }
  addMcpEventHandler(fnCtx, {
    prop,
    key: valKey,
    el,
  });
  if (valKey.startsWith(DICT.PARENT_CTX_PX)) {
    let parsed = parseProp(valKey, fnCtx);
    let key = parsed?.name || valKey.slice(DICT.PARENT_CTX_PX.length);
    let targetOwner = parsed?.scope === 'parent' && parsed.owner !== fnCtx
      ? parsed.owner
      : null;
    if (targetOwner && mcpToolMode(targetOwner)) {
      addMcpEventHandler(targetOwner, {
        prop,
        key,
        el,
        sourceKey: valKey,
        sourceOwner: fnCtx,
      });
      if (!fnCtx[DICT.MCP_EVENT_TARGET_OWNERS_KEY]) {
        fnCtx[DICT.MCP_EVENT_TARGET_OWNERS_KEY] = new Set();
      }
      fnCtx[DICT.MCP_EVENT_TARGET_OWNERS_KEY].add(targetOwner);
      targetOwner.syncWebMCPTools?.();
    }
  }
}


/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
function refProcessor(fr, fnCtx) {
  ownElements(fr, `[${DICT.EL_REF_ATTR}]`).forEach((/** @type {HTMLElement} */ el) => {
    let refName = el.getAttribute(DICT.EL_REF_ATTR);
    fnCtx.ref[refName] = el;
    if (!globalThis.__SYMBIOTE_SSR) {
      el.removeAttribute(DICT.EL_REF_ATTR);
    }
  });
}

/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
function domBindProcessor(fr, fnCtx) {
  ownElements(fr, `[${DICT.BIND_ATTR}]`).forEach((el) => {
    let subStr = el.getAttribute(DICT.BIND_ATTR);
    let keyValArr = subStr.split(';');
    keyValArr.forEach((keyValStr) => {
      if (!keyValStr) {
        return;
      }
      let kv = keyValStr.split(':').map((str) => str.trim());
      let prop = kv[0];
      let isAttr;

      if (prop.indexOf(DICT.ATTR_BIND_PX) === 0) {
        isAttr = true;
        prop = prop.replace(DICT.ATTR_BIND_PX, '');
      }
      /** @type {String[]} */
      let valKeysArr = kv[1].split(',').map((valKey) => {
        return valKey.trim();
      });
      for (let valKey of valKeysArr) {
        /** @type {'single' | 'double'} */
        let castType;
        if (valKey.startsWith('!!')) {
          castType = 'double';
          valKey = valKey.replace('!!', '');
        } else if (valKey.startsWith('!')) {
          castType = 'single';
          valKey = valKey.replace('!', '');
        }
        if (!fnCtx.has(valKey) && fnCtx.allowTemplateInits) {
          initPropFallback(fnCtx, valKey);
          // Dev-only: warn about bindings that aren't in init$ (likely typos)
          if (fnCtx.localCtx.read(valKey) === null && devState.devMode) {
            let known = Object.keys(fnCtx.init$).filter((k) => !k.startsWith('+'));
            warnMsg(11, fnCtx.localName, valKey, known.join(', '));
          }
        }
        collectMcpEventHandler(fnCtx, prop, valKey, el);
        let initVal = fnCtx.$[valKey];
        let skipInit = fnCtx.ssrMode && !globalThis.__SYMBIOTE_SSR
          && (isAttr || (typeof initVal !== 'function' && (initVal === null || typeof initVal !== 'object')));
        fnCtx.sub(valKey, (val) => {
          if (!isAttr && prop.startsWith('on') && isToolDescriptor(val)) {
            let descriptor = val;
            val = (event) => descriptor.execute({}, fnCtx, event);
          }
          if (castType === 'double') {
            val = !!val;
          } else if (castType === 'single') {
            val = !val;
          }
          if (isAttr) {
            if (val?.constructor === Boolean) {
              val ? el.setAttribute(prop, '') : el.removeAttribute(prop);
            } else {
              el.setAttribute(prop, val);
            }
          } else {
            if (!setNestedProp(el, prop, val)) {
              // Custom element instances are not constructed properly at this moment, so:
              if (!el[DICT.SET_LATER_KEY]) {
                el[DICT.SET_LATER_KEY] = Object.create(null);
              }
              el[DICT.SET_LATER_KEY][prop] = val;
            }
          }
        }, !skipInit);
      }
    });
    if (!globalThis.__SYMBIOTE_SSR && !mcpToolMode(fnCtx)) {
      el.removeAttribute(DICT.BIND_ATTR);
    }
  });
}

function getTextNodesWithTokens(el) {
  let isCustomEl = el instanceof HTMLElement && el.localName?.includes('-');
  let node;
  let result = [];
  let acceptNode = (txt) => {
    if (isCustomEl && !isOwnNode(txt, el)) return NodeFilter.FILTER_REJECT;
    return !txt.parentElement?.hasAttribute(DICT.TEXT_NODE_SKIP_ATTR)
      && txt.textContent.includes(DICT.TEXT_NODE_OPEN_TOKEN)
      && txt.textContent.includes(DICT.TEXT_NODE_CLOSE_TOKEN)
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_REJECT;
  };
  let walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, acceptNode);
  if (globalThis.__SYMBIOTE_SSR) {
    while ((node = walk.nextNode())) {
      if (acceptNode(node) === NodeFilter.FILTER_ACCEPT) {
        result.push(node);
      }
    }
  } else {
    while ((node = walk.nextNode())) {
      result.push(node);
    }
  }
  return result;
}

/**
 * @template {import('./Symbiote.js').Symbiote} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
const txtNodesProcessor = function (fr, fnCtx) {
  // Skip TreeWalker entirely if no {{ tokens in the fragment
  if (!fr.textContent?.includes(DICT.TEXT_NODE_OPEN_TOKEN)) {
    return;
  }
  let txtNodes = getTextNodesWithTokens(fr);
  txtNodes.forEach((/** @type {Text} */ txtNode) => {
    let tokenNodes = [];
    let offset;
    // Splitting of the text node:
    while (txtNode.textContent.includes(DICT.TEXT_NODE_CLOSE_TOKEN)) {
      if (txtNode.textContent.startsWith(DICT.TEXT_NODE_OPEN_TOKEN)) {
        offset = txtNode.textContent.indexOf(DICT.TEXT_NODE_CLOSE_TOKEN) + DICT.TEXT_NODE_CLOSE_TOKEN.length;
        txtNode.splitText(offset);
        tokenNodes.push(txtNode);
      } else {
        offset = txtNode.textContent.indexOf(DICT.TEXT_NODE_OPEN_TOKEN);
        txtNode.splitText(offset);
      }
      // @ts-expect-error
      txtNode = txtNode.nextSibling;
    }
    tokenNodes.forEach((tNode) => {
      let prop = tNode.textContent.replace(DICT.TEXT_NODE_OPEN_TOKEN, '').replace(DICT.TEXT_NODE_CLOSE_TOKEN, '');
      tNode.textContent = '';
      if (!fnCtx.has(prop) && fnCtx.allowTemplateInits) {
        initPropFallback(fnCtx, prop);
      }
      if (devState.devMode && (fnCtx.ssrMode || fnCtx.isoMode)) {
        warnMsg(12, fnCtx.localName, prop);
      }
      fnCtx.sub(prop, (val) => {
        tNode.textContent = val;
      });
    });
  });
};

export default [itemizeProcessor, refProcessor, domBindProcessor, txtNodesProcessor];
