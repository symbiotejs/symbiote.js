import { ownElements } from '../core/ownElements.js';
import { itemizeProcessor } from '../core/itemizeProcessor-keyed.js';
import { DICT } from '../core/dictionary.js';

/** @type {WeakMap<Element, import('./sym-collection.js').SymCollection>} */
let containers = new WeakMap();

/**
 * Associate only this controller's own Itemize containers with its source.
 * @param {Element | DocumentFragment} root
 * @param {import('./sym-collection.js').SymCollection} owner
 */
export function collectionItemsProcessor(root, owner) {
  for (let element of ownElements(root, '[itemize]')) {
    let reference = owner.Symbiote.parseProp(element.getAttribute('itemize'), owner);
    if (reference?.ctx === owner.localCtx && reference.name === 'items') {
      containers.set(element, owner);
    }
  }
  itemizeProcessor(/** @type {DocumentFragment} */ (root), owner);
}

/** @param {Element} owner */
export function findCollectionItem(owner) {
  let item = owner;
  while (item) {
    let collection = containers.get(item.parentElement);
    if (collection) {
      if (!collection.isConnected) {
        break;
      }
      let id = Reflect.get(item, DICT.MCP_ITEM_KEY_KEY);
      if (typeof id !== 'string') {
        break;
      }
      return {
        collection,
        item,
        id,
      };
    }
    item = item.parentElement;
  }
  throw new TypeError('Item actions require an item in a sym-collection view.');
}
