import { createTxtNodesProcessor } from './create-txt-nodes-processor.js';

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

// TODO: skip repeat- attributes
export const repeatTxtNodesProcessor = createTxtNodesProcessor(createSub, removeSub);
