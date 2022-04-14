import { createDomBindProcessor } from './create-dom-bind-processor.js';
import { DICT } from '../dictionary.js';

export const domSetProcessor = createDomBindProcessor(DICT.BIND_ATTR);
