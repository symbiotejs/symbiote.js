# Changelog

## 3.1.0

### Changed

- **Class property fallback (generalized).**
  Bindings not found in `init$` now fall back to own class properties (checked via `Object.hasOwn`), not just `on*` event handlers. Functions are auto-bound to the component instance. Inherited `HTMLElement` properties are never picked up.
  ```js
  class MyComp extends Symbiote {
    label = 'Click me';
    onSubmit() { console.log('submitted'); }
  }
  ```
  Previously only `on*` handlers supported this fallback.

## 3.0.0

### ⚠️ Breaking Changes

- **`tplProcessors` → `templateProcessors`.**
  The `addTemplateProcessor()` method is removed — use native `Set` methods:
  ```js
  // 2.x:
  this.addTemplateProcessor(myProcessor);
  // 3.x:
  this.templateProcessors.add(myProcessor);
  ```

- **`AppRouter.applyRoute()` → `AppRouter.navigate()`.**

- **`AppRouter` removed from main entry point.**
  ```js
  // 2.x:
  import { AppRouter } from '@symbiotejs/symbiote';
  // 3.x:
  import { AppRouter } from '@symbiotejs/symbiote/core/AppRouter.js';
  ```

- **Computed properties: cross-context requires explicit deps.**
  Local computeds (same-context) keep working unchanged. Cross-context now uses object syntax:
  ```js
  // 2.x — implicit via global scan:
  init$ = {
    '+total': () => this.$['APP/score'] + this.$.local,
  };
  // 3.x — explicit deps:
  init$ = {
    '+total': {
      deps: ['APP/score'],
      fn: () => this.$['APP/score'] + this.$.local,
    },
  };
  ```

- **Shared context (`*prop`) simplified.**
  Removed `ctxOwner` / `ctx-owner`. First-registered value always wins. Dev-mode warnings when `*prop` used without `ctx` attribute.

### Performance

- **Computed properties: per-instance dependency tracking.**
  Replaced global scan with per-instance auto-tracking. Up to **676× faster** for local computeds, **14×** for sparse scenarios.

- **Microtask batching.**
  All computed recalculation and internal scheduling uses `queueMicrotask` instead of `setTimeout`.

- **`#parseProp` fast path.**
  `charCodeAt` checks skip full string parsing for common local properties — the most frequent case.

- **`$` proxy inlined fast path.**
  Both `get` and `set` traps bypass `#parseProp` entirely for local props.

- **`PubSub.pub()` direct value pass.**
  Eliminates redundant `read()` on every state update.

- **Dev warnings gated by `PubSub.devMode`.**
  Type-mismatch checks have zero overhead in production.

- **`txtNodesProcessor` early exit.**
  Skips text-node scanning when template contains no `{{` tokens.

- **`localCtx` direct construction.**
  Uses `new PubSub({})` instead of `PubSub.registerCtx({})`, bypassing global store for component-scoped state.

- **`hasOwnProperty` → `in` operator** across `PubSub` internals.

- **`itemizeProcessor-keyed.js` — optional optimized itemize processor.**
  Drop-in replacement with reference-equality fast paths and key-based reconciliation. Up to **3× faster** for appends, **2×** for in-place updates, **32×** for no-ops:
  ```js
  import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
  import { itemizeProcessor as defaultProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor.js';

  class BigList extends Symbiote {
    constructor() {
      super();
      this.templateProcessors.delete(defaultProcessor);
      this.templateProcessors = new Set([itemizeProcessor, ...this.templateProcessors]);
    }
  }
  ```

### Added

- **Server-side rendering (`node/SSR.js`).**
  `SSR` class with static methods for server-side rendering. `SSR.processHtml(html)` renders any HTML string with embedded components. `SSR.renderToString(tagName, attrs?)` renders a single component. `SSR.renderToStream(tagName, attrs?)` async generator yields HTML chunks. Declarative Shadow DOM with inlined styles. rootStyles emitted as `<style>` tags in light DOM. Light DOM content preserved. Binding attributes preserved for client hydration. `linkedom` is an optional peer dependency.
  ```js
  import { SSR } from '@symbiotejs/symbiote/node/SSR.js';
  await SSR.init();
  await import('./my-app.js');
  let html = await SSR.processHtml('<my-app>content</my-app>');
  SSR.destroy();
  ```

- **Declarative Shadow DOM hydration (`ssrMode`).**
  `ssrMode = true` hydrates pre-rendered content (light DOM + `<template shadowrootmode>`). Template injection skipped; bindings attach to existing DOM. Shadow styles applied via `adoptedStyleSheets`.

- **Exit animation hook (`animateOut`).**
  Sets `[leaving]` attribute, waits for CSS `transitionend`, removes element. Integrated into itemize processors — items with transitions animate out automatically. Enter animations use `@starting-style`.

- **`AppRouter`: path-based routing.**
  Routes with `pattern` key use path-based URLs with `:param` extraction:
  ```js
  AppRouter.initRoutingCtx('R', {
    home: { pattern: '/', title: 'Home', default: true },
    user: { pattern: '/users/:id', title: 'User' },
  });
  // /users/42 → { route: 'user', options: { id: '42' } }
  ```
  Query-string routes remain fully backward compatible.

- **Route guards — `AppRouter.beforeRoute(fn)`.**
  Return `false` to cancel, a route string to redirect:
  ```js
  let unsub = AppRouter.beforeRoute((to, from) => {
    if (!isAuth && to.route === 'settings') return 'login';
  });
  ```

- **Lazy loaded routes.**
  `load` in route descriptors for dynamic imports, cached automatically:
  ```js
  { pattern: '/settings', load: () => import('./pages/settings.js') }
  ```

- **Class property fallback.**
  Bindings not in `init$` fall back to own class properties/methods:
  ```js
  label = 'Click me';
  onSubmit() { console.log('submitted'); }
  ```

- **`Symbiote.devMode` flag.**
  Enables verbose warnings (unresolved bindings, tag names, available contexts). Also wires `PubSub.devMode`.

- **`reg()` returns the class itself.**
  Enables `export default MyComponent.reg('my-component')`.

- **`destructionDelay` instance property.**
  Configurable delay (default `100`ms) before cleanup in `disconnectedCallback`.

- **Trusted Types support.**
  Template writes use `'symbiote'` Trusted Types policy when available. Zero overhead otherwise.

- **`this` in template detection.**
  `html` fires `console.error` when `${this.…}` used in template (templates are context-free).

- **AI_REFERENCE.md** — comprehensive context file for code assistants.

### Fixed

- `css()` trailing `undefined` when no interpolations exist.
- `new DocumentFragment()` → `document.createDocumentFragment()` for linkedom compatibility.
- `txtNodesProcessor` null check for `fr.textContent` in SSR environments.
