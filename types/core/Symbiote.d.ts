export { html } from "./html.js";
export { css } from "./css.js";
export class Symbiote<S> extends HTMLElement {
    static __tpl: HTMLTemplateElement;
    static template: string;
    static "__#2@#parseProp"<T_3 extends Symbiote<any>>(prop: string, fnCtx: T_3): {
        ctx: PubSub<any>;
        name: string;
    };
    static reg(tagName?: string, isAlias?: boolean): void;
    static get is(): string;
    static bindAttributes(desc: {
        [x: string]: string;
    }): void;
    static addRootStyles(styles: string | CSSStyleSheet): void;
    static addShadowStyles(styles: string | CSSStyleSheet): void;
    static set rootStyles(arg: string | CSSStyleSheet);
    static set shadowStyles(arg: string | CSSStyleSheet);
    constructor();
    get Symbiote(): typeof Symbiote;
    initCallback(): void;
    renderCallback(): void;
    render(template?: string | DocumentFragment, shadow?: boolean): void;
    addTemplateProcessor<T extends Symbiote<any>>(processorFn: (fr: DocumentFragment | T, fnCtx: T) => void): void;
    init$: S;
    cssInit$: {
        [x: string]: any;
    };
    tplProcessors: Set<(fr: DocumentFragment | Symbiote<any>, fnCtx: unknown) => void>;
    ref: {
        [x: string]: any;
    };
    allSubs: Set<any>;
    pauseRender: boolean;
    renderShadow: boolean;
    readyToDestroy: boolean;
    processInnerHtml: boolean;
    ssrMode: boolean;
    allowCustomTemplate: boolean;
    ctxOwner: boolean;
    isVirtual: boolean;
    get autoCtxName(): string;
    get cssCtxName(): string;
    get ctxName(): string;
    get localCtx(): PubSub<any>;
    get sharedCtx(): PubSub<any>;
    sub<T_1 extends keyof S>(prop: T_1, handler: (value: S[T_1]) => void, init?: boolean): void;
    notify(prop: string): void;
    has(prop: string): any;
    add<T_2 extends keyof S>(prop: string, val: S[T_2], rewrite?: boolean): void;
    add$(obj: Partial<S>, rewrite?: boolean): void;
    get $(): S;
    set$(kvObj: Partial<S>, forcePrimitives?: boolean): void;
    initChildren: ChildNode[];
    connectedOnce: boolean;
    connectedCallback(): void;
    destroyCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: any, oldVal: any, newVal: any): void;
    getCssData(propName: string, silentCheck?: boolean): any;
    updateCssData: () => void;
    bindCssData(propName: string, initValue?: any): void;
    dropCssDataCache(): void;
    defineAccessor(propName: string, handler?: Function, isAsync?: boolean): void;
    #private;
}
export default Symbiote;
import { UID } from '../utils/UID.js';
import PubSub from './PubSub.js';
export { UID, PubSub };
//# sourceMappingURL=Symbiote.d.ts.map