export class BaseClass extends Symbiote<any> {
    constructor();
    get Symbiote(): typeof BaseClass;
    connectFoundation(): void;
    seedDefaults(): void;
    prepare(): void;
    authoredContent(): DocumentFragment;
    #private;
}
export namespace BaseClass {
    let rootStyles: CSSStyleSheet;
}
export default BaseClass;
import Symbiote from '../core/Symbiote.js';
//# sourceMappingURL=BaseClass.d.ts.map