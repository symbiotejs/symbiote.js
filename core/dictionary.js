/** @enum {String} */
export const DICT = Object.freeze({
  // Template data binding attribute:
  BIND_ATTR: 'set',
  // Local state binding attribute name:
  ATTR_BIND_PRFX: '@',
  // External prop prefix:
  EXT_DATA_CTX_PRFX: '*',
  // Named data context property splitter:
  NAMED_DATA_CTX_SPLTR: '/',
  // Data context name attribute:
  CTX_NAME_ATTR: 'ctx-name',
  // Data context name in CSS custom property:
  CSS_CTX_PROP: '--ctx-name',
  // Element reference attribute:
  EL_REF_ATTR: 'ref',
  // Prefix for auto generated tag names:
  AUTO_TAG_PRFX: 'sym',

  REPEAT_ITEMS_ATTR: 'repeat-items',
  REPEAT_KEY_ATTR: 'repeat-key',
  REPEAT_BIND_ATTR: 'repeat-set',
});
