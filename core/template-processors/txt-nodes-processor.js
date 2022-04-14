import { createTxtNodesProcessor } from './create-txt-nodes-processor.js';

const createSub = (fnCtx) => {
  return (key, fn) => {
    fnCtx.sub(key, fn);
  };
};

// TODO: skip repeat- attributes
export const txtNodesProcessor = createTxtNodesProcessor(createSub);
