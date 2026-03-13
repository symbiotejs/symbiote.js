globalThis.__SYMBIOTE_DEV_MODE = true;

let isBrowser = !globalThis.process;

// CSS styles for browser console
let S = {
  badge: 'background:#7c3aed;color:#fff;border-radius:3px;padding:1px 4px;font-weight:bold',
  code: 'background:#f59e0b;color:#000;border-radius:3px;padding:1px 4px;font-weight:bold',
  errCode: 'background:#ef4444;color:#fff;border-radius:3px;padding:1px 4px;font-weight:bold',
  tag: 'color:#7c3aed;font-weight:bold',
  dim: 'color:#888',
  reset: 'color:inherit',
};

let DOCS = 'https://github.com/symbiotejs/symbiote.js/blob/main/docs/';

/**
 * @param {string} code - e.g. 'W1' or 'E15'
 * @param {string} body - message body
 * @param {string} doc - doc page name
 * @param {string} [tag] - component tag name
 */
function fmt(code, body, doc, tag) {
  if (!isBrowser) {
    return `[Symbiote ${code}]${tag ? ` <${tag}>:` : ''} ${body}\n→ ${DOCS}${doc}.md`;
  }
  let isErr = code.startsWith('E');
  let parts = `%c Symbiote %c ${code} %c`;
  let styles = [S.badge, isErr ? S.errCode : S.code, S.reset];
  if (tag) {
    parts += ` %c<${tag}>%c`;
    styles.push(S.tag, S.reset);
  }
  parts += ` ${body}\n%c→ ${DOCS}${doc}.md`;
  styles.push(S.dim);
  return [parts, ...styles];
}

/** @type {Map<number, (...args: any[]) => (string | any[])>} */
let messages = new Map([
  // PubSub
  [1, (uid, action, prop) =>
    fmt('W1', `PubSub (${uid}): cannot ${action}. Property: "${prop}"`, 'pubsub')],
  [2, (uid, prop, prevType, newType, prev, next) =>
    fmt('W2', `PubSub (${uid}): type change for "${prop}" [${prevType} → ${newType}]. Previous: ${prev} | New: ${next}`, 'pubsub')],
  [3, (uid) =>
    fmt('W3', `PubSub: context "${uid}" is already registered. Returning existing instance.`, 'context')],
  [4, (uid, keys) =>
    fmt('W4', `PubSub: context "${uid}" not found. Available: [${keys}]`, 'context')],

  // Symbiote
  [5, (localName, selector) =>
    fmt('W5', `custom template "${selector}" not found.`, 'templates', localName)],
  [6, (localName, sharedName) =>
    fmt('W6', `uses *${sharedName} without ctx attribute or --ctx CSS variable. Set ctx="name" or --ctx to share state.`, 'context', localName)],
  [7, (localName, sharedName) =>
    fmt('W7', `shared prop "${sharedName}" already has value. Keeping existing.`, 'context', localName)],
  [8, (tagName, existingClass, newClass) =>
    fmt('W8', `already registered (class: ${existingClass}). Re-registration with "${newClass}" — skipped.`, 'get-started', tagName)],
  [9, (localName, propName) =>
    fmt('W9', `CSS data parse error for "${propName}". Check that the CSS custom property is defined.`, 'css-data', localName)],
  [10, (localName, propName) =>
    fmt('W10', `CSS data binding "${propName}" will not read computed styles during SSR. The init value will be used instead.`, 'css-data', localName)],

  // tpl-processors
  [11, (localName, valKey, knownKeys) =>
    fmt('W11', `binding key "${valKey}" not found in init$ (auto-initialized to null). Known keys: [${knownKeys}]`, 'properties', localName)],
  [12, (localName, prop) =>
    fmt('W12', `text-node binding "{{${prop}}}" has no hydration attribute. `
      + 'In ssrMode/isoMode it will be rendered by the server but won\'t update on the client. '
      + 'Use property binding (${{textContent: \'' + prop + '\'}}) for hydratable text.', 'ssr', localName)],

  // AppRouter
  [13, (msg) =>
    fmt('W13', msg, 'routing')],
  [14, () =>
    fmt('W14', 'History API is not available.', 'routing')],

  // html
  [15, (val) =>
    fmt('E15', `\`this\` used in template interpolation (value: ${val}). `
      + 'Templates are context-free — use ${{ prop: \'stateKey\' }} binding syntax instead.', 'templates')],

  // itemizeProcessor
  [16, (localName, dataType, data) =>
    fmt('W16', `itemize data must be Array or Object, got ${dataType}: ${data}`, 'list-rendering', localName)],
]);

/**
 * @param {'warn' | 'error'} type
 * @param {number} code
 * @param {any[]} args
 */
globalThis.__SYMBIOTE_DEV_LOG = (type, code, args) => {
  let formatter = messages.get(code);
  if (formatter) {
    let result = formatter(...args);
    Array.isArray(result) ? console[type](...result) : console[type](result);
  } else {
    console[type](`[Symbiote ${type === 'error' ? 'E' : 'W'}${code}]`);
  }
};
