# Changelog

## 3.0.0-rc.1

### ⚠️ Breaking Changes

- **`tplProcessors` renamed to `templateProcessors`.**
  The instance property and its API now use the full name. The `addTemplateProcessor()` method has been removed — use native `Set` methods directly:
  ```js
  // Before (2.x):
  this.addTemplateProcessor(myProcessor);

  // After (3.x):
  this.templateProcessors.add(myProcessor);
  ```

- **`AppRouter.applyRoute()` renamed to `AppRouter.navigate()`.**

- **`AppRouter` removed from main entry point.**
  Now imported directly from its module:
  ```js
  // Before (2.x):
  import { AppRouter } from '@symbiotejs/symbiote';

  // After (3.x):
  import { AppRouter } from '@symbiotejs/symbiote/core/AppRouter.js';
  ```

- **`#disconnectTimeout` renamed to `#destroyTimeout`.**
  Internal field renamed for clarity. No public API impact.

- **Computed properties: cross-context requires explicit deps.**
  Computed properties that depend on external named contexts no longer auto-detect dependencies via global scan. Use the new object syntax:
  ```js
  // Before (2.x) — implicit, worked via global scan:
  init$ = {
    '+total': () => this.$['APP/score'] + this.$.local,
  };

  // After (3.x) — explicit deps required:
  init$ = {
    '+total': {
      deps: ['APP/score'],
      fn: () => this.$['APP/score'] + this.$.local,
    },
  };
  ```
  Local computed properties (depending only on same-context props) continue to work with function syntax unchanged.

### Performance

- **Computed properties: per-instance dependency tracking.**
  Replaced global `#processComputed` scan with per-instance local dependency auto-tracking. `read()` now records which local props a computed function accesses, and only affected computeds are recalculated. Benchmarked up to **676x faster** for local computeds, **14x** for sparse scenarios.

- **Microtask batching for computed recalculation.**
  Replaced `setTimeout`-based debounce with `queueMicrotask`, providing predictable async batching and eliminating per-computed timer overhead.

### Added

- **`Symbiote.devMode` flag.**
  Enables verbose development warnings (unresolved template bindings, etc.). Default: `false`.

- **Enhanced warning messages.**
  All warnings now use `[Symbiote]` prefix with component tag names, context UIDs, available contexts, and fix suggestions.

- **`this` in template detection.**
  `html` tagged template now fires `console.error` when `${this.…}` is used in template interpolation (templates are context-free).

- **`reg()` returns the class itself.**
  Enables patterns like `export default MyComponent.reg('my-component')`.

- **Declarative Shadow DOM hydration (`ssrMode`).**
  `ssrMode = true` (client-only) hydrates both light DOM and existing Declarative Shadow DOM (`<template shadowrootmode="open">`). Template injection is skipped; bindings attach to pre-rendered content. Shadow styles applied via `adoptedStyleSheets`. Bypassed on the server (`__SYMBIOTE_SSR`).

- **Server-side rendering (`core/ssr.js`).**
  New SSR module: `initSSR()` creates a linkedom-backed DOM environment with polyfills (CSSStyleSheet, NodeFilter, MutationObserver) and sets `globalThis.__SYMBIOTE_SSR`. `renderToString(tagName, attrs?)` renders components to HTML with Declarative Shadow DOM and inlined `<style>`. `renderToStream(tagName, attrs?)` async generator yields HTML chunks for lower TTFB and memory usage. Binding attributes (`bind`, `ref`, `itemize`) are preserved in output for client-side hydration. `linkedom` is an optional peer dependency.

### Fixed

- **`css()` tagged template trailing `undefined`.**
  `props[idx]` appended `"undefined"` when no interpolations exist. Fixed with `?? ''`.

- **`new DocumentFragment()` SSR compatibility.**
  Replaced with `document.createDocumentFragment()` in both `itemizeProcessor.js` and `itemizeProcessor-keyed.js` for linkedom compatibility.

- **`AppRouter`: path-based routing.**
  Routes with a `pattern` key auto-switch to path-based URLs. Supports `:param` extraction:
  ```js
  AppRouter.initRoutingCtx('R', {
    home: { pattern: '/', title: 'Home', default: true },
    user: { pattern: '/users/:id', title: 'User' },
  });
  // /users/42 → { route: 'user', options: { id: '42' } }
  ```
  Routes without `pattern` keep working as query-string (full backward compatibility).

- **`AppRouter.beforeRoute(fn)` — route guards.**
  Register middleware that runs before navigation. Return `false` to cancel, a route string to redirect:
  ```js
  let unsub = AppRouter.beforeRoute((to, from) => {
    if (!isAuth && to.route === 'settings') return 'login';
  });
  ```

- **Lazy loaded route components.**
  Add `load` to route descriptors for dynamic imports. Loaded once, cached automatically:
  ```js
  { pattern: '/settings', load: () => import('./pages/settings.js') }
  ```

- **AI_REFERENCE.md** — comprehensive AI context file for code assistants, covering full API surface, template syntax, state management, lifecycle, styling, routing, itemize, and common mistakes.

- **Event handler method fallback.**
  `on*` bindings now fall back to class methods when no matching `init$` property is found:
  ```js
  // Works without init$ entry — class method is used as fallback:
  onSubmit() { console.log('submitted'); }
  ```

- **`destructionDelay` instance property.**
  Configurable delay (default `100`ms) before component destruction in `disconnectedCallback`. Override per-component to control cleanup timing:
  ```js
  class MyComponent extends Symbiote {
    destructionDelay = 0; // instant cleanup
  }
  ```

- **`itemizeProcessor-keyed.js` — optional optimized itemize processor.**
  Drop-in replacement with reference-equality fast paths and key-based reconciliation. Up to **3x faster** for appends, **2x** for in-place updates, **32x** for no-ops. Opt-in per component:
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

### Internal

- Replaced `setTimeout` with `queueMicrotask` in prop binding race avoidance and async accessor handlers.
