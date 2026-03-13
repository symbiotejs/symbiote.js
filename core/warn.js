/** @type {{ devMode: boolean }} */
export let devState = {
  get devMode() {
    return !!globalThis.__SYMBIOTE_DEV_MODE;
  },
  set devMode(val) {
    globalThis.__SYMBIOTE_DEV_MODE = val;
  },
};

/** @param {string} type @param {number} code */
function _log(type, code) {
  console[type](`[Symbiote ${type === 'error' ? 'E' : 'W'}${code}]`);
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
