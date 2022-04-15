import { createTxtNodesProcessor } from './create-txt-nodes-processor.js';
import { staticSubManager } from './sub-managers.js';

const { createSub, removeSub } = staticSubManager();

export const txtNodesProcessor = createTxtNodesProcessor(createSub, removeSub);
