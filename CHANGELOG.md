# Changelog

## 3.4.1

### Fixed

- **SSR: `{{prop}}` text-node bindings with class property fallback.** `resolveTextTokens` now checks own class properties and prototype methods when the prop is not in `init$`. Previously, linkedom's `DocumentFragment.textContent` returning `null` caused `txtNodesProcessor` to skip processing, and the serializer fallback only resolved `init$` props — leaving raw `{{prop}}` tokens in SSR output.

## 3.4.0

### Added

- **DevMode warning for `{{prop}}` in SSR/ISO mode.** Text-node bindings produce no `bind=` attribute in SSR output, so they render correctly on the server but cannot be hydrated on the client. When `devMode = true` and the component has `ssrMode` or `isoMode` enabled, a `console.warn` now suggests using `${{textContent: 'prop'}}` for hydratable text.

## 3.3.9

### Improved

- **DRY itemize processors.** Extracted shared setup logic (element discovery, SSR hydration, class creation, template derivation, attribute cleanup) into `itemizeSetup.js`. Both `itemizeProcessor.js` and `itemizeProcessor-keyed.js` now use the same setup, eliminating code duplication.

- **Keyed processor SSR support.** `itemizeProcessor-keyed.js` now inherits all SSR hydration fixes: `clientSSR` detection, SSR tag adoption, `isoMode` on items, static template derivation, conditional child clearing, and `initPropFallback`.

### Fixed

- **Keyed processor: live HTMLCollection bug.** Fixed `animateOut` failing when removing multiple items by key — the live `HTMLCollection` shifted indices during removal. Elements are now snapshotted before removal.

## 3.3.8

### Fixed

- **SSR hydration: Itemize template derivation.** Dynamically added itemize items now use the original template (parsed from `fnCtx.constructor.template`) instead of SSR-expanded `innerHTML`. This preserves nested custom elements (e.g. icons) in new items added after hydration.

## 3.3.7

### Fixed

- **SSR hydration: Itemize list duplication.**
  Fixed itemize SSR hydration creating duplicate items. The processor now adopts the existing SSR item tag name and element class, skips the initial subscription fire, and sets `isoMode` on the item class so upgraded elements hydrate their existing content instead of re-rendering.

## 3.3.6

### Improved

- **SSR hydration: generic property preservation.**
  During SSR/ISO hydration, all primitive-valued bindings (`textContent`, `innerHTML`, `style.*`, `value`, etc.) now skip the initial write, preserving server-rendered DOM. Function bindings (event handlers) and non-null object bindings (component state) still fire immediately. Previously only `textContent` and attribute bindings were preserved.

- **SSR hydration: Itemize API support.**
  Auto-generated itemize item components now inherit `ssrMode`/`isoMode` from the parent. Server-rendered list items are preserved during hydration instead of being cleared and re-created.

## 3.3.5

### Fixed

- **AppRouter: SSR context populated with default route.**
  `initRoutingCtx()` in SSR now populates the PubSub context with the default route's `route`, `title`, and `options` instead of leaving them as `null`. Components can access `this.$['R/route']` during server rendering.

## 3.3.4

### Fixed

- **PubSub context isolation with importmaps.**
  `PubSub.globalStore` now uses `globalThis.__SYMBIOTE_PUBSUB_STORE`, so multiple copies of PubSub loaded from different URLs (e.g. via importmap) share the same context registry. Fixes `Router/title` and similar named context bindings not working when AppRouter is resolved separately.

### Added

- **`@symbiotejs/symbiote/full` entry point.**
  Re-exports everything from the main entry point plus `AppRouter`, guaranteeing a single PubSub module:
  ```js
  import Symbiote, { html, css, AppRouter } from '@symbiotejs/symbiote/full';
  ```

- **AppRouter SSR support.**
  `AppRouter.initRoutingCtx()` now works in Node.js and linkedom SSR environments — creates the PubSub context without errors, skipping browser-only APIs (`window`, `history`, events). Enables isomorphic code that uses AppRouter on both server and client.

## 3.3.0

### Added

- **`isoMode` flag for isomorphic rendering.**
  `isoMode = true` enables automatic detection: if the component has children at connect time (server-rendered content), it hydrates existing DOM like `ssrMode`. If no children exist, it renders the template normally. Same component code works for both SSR and client-only scenarios.

## 3.2.0

### Added

- **Itemize class property fallback.**
  The `itemize` data source property now supports class property fallback, consistent with `domBindProcessor` and `txtNodesProcessor`.

### Changed

- **Utils moved to separate entry point.**
  `UID`, `setNestedProp`, `applyStyles`, `applyAttributes`, `create`, `kebabToCamel`, `reassignDictionary` are no longer exported from the main `@symbiotejs/symbiote` entry point. Import from `@symbiotejs/symbiote/utils` instead:
  ```js
  import { UID, create } from '@symbiotejs/symbiote/utils';
  ```
  Individual deep imports (`@symbiotejs/symbiote/utils/UID.js`, etc.) continue to work.

- **`initPropFallback` extracted to shared module.**
  Duplicated fallback initialization logic across template processors consolidated into `core/initPropFallback.js`.

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
