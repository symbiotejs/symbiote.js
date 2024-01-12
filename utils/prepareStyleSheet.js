 /** @param {String | CSSStyleSheet} styles */
export function prepareStyleSheet(styles) {
  let styleSheet;
  if (styles.constructor === CSSStyleSheet) {
    styleSheet = styles;
  } else if (styles.constructor === String) {
    styleSheet = new CSSStyleSheet();
    styleSheet.replaceSync(styles);
  }
  return styleSheet;
}