export class SymContext extends BaseClass {
    contextData: ContextData;
    requests: ContextRequests;
    attributeChangedCallback(name: string, previous: string | null, value: string | null): void;
    watchData(key: string): void;
    publishData(key: string, value: unknown): void;
    mergeSource(data: Record<string, unknown>): void;
    #private;
}
export default SymContext;
import BaseClass from './BaseClass.js';
import { ContextData } from './context-data.js';
import { ContextRequests } from './context-requests.js';
//# sourceMappingURL=sym-context.d.ts.map