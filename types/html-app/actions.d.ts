export function actionProcessor(root: Element | DocumentFragment, owner: import("./BaseClass.js").BaseClass): void;
export class ActionBindings {
    constructor(owner: import("./BaseClass.js").BaseClass);
    bindings: Binding[];
    connected: boolean;
    version: number;
    sequence: number;
    owner: import("./BaseClass.js").BaseClass;
    connect(): void;
    disconnect(): void;
    invalidate(): void;
    process(root: Element | DocumentFragment): void;
    cancel(binding: Binding): void;
    drop(binding: Binding): void;
    destroy(): void;
    onSubmit: (event: SubmitEvent) => void;
    flushForm(form: HTMLFormElement): boolean;
    identity(): {
        runtime: ActionBindings;
        version: number;
    };
    activate(binding: Binding, event?: ActionEvent): {
        ok: boolean;
        error: {
            operation: string;
            code: string;
            message: string;
            status: any;
        };
    } | Promise<{
        ok: boolean;
        operation: string;
        revision: number;
    } | {
        ok: boolean;
        error: {
            operation: string;
            code: string;
            message: string;
            status: any;
        };
    } | {
        ok: boolean;
        cancelled: boolean;
    }> | Promise<{
        ok: boolean;
        error: {
            operation: "load" | "sync";
            code: string;
            message: string;
            status: number;
        };
    } | {
        ok: boolean;
        operation: string;
        applied: string[];
        retained: string[];
    } | {
        ok: boolean;
        cancelled: boolean;
    }> | {
        ok: boolean;
        operation: string;
        found: boolean;
        applied: string[];
        retained: any[];
    } | {
        ok: boolean;
        cancelled: boolean;
    } | {
        changed: boolean;
        pending?: undefined;
    } | {
        changed: boolean;
        pending: boolean;
    };
}
export type ActionEvent = {
    defaultPrevented?: boolean;
    isComposing?: boolean;
    submitter?: Element | null;
    preventDefault?: () => void;
};
export type Binding = {
    element: Element;
    property: string;
    source: string;
    key: string;
    action: ReturnType<typeof parseAction>;
    composing: boolean;
    pending: (() => boolean) | undefined;
    timer: ReturnType<typeof setTimeout> | undefined;
    cleanup: (() => void)[];
    subscriptions: {
        remove(): void;
    }[];
};
import { parseAction } from './action-data.js';
//# sourceMappingURL=actions.d.ts.map