const SINGLE_QUOTE = "'";
const DOUTBLE_QUOTE = '"';
const ESCAPED_PATTERN = /\\([0-9a-fA-F]{1,6} ?)/g;
const SINGLE_QUOTES_PATTERN = /^'|'$/g;

/**
 * @param {String} input
 * @returns {Boolean}
 */
function isStringValue(input) {
  return (input.startsWith(SINGLE_QUOTE) && input.endsWith(SINGLE_QUOTE)) || (input.startsWith(DOUTBLE_QUOTE) && input.endsWith(DOUTBLE_QUOTE));
}

/**
 * @param {String} input
 * @returns {String}
 */
export function normalizeCssPropertyValue(input) {
  let output = input;

  if (isStringValue(input)) {
    // replace trailing/leading single quotes with double quotes to match JSON spec
    // because firefox doesn't transform string values into JSON format
    output = output.replace(SINGLE_QUOTES_PATTERN, '"');

    // unescape css unicode sequences
    // see format here https://www.w3.org/International/questions/qa-escapes#nutshell
    // esbuild (and other bundlers) escapes unicode characters in css
    // webkit browsers unescapes them but firefox doesn't
    // so we'll do it
    output = output.replace(ESCAPED_PATTERN, (match, p1) => {
      return String.fromCodePoint(parseInt(p1.trim(), 16));
    });
  }

  return output;
}
