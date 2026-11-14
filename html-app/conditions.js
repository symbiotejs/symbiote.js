let behaviors = Object.freeze({
  show: {
    dom: false,
    inverse: false,
  },
  hide: {
    dom: false,
    inverse: true,
  },
  'dom-add': {
    dom: true,
    inverse: false,
  },
  'dom-remove': {
    dom: true,
    inverse: true,
  },
});

/**
 * Conditions compare data values, never expressions.
 * @param {unknown} value
 * @param {string | null} expected
 * @param {string} behavior
 * @param {string | null} type
 */
export function conditionState(value, expected, behavior = 'show', type = null) {
  let mode = Object.hasOwn(behaviors, behavior) ? behaviors[behavior] : undefined;
  if (!mode) {
    throw new TypeError('Conditional behavior must be show, hide, dom-add or dom-remove.');
  }
  if (type !== null && (type !== 'string' || expected === null)) {
    throw new TypeError('is-type supports string with an explicit is value.');
  }
  let match = expected === null ? !!value
    : Object.is(value, type === 'string' ? expected
      : expected === 'true' ? true : expected === 'false' ? false : expected);
  return {
    visible: mode.inverse ? !match : match,
    dom: mode.dom,
  };
}
