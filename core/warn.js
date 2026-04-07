/** @type {{ devMode: boolean, hintShown: boolean }} */
export let devState = {
  get devMode() {
    return !!globalThis.__SYMBIOTE_DEV_MODE;
  },
  set devMode(val) {
    globalThis.__SYMBIOTE_DEV_MODE = val;
  },
  hintShown: false,
};

/** @type {Record<number, string>} */
let CRITICAL = {
  8: 'Tag already registered with different class',
  9: 'CSS data parse error',
  16: 'Itemize data must be Array or Object',
};

/** @param {string} type @param {number} code */
function _log(type, code) {
  let msg = CRITICAL[code];
  if (!msg) return;
  let prefix = type === 'error' ? 'E' : 'W';
  console[type](`[Symbiote ${prefix}${code}] ${msg}`);
  if (!devState.hintShown) {
    devState.hintShown = true;
    console[type]('Import \'@symbiotejs/symbiote/core/devMessages.js\' for detailed messages.');
  }
}

/**
 * @param {number} code
 * @param  {...any} args
 */
export function warnMsg(code, ...args) {
  (globalThis.__SYMBIOTE_DEV_LOG || _log)('warn', code, args);
}

/**
 * @param {number} code
 * @param  {...any} args
 */
export function errMsg(code, ...args) {
  (globalThis.__SYMBIOTE_DEV_LOG || _log)('error', code, args);
}
