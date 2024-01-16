export class AppRouter {
    static "__#3@#onPopstate": () => void;
    static "__#3@#separator": string;
    static "__#3@#routingEventName": string;
    static appMap: {
        [x: string]: {
            title?: string;
            default?: boolean;
            error?: boolean;
        };
    };
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
    static initRoutingCtx(ctxName: string, routingMap: {
        [x: string]: {
            title?: string;
            default?: boolean;
            error?: boolean;
        };
    }): PubSub<any>;
    static "__#3@#initPopstateListener"(): void;
    static removePopstateListener(): void;
}
export default AppRouter;
import PubSub from './PubSub.js';
//# sourceMappingURL=AppRouter.d.ts.map