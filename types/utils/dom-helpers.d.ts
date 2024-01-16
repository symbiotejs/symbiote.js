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
//# sourceMappingURL=dom-helpers.d.ts.map