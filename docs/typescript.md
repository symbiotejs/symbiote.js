# TypeScript

Symbiote.js is written in JavaScript and ships generated `.d.ts` files. You can use it from JavaScript with JSDoc static analysis, from TypeScript directly, or from a mixed codebase.

The important design detail is that Symbiote templates are runtime-agnostic. A template can come from the `html` helper, a plain string, a separate module, a server-rendered string, or a DOM `<template>` selected with `use-template`. Because templates are not bound to one component instance at author time, not every template binding can be expressed as a complete compile-time TypeScript relationship.

Symbiote uses a hybrid approach:

- TypeScript/JSDoc types describe component classes, state, methods, helpers, and public APIs.
- Runtime diagnostics validate template bindings when a template is connected to an actual component instance and data context.

## JSDoc Approach

The recommended default is JavaScript with TypeScript checking enabled. This keeps Symbiote close to the platform while still giving editors static analysis and "Go to Definition" support.

Enable checking in individual files:
```js
// @ts-check
```

Or enable it for the project:
```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "strict": true
  }
}
```

Describe component state with JSDoc and pass it to the generic `Symbiote` base class:
```js
// @ts-check
import Symbiote, { html } from '@symbiotejs/symbiote';

/**
 * @typedef {{
 *   count: number,
 *   label: string
 * }} CounterState
 */

/** @extends {Symbiote<CounterState>} */
class MyCounter extends Symbiote {
  /** @type {CounterState} */
  init$ = {
    count: 0,
    label: 'Count',
  };

  increment() {
    this.$.count += 1;
  }
}

MyCounter.template = html`
  <h2>{{label}}: {{count}}</h2>
  <button ${{onclick: 'increment'}}>+</button>
`;

MyCounter.reg('my-counter');
```

This gives static checks for normal JavaScript code:

- `this.$.count` is known as a number.
- `this.$.label` is known as a string.
- `set$()`, `add$()`, and `sub()` can use the declared state shape.

The template remains a runtime-agnostic string. The binding name `'increment'` is intentionally not a direct function reference; it is resolved later from the rendered component instance.

## Typed Binding Objects

Inline binding objects are concise:
```js
html`<button ${{onclick: 'increment'}}>+</button>`;
```

For larger templates, or when you want stronger editor checks on binding declarations, define binding objects separately and type them as a relationship between element properties and template context keys.

In JSDoc, define a reusable binding-map helper:
```js
// @ts-check
import { html } from '@symbiotejs/symbiote';

/**
 * @typedef {{
 *   count: number,
 *   label: string
 * }} CounterState
 */

/**
 * @template {object} El
 * @template {object} Ctx
 * @typedef {Partial<Record<Extract<keyof El, string>, Extract<keyof Ctx, string>>>} BindingMap
 */

/**
 * @typedef {CounterState & {
 *   increment: () => void
 * }} CounterTemplateCtx
 */

/** @satisfies {BindingMap<HTMLButtonElement, CounterTemplateCtx>} */
const incrementBtn = {
  onclick: 'increment',
  textContent: 'label',
};

MyCounter.template = html`
  <button ${incrementBtn}>Click me!</button>
`;
```

This checks both sides of the binding:

- object keys must be properties of `HTMLButtonElement` (`onclick`, `textContent`, etc.)
- object values must be keys of `CounterTemplateCtx` (`increment`, `label`, etc.)

So `onclik: 'increment'` or `textContent: 'lable'` can be caught by TypeScript before the template runs.

In `.ts` files, use the same pattern with native TypeScript types:
```ts
import { html } from '@symbiotejs/symbiote';

type BindingMap<El, Ctx> = Partial<Record<
  Extract<keyof El, string>,
  Extract<keyof Ctx, string>
>>;

type CounterState = {
  count: number;
  label: string;
};

type CounterTemplateCtx = CounterState & {
  increment: () => void;
};

const incrementBtn = {
  onclick: 'increment',
  textContent: 'label',
} satisfies BindingMap<HTMLButtonElement, CounterTemplateCtx>;

MyCounter.template = html`
  <button ${incrementBtn}>Click me!</button>
`;
```

This pattern keeps template markup readable and moves binding descriptors into regular JavaScript objects where TypeScript/JSDoc can help with object shape, reuse, imports, and refactoring. It still cannot prove that the template will always be rendered by a component with the same runtime context, because templates are portable runtime artifacts. For that final check, use `devMode` diagnostics.

## TypeScript Files

You can also write components in `.ts` files:
```ts
import Symbiote, { html } from '@symbiotejs/symbiote';

type CounterState = {
  count: number;
  label: string;
};

class MyCounter extends Symbiote<CounterState> {
  init$ = {
    count: 0,
    label: 'Count',
  };

  increment() {
    this.$.count += 1;
  }
}

MyCounter.template = html`
  <h2>{{label}}: {{count}}</h2>
  <button ${{onclick: 'increment'}}>+</button>
`;
```

This is useful when the application already has a TypeScript build step. Symbiote itself does not require one.

## Hybrid Template Checks

Template bindings can point to several runtime data sources:

- local state: `{{title}}`
- class property or method fallbacks: `${{onclick: 'onClick'}}`
- pop-up context: `{{^parentTitle}}`
- shared context: `{{*selectedId}}`
- named context: `{{APP/userName}}`
- CSS data: `{{--theme-color}}`

Those sources are resolved when the template is rendered, not when the template string is declared. This is what allows the same template to be reused across components, loaded from external markup, hydrated from SSR output, or selected with `use-template`.

To catch mistakes that TypeScript cannot reliably see in runtime-agnostic templates, enable development diagnostics:
```js
import '@symbiotejs/symbiote/core/devMessages.js';
```

Or enable only the flags:
```js
Symbiote.devMode = true;
```

Symbiote then adds runtime checks around template binding behavior:

- missing binding keys can be reported when they are auto-initialized from the template
- type changes in reactive state can be reported by `PubSub`
- text-node bindings in SSR/ISO mode can warn when they cannot be hydrated
- invalid template interpolation patterns are reported by the `html` helper

For stricter template validation, disable automatic template initialization:
```js
class MyComponent extends Symbiote {
  allowTemplateInits = false;

  init$ = {
    title: 'Hello',
  };
}

MyComponent.template = html`
  <h1>{{title}}</h1>
`;
```

With `allowTemplateInits = false`, template bindings must resolve to explicitly registered state or external contexts. Class property and method fallbacks are not silently added from the template. This is useful for larger codebases where a typo in a template should surface immediately during development.

## Practical Rule

Use TypeScript or JSDoc for everything that exists as JavaScript: component state, public methods, helper functions, context objects, and external APIs.

Use Symbiote dev/runtime diagnostics for template binding correctness, because templates are intentionally portable runtime artifacts rather than instance-bound TypeScript render functions.

---

Next: [Security ->](./security.md)
