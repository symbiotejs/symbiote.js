export class BaseClass extends Symbiote<any> {
    static observedAttributes: string[];
    constructor();
    actionBindings: ActionBindings;
    outgoingBindings: PubMap;
    get Symbiote(): typeof BaseClass;
    set 'pub-map'(_value: string | null);
    connectFoundation(): void;
    seedDefaults(): void;
    prepare(): void;
    authoredContent(): DocumentFragment;
    set$(values: Record<string, unknown>, force?: boolean): void;
    add$(values: Record<string, unknown>, rewrite?: boolean): void;
    #private;
}
export namespace BaseClass {
    let rootStyles: CSSStyleSheet;
}
export default BaseClass;
import Symbiote from '../core/Symbiote.js';
import { ActionBindings } from './actions.js';
import { PubMap } from './pub-map.js';
//# sourceMappingURL=BaseClass.d.ts.map