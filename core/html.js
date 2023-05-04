/** @typedef {Record<keyof import('./BaseComponent.js').BaseComponent, String>} BindDescriptor */

/**
 * @param {TemplateStringsArray} strings
 * @param {(Object<string, String> | Partial<BindDescriptor>)[]} props
 * @returns {any}
 */
export function html(strings, ...props) {
  let resultHtml = '';
  strings.forEach((part, idx) => {
    resultHtml += part;
    if (props[idx]?.constructor === Object) {
      let bindStr = '';
      for (let key in props[idx]) {
        bindStr += `${key}:${props[idx][key]};`;
      }
      resultHtml += ` bind="${bindStr}" `;
    } else if (props[idx]) {
      resultHtml += props[idx];
    }
  });
  return resultHtml;
}

export default html;
