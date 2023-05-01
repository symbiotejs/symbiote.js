declare module "core/Data" {
    export class Data {
        static warn(actionName: string, prop: string): void;
        static registerCtx(schema: {
            [x: string]: any;
        }, uid?: any): Data;
        static deleteCtx(uid: any): void;
        static getCtx(uid: any, notify?: boolean): Data;
        constructor(schema: {
            [x: string]: any;
        });
        store: {
            [x: string]: any;
        };
        private _storeIsProxy;
        callbackMap: any;
        read(prop: string): any;
        has(prop: string): boolean;
        add(prop: string, val: unknown, rewrite?: boolean): void;
        pub<T>(prop: string, val: T): void;
        multiPub(updObj: {
            [x: string]: any;
        }): void;
        notify(prop: string): void;
        sub(prop: string, callback: Function, init?: boolean): {
            remove: () => void;
            callback: Function;
        };
    }
    export namespace Data {
        const globalStore: Map<any, any>;
    }
}
declare module "core/dictionary" {
    export type DICT = string;
    export const DICT: Readonly<{
        BIND_ATTR: "bind";
        ATTR_BIND_PRFX: "@";
        EXT_DATA_CTX_PRFX: "*";
        NAMED_DATA_CTX_SPLTR: "/";
        CTX_NAME_ATTR: "ctx";
        CTX_OWNER_ATTR: "ctx-owner";
        CSS_CTX_PROP: "--ctx";
        EL_REF_ATTR: "ref";
        AUTO_TAG_PRFX: "sym";
        REPEAT_ATTR: "list";
        REPEAT_ITEM_TAG_ATTR: "list-item-tag";
        SET_LATER_KEY: "__toSetLater__";
        USE_TPL: "use-template";
        ROOT_STYLE_ATTR_NAME: "sym-component";
        VIRTUAL_WC: "virtual";
    }>;
}
declare module "utils/UID" {
    export class UID {
        static generate(pattern?: string): string;
    }
}
declare module "utils/setNestedProp" {
    export function setNestedProp(parent: any, path: string, value: any): boolean;
}
declare module "core/repeatProcessor" {
    export function repeatProcessor<T extends import("core/BaseComponent").BaseComponent<any>>(fr: DocumentFragment, fnCtx: T): void;
}
declare module "core/tpl-processors" {
    const _default: (<T extends import("core/BaseComponent").BaseComponent<any>>(fr: DocumentFragment, fnCtx: T) => void)[];
    export default _default;
}
declare module "utils/parseCssPropertyValue" {
    export function parseCssPropertyValue(input: string): string | number;
}
declare module "core/BaseComponent" {
    export class BaseComponent<S> extends HTMLElement {
        static template: string;
        static "__#1@#parseProp"<T_3 extends BaseComponent<any>>(prop: string, fnCtx: T_3): {
            ctx: Data;
            name: string;
        };
        static reg(tagName?: string, isAlias?: boolean): void;
        static get is(): string;
        static bindAttributes(desc: {
            [x: string]: string;
        }): void;
        static set shadowStyles(arg: string);
        static set rootStyles(arg: string);
        constructor();
        get BaseComponent(): typeof BaseComponent;
        initCallback(): void;
        render(template?: string | DocumentFragment, shadow?: boolean): void;
        addTemplateProcessor<T extends BaseComponent<any>>(processorFn: (fr: DocumentFragment | T, fnCtx: T) => void): void;
        init$: S;
        cssInit$: {
            [x: string]: any;
        };
        tplProcessors: Set<(fr: DocumentFragment | BaseComponent<any>, fnCtx: unknown) => void>;
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
        get localCtx(): Data;
        get nodeCtx(): Data;
        sub<T_1 extends keyof S>(prop: T_1, handler: (value: S[T_1]) => void, init?: boolean): void;
        notify(prop: string): void;
        has(prop: string): boolean;
        add<T_2 extends keyof S>(prop: string, val: S[T_2], rewrite?: boolean): void;
        add$(obj: Partial<S>, rewrite?: boolean): void;
        get $(): S;
        set$(kvObj: Partial<S>, forcePrimitives?: boolean): void;
        connectedCallback(): void;
        initChildren: ChildNode[];
        connectedOnce: boolean;
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
    import { Data } from "core/Data";
}
declare module "core/AppRouter" {
    export class AppRouter {
        private static _print;
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
        }): Data;
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
    import { Data } from "core/Data";
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
declare module "utils/IDB" {
    export const READY_EVENT_NAME: "idb-store-ready";
    export class IDB {
        static get readyEventName(): string;
        static open(dbName?: string, storeName?: string): DbInstance;
        private static _reg;
        static clear(dbName: string): void;
    }
    class DbInstance {
        constructor(dbName: string, storeName: string);
        private _notifyWhenReady;
        private get _updEventName();
        private _getUpdateEvent;
        private _notifySubscribers;
        name: string;
        storeName: string;
        version: number;
        request: IDBOpenDBRequest;
        db: any;
        objStore: any;
        private _subscriptionsMap;
        private _updateHandler;
        private _localUpdateHandler;
        read(key: string): Promise<any>;
        write(key: string, value: any, silent?: boolean): Promise<any>;
        delete(key: string, silent?: boolean): Promise<any>;
        getAll(): Promise<any>;
        subscribe(key: string, callback: (val: any) => void): {
            remove: () => void;
        };
        stop(): void;
    }
    export {};
}
declare module "utils/kebabToCamel" {
    export function kebabToCamel(string: string): string;
}
declare module "core/index" {
    export { BaseComponent } from "./BaseComponent.js";
    export { Data } from "./Data.js";
    export { AppRouter } from "./AppRouter.js";
    export { UID } from "../utils/UID.js";
    export { setNestedProp } from "../utils/setNestedProp.js";
    export { IDB } from "../utils/IDB.js";
    export { kebabToCamel } from "../utils/kebabToCamel.js";
    export { applyStyles, applyAttributes, create } from "../utils/dom-helpers.js";
}
