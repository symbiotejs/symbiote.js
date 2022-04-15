import { createDomBindProcessor } from './create-dom-bind-processor.js';
import { DICT } from '../dictionary.js';
import { repeatSubManager } from './sub-managers.js';

const { createSub, removeSub } = repeatSubManager();

export const domSetProcessor = createDomBindProcessor(DICT.BIND_ATTR, createSub, removeSub);
