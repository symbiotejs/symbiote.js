export function parseProp<T extends import("./Symbiote.js").Symbiote<any>>(prop: string, fnCtx: T): ParsedProp | null;
export default parseProp;
export type ParsedProp = {
    ctx: PubSub<any>;
    name: string;
    scope: "local" | "parent" | "shared" | "named" | "css-data";
    ctxName?: string;
    owner?: any;
};
import PubSub from './PubSub.js';
//# sourceMappingURL=parseProp.d.ts.map