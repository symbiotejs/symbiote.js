/**
 * @param {TemplateStringsArray} parts
 * @returns {CSSStyleSheet}
 */

export function css(parts) {
  let sheet = new CSSStyleSheet();
  sheet.replaceSync(parts.join(''));
  return sheet;
}