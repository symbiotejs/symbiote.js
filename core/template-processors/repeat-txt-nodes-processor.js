import { createTxtNodesProcessor } from './create-txt-nodes-processor.js';
import { repeatSubManager } from './sub-managers.js';

const { createSub, removeSub } = repeatSubManager();

export const repeatTxtNodesProcessor = createTxtNodesProcessor(createSub, removeSub);
