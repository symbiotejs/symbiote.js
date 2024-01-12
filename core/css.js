/**
 * @param {TemplateStringsArray} parts
 * @returns {CSSStyleSheet}
 */

export function css(parts, ...props) {
  let cssTxt = '';
  let sheet = new CSSStyleSheet();
  parts.forEach((part, idx) => {
    cssTxt += part + props[idx];
  });
  css.processors.forEach((prFn) => {
    cssTxt = prFn(cssTxt);
  });
  css.clearProcessors();
  sheet.replaceSync(cssTxt);
  return sheet;
}

/** @type {((cssTxt: string) => String)[]} */
css.processors = [];

css.clearProcessors = function() {
  css.processors = [];
}

/**
 * 
 * @param  {...(cssTxt: string) => String} args 
 */
css.useProcessor = function(...args) {
  css.processors = [...css.processors, ...args];
  return css;
};