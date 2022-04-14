import { createDomBindProcessor } from './create-dom-bind-processor.js';
import { DICT } from '../dictionary.js';

const createSub = (fnCtx) => {
  return (key, fn) => {
    fnCtx.sub(key, fn);
  };
};

// TODO: skip repeat- attributes
export const domSetProcessor = createDomBindProcessor(DICT.BIND_ATTR, createSub);
