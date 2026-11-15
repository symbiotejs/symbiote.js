export function isDataReference(reference: string, computed?: boolean): boolean;
export function resolveData(owner: import("./BaseClass.js").BaseClass, reference: string, computed?: boolean): import("../core/parseProp.js").ParsedProp;
export function dataReference(owner: import("./BaseClass.js").BaseClass, reference: string, computed?: boolean): import("../core/parseProp.js").ParsedProp;
export function parseAction(source: string): {
    operation: string;
    reference: string;
    delay: number;
};
export function unavailable(element: Element, owner: import("./BaseClass.js").BaseClass): boolean;
export function controlValue(element: Element, current: unknown): {
    skip?: boolean;
    value?: unknown;
};
export function validateValue(current: unknown, value: unknown): void;
//# sourceMappingURL=action-data.d.ts.map