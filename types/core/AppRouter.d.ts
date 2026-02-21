export class AppRouter {
    static appMap: {
        [x: string]: {
            title?: string;
            default?: boolean;
            error?: boolean;
            pattern?: string;
            load?: () => Promise<any>;
            __loaded?: boolean;
        };
    };
    static setDefaultTitle(title: string): void;
    static setRoutingMap(map: {
        [x: string]: {};
    }): void;
    static set routingEventName(name: string);
    static get routingEventName(): string;
    static readAddressBar(): {
        route: any;
        options: {};
    };
    static notify(): Promise<void>;
    static reflect(route: string, options?: {
        [x: string]: any;
    }): void;
    static navigate(route: string, options?: {
        [x: string]: any;
    }): void;
    static beforeRoute(fn: (to: {
        route: string;
        options: {
            [x: string]: any;
        };
    }, from: {
        route: string;
        options: {
            [x: string]: any;
        };
    } | null) => string | boolean | void | Promise<string | boolean | void>): () => void;
    static setSeparator(char: string): void;
    static get separator(): string;
    static initRoutingCtx(ctxName: string, routingMap: {
        [x: string]: {
            title?: string;
            default?: boolean;
            error?: boolean;
            pattern?: string;
            load?: () => Promise<any>;
            __loaded?: boolean;
        };
    }): PubSub<any>;
    static removePopstateListener(): void;
}
export default AppRouter;
import PubSub from './PubSub.js';
//# sourceMappingURL=AppRouter.d.ts.map