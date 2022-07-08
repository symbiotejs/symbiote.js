/** @param {String} string */
export function kebabToCamel(string) {
  return string
    .split('-')
    .map((p, i) => {
      return p && i ? p[0].toUpperCase() + p.slice(1) : p;
    })
    .join('')
    .split('_')
    .map((p, i) => {
      return p && i ? p.toUpperCase() : p;
    })
    .join('');
}
