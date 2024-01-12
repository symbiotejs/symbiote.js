/** @enum {String} */
export const DICT = Object.freeze({
  // Template data binding attribute:
  BIND_ATTR: 'bind',
  // Local state binding attribute name:
  ATTR_BIND_PX: '@',
  // Shared prop prefix:
  SHARED_CTX_PX: '*',
  // Inherited parent prop prefix:
  PARENT_CTX_PX: '^',
  // Named data context property splitter:
  NAMED_CTX_SPLTR: '/',
  // Computed property prefix:
  COMPUTED_PX: '+',
  // CSS-data property prefix:
  CSS_DATA_PX: '--',
  // Data context name attribute:
  CTX_NAME_ATTR: 'ctx',
  // Data context owner attribute:
  CTX_OWNER_ATTR: 'ctx-owner',
  // Data context name in CSS custom property:
  CSS_CTX_PROP: '--ctx',
  // Element reference attribute:
  EL_REF_ATTR: 'ref',
  // Prefix for auto generated tag names:
  AUTO_TAG_PX: 'sym',
  // Template list source data attribute:
  LIST_ATTR: 'itemize',
  // List item tag name:
  LIST_ITEM_TAG_ATTR: 'item-tag',
  // Key to restore nested properties was set before component construction:
  SET_LATER_KEY: '__toSetLater__',
  // Attribute to provide selector of custom template:
  USE_TPL_ATTR: 'use-template',
  // Light DOM slots processing key:
  DEFAULT_SLOT_KEY: '__default__',
  // Attribute for text nodes processing skip
  TEXT_NODE_SKIP_ATTR: 'skip-text-nodes',
  // Text node binding token:
  TEXT_NODE_OPEN_TOKEN: '{{',
  // Text node binding token:
  TEXT_NODE_CLOSE_TOKEN: '}}',
});
