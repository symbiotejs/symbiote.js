const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const ESCAPED_PATTERN = /\\([0-9a-fA-F]{1,6} ?)/g;
const JSON_QUOTES_PATTERN = /(?<!\\)("|\\")/g;

/**
 * @param {String} str
 * @returns {Boolean}
 */
function hasLeadingTrailingQuotes(str) {
  return (str[0] === DOUBLE_QUOTE || str[0] === SINGLE_QUOTE) && (str[str.length - 1] === DOUBLE_QUOTE || str[str.length - 1] === SINGLE_QUOTE);
}

/**
 * @param {String} str
 * @returns {String}
 */
function trimQuotes(str) {
  if (str[0] === DOUBLE_QUOTE || str[0] === SINGLE_QUOTE) {
    str = str.slice(1);
  }
  if (str[str.length - 1] === DOUBLE_QUOTE || str[str.length - 1] === SINGLE_QUOTE) {
    str = str.slice(0, -1);
  }
  return str;
}

/**
 * @param {String} input
 * @returns {String}
 */
export function parseCssPropertyValue(input) {
  let output = input;

  if (hasLeadingTrailingQuotes(input)) {
    output = trimQuotes(output);

    // Unescape CSS unicode sequences
    // esbuild (and other bundlers) escapes unicode characters in CSS
    // Firefox doesn't unescape them, WebKit browsers do
    // see format here https://www.w3.org/International/questions/qa-escapes#nutshell
    output = output.replace(ESCAPED_PATTERN, (match, p1) => {
      return String.fromCodePoint(parseInt(p1.trim(), 16));
    });

    // Replace escaped CSS new-line separators with JSON escaped ones
    // WebKit browsers do that automatically, Firefox doesn't
    // see format here https://www.w3.org/TR/CSS22/syndata.html#strings
    output = output.replaceAll('\\\n', '\\n');

    // Escape quotes
    // WebKit browsers escapes them, Firefox doesn't
    output = output.replaceAll(JSON_QUOTES_PATTERN, '\\"');

    // wrap output with trailing and leading double quotes to match JSON spec
    output = DOUBLE_QUOTE + output + DOUBLE_QUOTE;
  }

  return JSON.parse(output);
}
