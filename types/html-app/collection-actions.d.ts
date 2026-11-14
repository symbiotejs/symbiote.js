export function prepareCollectionAction(owner: import("./BaseClass.js").BaseClass, action: ReturnType<typeof import("./action-data.js").parseAction>, element: Element, operand: Element): {
    target: import("../core/parseProp.js").ParsedProp;
    value: Record<string, any>[];
    resolve: () => import("../core/parseProp.js").ParsedProp;
    after?: undefined;
} | {
    target: import("../core/parseProp.js").ParsedProp;
    value: Record<string, any>[];
    after: () => void;
    resolve: () => import("../core/parseProp.js").ParsedProp;
};
//# sourceMappingURL=collection-actions.d.ts.map