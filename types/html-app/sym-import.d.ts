export class SymImport extends BaseClass {
    attributeChangedCallback(name: string, previous: string | null, value: string | null): void;
    status(loading: boolean, error?: {
        operation: string;
        code: string;
        message: string;
        status: number | null;
    } | null): void;
    cancel(): void;
    schedule(): void;
    mount(fragment: DocumentFragment, source?: ReturnType<typeof importSource>): void;
    unmount(): void;
    load(): Promise<void>;
    #private;
}
export default SymImport;
import BaseClass from './BaseClass.js';
import { importSource } from './fragment-source.js';
//# sourceMappingURL=sym-import.d.ts.map