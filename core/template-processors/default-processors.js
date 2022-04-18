import { domSetProcessor, refProcessor, repeatProcessor, slotProcessor, txtNodesProcessor } from './index.js';

export const DEFAULT_PROCESSORS = [
  /** It's better to add `repeatProcessor` before other processors to prevent their execution on the repeat template. */
  repeatProcessor,
  slotProcessor,
  refProcessor,
  domSetProcessor,
  txtNodesProcessor,
];
