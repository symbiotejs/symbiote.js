/**
 * @param {TemplateStringsArray} parts
 * @returns {CSSStyleSheet}
 */

export function css(parts, ...props) {
  let css = '';
  let sheet = new CSSStyleSheet();
  parts.forEach((part, idx) => {
    css += part + props[idx];
  });
  sheet.replaceSync(css);
  return sheet;
}