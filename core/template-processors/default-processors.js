import { domSetProcessor, refProcessor, repeatProcessor, slotProcessor, txtNodesProcessor } from './index.js';

export const DEFAULT_PROCESSORS = [slotProcessor, refProcessor, repeatProcessor, domSetProcessor, txtNodesProcessor];
