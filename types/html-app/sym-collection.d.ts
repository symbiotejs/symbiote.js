export class SymCollection extends BaseClass {
    init$: {
        items: any[];
        count: number;
        totalCount: number;
        empty: boolean;
    };
    attributeChangedCallback(name: string, previous: string | null, value: string | null): void;
    source(): import("../core/parseProp.js").ParsedProp;
    bindSource(): void;
    project(): void;
    #private;
}
export default SymCollection;
import BaseClass from './BaseClass.js';
//# sourceMappingURL=sym-collection.d.ts.map