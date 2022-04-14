import { createDomBindProcessor } from './create-dom-bind-processor.js';
import { DICT } from '../dictionary.js';

const removers = new WeakMap();

const createSub = (fnCtx) => {
  return (key, fn) => {
    let { remove } = fnCtx.sub(key, fn);
    if (!removers.has(fnCtx)) {
      removers.set(fnCtx, []);
    }
    removers.get(fnCtx).push(remove);
  };
};

const removeSub = (fnCtx) => {
  return () => {
    if (!removers.has(fnCtx)) {
      return;
    }
    for (let remove of removers.get(fnCtx)) {
      remove();
    }
  };
};

export const domRepeatSetProcessor = createDomBindProcessor(DICT.REPEAT_BIND_ATTR, createSub, removeSub);
