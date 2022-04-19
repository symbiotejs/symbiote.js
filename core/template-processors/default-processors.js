import { domSetProcessor, refProcessor, slotProcessor, txtNodesProcessor } from './index.js';

export const defaultProcessors = [slotProcessor, refProcessor, domSetProcessor, txtNodesProcessor];
