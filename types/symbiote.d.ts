declare module "core/dictionary" {
    export type DICT = string;
    export const DICT: Readonly<{
        BIND_ATTR: "bind";
        ATTR_BIND_PX: "@";
        SHARED_CTX_PX: "*";
        PARENT_CTX_PX: "^";
        NAMED_CTX_SPLTR: "/";
        COMPUTED_PX: "+";
        CTX_NAME_ATTR: "ctx";
        CTX_OWNER_ATTR: "ctx-owner";
        CSS_CTX_PROP: "--ctx";
        EL_REF_ATTR: "ref";
        AUTO_TAG_PX: "sym";
        LIST_ATTR: "itemize";
        LIST_ITEM_TAG_ATTR: "item-tag";
        SET_LATER_KEY: "__toSetLater__";
        USE_TPL_ATTR: "use-template";
        DEFAULT_SLOT_KEY: "__default__";
        TEXT_NODE_SKIP_ATTR: "skip-text-nodes";
        TEXT_NODE_OPEN_TOKEN: "{{";
        TEXT_NODE_CLOSE_TOKEN: "}}";
    }>;
}
declare module "core/PubSub" {
    export class PubSub<T extends Record<string, unknown>> {
        static "__#1@#warn"(actionName: string, prop: any): void;
        static registerCtx<S extends Record<string, unknown>>(schema: S, uid?: string | Symbol): PubSub<S>;
        static deleteCtx(uid: string | Symbol): void;
        static getCtx(uid: string | Symbol, notify?: boolean): PubSub<any>;
        constructor(schema: T);
        store: any;
        callbackMap: Record<keyof T, Set<(val: unknown) => void>>;
        read(prop: keyof T): any;
        __computedSet: Set<any>;
        has(prop: string): any;
        add(prop: string, val: unknown, rewrite?: boolean): void;
        pub(prop: keyof T, val: unknown): void;
        get proxy(): T;
        multiPub(updObj: T): void;
        notify(prop: keyof T): void;
        sub(prop: keyof T, callback: (val: unknown) => void, init?: boolean): {
            remove: () => void;
            callback: (val: unknown) => void;
        };
        #private;
    }
    export namespace PubSub {
        const globalStore: Map<string | Symbol, PubSub<any>>;
    }
    export default PubSub;
}
declare module "utils/UID" {
    export class UID {
        static generate(pattern?: string): string;
    }
}
declare module "utils/setNestedProp" {
    export function setNestedProp(parent: any, path: string, value: any): boolean;
}
declare module "utils/prepareStyleSheet" {
    export function prepareStyleSheet(styles: string | CSSStyleSheet): CSSStyleSheet;
}
declare module "core/itemizeProcessor" {
    export function itemizeProcessor<T extends import("core/Symbiote").Symbiote<any>>(fr: DocumentFragment, fnCtx: T): void;
}
declare module "core/tpl-processors" {
    const _default: (<T extends import("core/Symbiote").Symbiote<any>>(fr: DocumentFragment, fnCtx: T) => void)[];
    export default _default;
}
declare module "utils/parseCssPropertyValue" {
    export function parseCssPropertyValue(input: string): string | number;
}
declare module "core/html" {
    export function html<T>(parts: TemplateStringsArray, ...props: (string | Record<keyof import("core/Symbiote").Symbiote<any>, string> | T | {
        [x: string]: string;
    })[]): string;
    export const RESERVED_ATTRIBUTES: string[];
    export default html;
    export type BindDescriptor = Record<keyof import("core/Symbiote").Symbiote<any>, string>;
}
declare module "core/css" {
    export function css(parts: TemplateStringsArray, ...props: any[]): CSSStyleSheet;
}
declare module "core/Symbiote" {
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
    import { UID } from "utils/UID";
    import PubSub from "core/PubSub";
    export { UID, PubSub };
}
declare module "core/AppRouter" {
    export class AppRouter {
        static "__#3@#print"(msg: any): void;
        static setDefaultTitle(title: string): void;
        static setRoutingMap(map: {
            [x: string]: {};
        }): void;
        static set routingEventName(arg: string);
        static get routingEventName(): string;
        static readAddressBar(): {
            route: any;
            options: {};
        };
        static notify(): void;
        static reflect(route: string, options?: {
            [x: string]: any;
        }): void;
        static applyRoute(route: string, options?: {
            [x: string]: any;
        }): void;
        static setSeparator(char: string): void;
        static get separator(): string;
        static createRouterData(ctxName: string, routingMap: {
            [x: string]: {};
        }): PubSub<any>;
        static initPopstateListener(): void;
        static removePopstateListener(): void;
    }
    export namespace AppRouter {
        const defaultTitle: string;
        const defaultRoute: string;
        const errorRoute: string;
        const __routingEventName: string;
        const _separator: string;
        function __onPopstate(): void;
        const appMap: any;
    }
    export default AppRouter;
    import PubSub from "core/PubSub";
}
declare module "utils/dom-helpers" {
    export function applyStyles<T extends HTMLElement | SVGElement>(el: T, styleMap: StyleMap): void;
    export function applyAttributes<T extends HTMLElement | SVGElement>(el: T, attrMap: AttrMap): void;
    export function create(desc?: ElementDescriptor): any;
    export type StyleMap = {
        [x: string]: string | number | boolean;
    };
    export type AttrMap = {
        [x: string]: string | number | boolean;
    };
    export type PropMap = {
        [x: string]: any;
    };
    export type ElementDescriptor = {
        tag?: string;
        attributes?: AttrMap;
        styles?: StyleMap;
        properties?: PropMap;
        processors?: Function[];
        children?: ElementDescriptor[];
    };
}
declare module "utils/kebabToCamel" {
    export function kebabToCamel(string: string): string;
}
declare module "core/index" {
    export { Symbiote } from "./Symbiote.js";
    export { html } from "./html.js";
    export { css } from "./css.js";
    export { PubSub } from "./PubSub.js";
    export { AppRouter } from "./AppRouter.js";
    export { UID } from "../utils/UID.js";
    export { setNestedProp } from "../utils/setNestedProp.js";
    export { kebabToCamel } from "../utils/kebabToCamel.js";
    export { applyStyles, applyAttributes, create } from "../utils/dom-helpers.js";
}
declare module "core/slotProcessor" {
    export function slotProcessor<T extends import("core/Symbiote").Symbiote<any>>(fr: DocumentFragment, fnCtx: T): void;
    export default slotProcessor;
}
