import { createDomBindProcessor } from './create-dom-bind-processor.js';
import { DICT } from '../dictionary.js';

export const domRepeatSetProcessor = createDomBindProcessor(DICT.REPEAT_BIND_ATTR);
