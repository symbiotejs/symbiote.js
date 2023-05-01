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
        BIND_ATTR: string;
        ATTR_BIND_PRFX: string;
        EXT_DATA_CTX_PRFX: string;
        NAMED_DATA_CTX_SPLTR: string;
        CTX_NAME_ATTR: string;
        CTX_OWNER_ATTR: string;
        CSS_CTX_PROP: string;
        EL_REF_ATTR: string;
        AUTO_TAG_PRFX: string;
        REPEAT_ATTR: string;
        REPEAT_ITEM_TAG_ATTR: string;
        SET_LATER_KEY: string;
        USE_TPL: string;
        ROOT_STYLE_ATTR_NAME: string;
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
declare module "utils/kebabToCamel" {
    export function kebabToCamel(string: string): string;
}
declare module "core/repeatProcessor" {
    export function repeatProcessor<T extends import("core/BaseComponent").BaseComponent<any>>(fr: DocumentFragment, fnCtx: T): void;
}
declare module "core/tpl-processors" {
    var _default: (<T extends import("core/BaseComponent").BaseComponent<any>>(fr: DocumentFragment, fnCtx: T) => void)[];
    export default _default;
}
declare module "utils/parseCssPropertyValue" {
    export function parseCssPropertyValue(input: string): string | number;
}
declare module "core/BaseComponent" {
    export class BaseComponent<S> extends HTMLElement {
        static template: string;
        private static __parseProp;
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
        private __initCallback;
        private __initialized;
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
        get autoCtxName(): string;
        private __autoCtxName;
        get cssCtxName(): string;
        get ctxName(): string;
        __cachedCtxName: string;
        get localCtx(): Data;
        private __localCtx;
        get nodeCtx(): Data;
        sub<T_1 extends keyof S>(prop: T_1, handler: (value: S[T_1]) => void, init?: boolean): void;
        notify(prop: string): void;
        has(prop: string): boolean;
        add<T_2 extends keyof S>(prop: string, val: S[T_2], rewrite?: boolean): void;
        add$(obj: Partial<S>, rewrite?: boolean): void;
        get $(): S;
        private __stateProxy;
        set$(kvObj: Partial<S>, forcePrimitives?: boolean): void;
        private get __ctxOwner();
        private __initDataCtx;
        private __dataCtxInitialized;
        connectedCallback(): void;
        initChildren: ChildNode[];
        connectedOnce: boolean;
        destroyCallback(): void;
        disconnectedCallback(): void;
        private __disconnectTimeout;
        attributeChangedCallback(name: any, oldVal: any, newVal: any): void;
        getCssData(propName: string, silentCheck?: boolean): any;
        private __cssDataCache;
        private __computedStyle;
        private __extractCssName;
        updateCssData: () => void;
        private __initStyleAttrObserver;
        bindCssData(propName: string, initValue?: any): void;
        private __boundCssProps;
        dropCssDataCache(): void;
        defineAccessor(propName: string, handler?: Function, isAsync?: boolean): void;
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
declare module "core/index" {
    export { BaseComponent } from "core/BaseComponent";
    export { Data } from "core/Data";
    export { AppRouter } from "core/AppRouter";
    export { UID } from "utils/UID";
    export { setNestedProp } from "utils/setNestedProp";
    export { IDB } from "utils/IDB";
    export { kebabToCamel } from "utils/kebabToCamel";
    export { applyStyles, applyAttributes, create } from "utils/dom-helpers";
}
