const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const ESCAPED_PATTERN = /\\([0-9a-fA-F]{1,6} ?)/g;

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
 * @param {String} str
 * @returns {String}
 */
function escapeQuotes(str) {
  let result = '';
  let prev = '';
  for (var i = 0; i < str.length; i++) {
    const next = str[i + 1];
    if (str[i] === '\\' && next === '"') {
      result += '\\"';
      i++;
    } else if (str[i] === '"' && prev !== '\\') {
      result += '\\"';
    } else {
      result += str[i];
    }
    prev = str[i];
  }
  return result;
}

/**
 * @param {String} input
 * @returns {String | Number}
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
    output = escapeQuotes(output);

    // wrap output with trailing and leading double quotes to match JSON spec
    output = DOUBLE_QUOTE + output + DOUBLE_QUOTE;
  }

  try {
    return JSON.parse(output);
  } catch (err) {
    throw new Error(`Failed to parse CSS property value: ${output}. Original input: ${input}`);
  }
}
