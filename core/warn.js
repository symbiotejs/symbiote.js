/** @type {Map<number, (...args: any[]) => string>} */
let messages = globalThis.__SYMBIOTE_DEV_MESSAGES || (globalThis.__SYMBIOTE_DEV_MESSAGES = new Map());

/** @type {{ devMode: boolean }} */
export let devState = {
  get devMode() {
    return !!globalThis.__SYMBIOTE_DEV_MODE;
  },
  set devMode(val) {
    globalThis.__SYMBIOTE_DEV_MODE = val;
  },
};

/**
 * @param {number} code
 * @param  {...any} args
 */
export function warnMsg(code, ...args) {
  let fmt = messages.get(code);
  console.warn(fmt ? fmt(...args) : `[Symbiote W${code}]`);
}

/**
 * @param {number} code
 * @param  {...any} args
 */
export function errMsg(code, ...args) {
  let fmt = messages.get(code);
  console.error(fmt ? fmt(...args) : `[Symbiote E${code}]`);
}

/** @param {Map<number, (...args: any[]) => string>} map */
export function registerMessages(map) {
  for (let [code, fmt] of map) {
    messages.set(code, fmt);
  }
}

