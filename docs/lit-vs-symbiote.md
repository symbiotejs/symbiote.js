# Lit vs Symbiote.js

> [!NOTE]
> Both libraries build on Web Components. Lit is the most popular choice backed by Google. So why consider Symbiote.js?

This comparison is written from the Symbiote.js perspective but aims to be technically fair. Where Lit does something well, we say so.

## At a Glance

| | **Symbiote.js 3.x** | **Lit 3.x** |
|--|--|--|
| **Core size** (brotli) | ~5.9 kb | ~5.1 kb |
| **Full bundle** (brotli) | ~7.2 kb (core + router) | ~5.1 kb + addons |
| **Dependencies** | 0 runtime | 0 runtime |
| **Shadow DOM** | Opt-in per component | On by default |
| **SSR** | Built-in (`node/SSR.js`) | Experimental (`@lit-labs/ssr`) |
| **Routing** | Built-in (optional import) | Not included |
| **State management** | Built-in (PubSub, contexts) | Separate package (`@lit/context`) |
| **Build step** | Not required | Not required |
| **TypeScript** | JSDoc + `.d.ts` | Decorators-first API |

> Lit's base size is ~1 kb smaller, but Symbiote's core already includes state management, list rendering (Itemize API), computed properties, and exit animations — features that in the Lit ecosystem require additional packages.

## Templates

This is the biggest architectural difference.

### Lit

Templates use the `html` tagged template literal with JavaScript expressions bound to the current component's `this`:

```js
html`<p>${this.message}</p>`
html`<button @click=${this.onClick}>Click</button>`
```

- Expressions are tied to the component's render method and its `this` scope.
- Templates are re-evaluated on every render cycle.
- The `html` function does not produce a plain HTML string — it returns a `TemplateResult` object processed by Lit's internal rendering pipeline.
- Templates cannot be separated from the JavaScript execution context.

### Symbiote.js

Templates are plain HTML strings with declarative binding attributes. They are context-free — they do not reference `this`:

```js
html`<p>{{message}}</p>`
html`<button ${{onclick: 'onClick'}}>Click</button>`
```

Key advantages:

1. **Runtime-independent** — templates are standard HTML strings. They can live in separate files, arrive from an API response, or be embedded directly in the page markup.
2. **Decoupled from `this`** — bindings use property name strings, not direct references. A component provides data and handlers; a template defines presentation independently.
3. **Multiple template sources** — the same component can use different templates from the document via `use-template` attribute, enabling complete separation of data logic and representation.
4. **Dual-mode interpolation** — `html` supports both reactive bindings (objects) and standard string interpolation in a single template.
5. **Loose-coupling alternative** — templates can be written as pure HTML without any JavaScript context at all: `<div bind="textContent: myProp"></div>`.
6. **SSR-transparent** — the `html` function produces clean HTML with `bind=` attributes that can be rendered server-side by any template engine, or by Symbiote's own SSR module, and hydrated on the client. No special markers, no `<!--lit-part-->` comments.

## Server-Side Rendering

### Lit

SSR is experimental and lives in `@lit-labs/ssr`. A working setup requires:

- `@lit-labs/ssr` — server-side renderer
- `@lit-labs/ssr-client` — client-side hydration support (including `lit-element-hydrate-support.js`)
- `@lit-labs/ssr-dom-shim` — DOM polyfills for the server

Important constraints:
- **Load order matters** — `lit-element-hydrate-support.js` must be loaded _before_ the `lit` module and all components.
- **Hydration mismatches** — server and client renders must produce identical output, or errors occur.
- **No async support** — Lit SSR has no built-in mechanism to wait for async results before serializing.
- **Comment-based markers** — the output contains `<!--lit-part-->` and `<!--lit-node-->` comments for template re-association.

### Symbiote.js

SSR is built in (one module, `node/SSR.js`) with `linkedom` as an optional peer dependency:

```js
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';

await SSR.init();
await import('./my-app.js');

let result = await SSR.processHtml('<my-app></my-app>');
SSR.destroy();
```

Key differences:
- **1 module** — no separate client/server packages.
- **No hydration mismatches** — the server produces HTML with `bind=` attributes. The client reads those attributes and attaches reactivity. There's no diffing, so there's nothing to mismatch.
- **Streaming** — `SSR.renderToStream()` yields HTML chunks for lower TTFB.
- **`isoMode`** — one flag makes a component isomorphic: hydrates if server content exists, renders from template otherwise. No conditional logic.
- **Clean output** — no framework markers in the HTML.
- **CSP nonce support** — pass `{ nonce }` to add nonce attributes to generated `<style>` tags.

## Data Flow and State Management

### Lit

- **Reactive properties** — declared with `@property()` decorator. Changes trigger re-render cycle.
- **Internal state** — `@state()` decorator for private reactive properties.
- **Data sharing** — `@lit/context` package implements the W3C Context Community Protocol. Uses `@provide`/`@consume` decorators and DOM events under the hood. This is a separate install.
- **No global state** — Lit does not include global state management; you bring your own (Redux, MobX, signals).

### Symbiote.js

Symbiote provides a layered data context system built in — no extra packages:

| Context | Token | Description |
|---------|-------|-------------|
| **Local** | `myProp` | Component's own reactive state |
| **Pop-up (`^`)** | `^parentProp` | Walks up the DOM tree to find the nearest ancestor with the property. Works like CSS cascade |
| **Shared (`*`)** | `*sharedProp` | Components with the same `ctx` attribute share state. No parent component or prop drilling needed |
| **Named** | `APP/myProp` | Global named data contexts accessible by key from anywhere |
| **CSS Data** | `--my-var` | Initialize component state from CSS custom property values |
| **Computed** | `+sum` | Reactive derived state with microtask batching |

The outstanding simplicity here is that a component can bind directly to any external data context without adding a single line of component logic. Just use the prefix in the template — `{{APP/user}}`, `{{^parentTitle}}`, `{{*sharedCount}}` — and the binding is established. No decorator setup, no provider/consumer wiring, no subscription boilerplate. The template _is_ the wiring.

In Lit, achieving the same patterns requires a combination of `@property()` declarations, `@provide`/`@consume` decorators from a separate `@lit/context` package, custom events, and often an external state management library.

## CSS and Styling

### Lit

- Shadow DOM is the default — styles are scoped and isolated.
- Styles are defined in the component class via `static styles = css`...``.
- CSS custom properties cross shadow boundaries.
- Global/document-level styles do not reach shadow DOM internals.
- Opting out of Shadow DOM requires `createRenderRoot() { return this; }` — an escape hatch, not a first-class feature.

### Symbiote.js

- **Shadow DOM is opt-in** — Light DOM is the default. Use shadow only where isolation is needed.
- Two style interfaces: `rootStyles` (Light DOM, adopted stylesheets) and `shadowStyles` (Shadow DOM). Combinable on the same component.
- **CSS Data Binding** — component state can be initialized directly from CSS custom properties. This enables CSS-driven configuration: themes, layout parameters, localization strings — all without touching JavaScript.
- **Context from CSS** — the `--ctx` custom property can assign shared context names via the CSS cascade, enabling layout-driven component grouping.
- The `css` helper function returns `CSSStyleSheet` instances with optional processing pipeline (`css.useProcessor()`).

The opt-in Shadow DOM approach is important for widgets and micro-frontends: it lets embedding applications style components normally when isolation is not desired, while still supporting full encapsulation when it is.

## Loose Coupling and Micro-Frontends

This is where Symbiote.js was specifically designed to excel.

Lit components are standard custom elements and work in any framework, but the library itself doesn't provide special architecture for loose coupling. Template `this`-binding, Shadow DOM by default, and decorator-heavy API create a tightly coupled component model.

Symbiote.js was built for agnostic, loosely coupled systems:

- **Templates decouple data from presentation** — the same component can render entirely different UIs via `use-template`.
- **Pop-up binding** — child components access parent data through the DOM hierarchy, like CSS cascading. No import dependencies, no prop drilling.
- **Shared context** — unrelated components cooperate by sharing the same `ctx` name. No wiring, no parent orchestrator.
- **CSS-driven configuration** — components can be configured purely through CSS, without JavaScript.
- **Hybrid rendering** — some components can be server-only, some client-only, some isomorphic — in the same application. Data contexts can mirror this: same API shape on server (database-backed) and client (API-backed).
- **No-JS / Low-code** — components can be fully configured via HTML attributes and CSS, enabling systems where non-developers assemble UIs without writing JavaScript.

## Build Tooling

Both libraries work without a build step and with any standard bundler.

Lit's developer experience leans on TypeScript decorators (`@property()`, `@state()`, `@customElement()`), which benefit from a TypeScript build step. The library itself runs without one, but the idiomatic style assumes a compiler.

Symbiote.js relies on standard JavaScript — ESM imports, class fields, template literals. No decorators, no compiler magic. It supports modern `importmap`-based dependency sharing with CDN imports and works with any common-purpose bundler (esbuild, Rollup, etc.) when needed.

## Built-in Routing

Lit does not include a router. Third-party solutions or custom implementations are needed.

Symbiote.js ships with `AppRouter` — a built-in SPA router (optional import) with:
- Path-based routes with `:param` extraction
- Route guards (`beforeRoute()`)
- Lazy loading (`load: () => import(...)`)
- SSR-safe (creates PubSub context on server, browser APIs skipped automatically)
- Dynamic i18n-ready titles

## Summary

| Aspect | Symbiote.js | Lit |
|--------|-------------|-----|
| **Templates** | Context-free HTML strings, multiple sources, loose coupling | JS-bound tagged templates, tied to `this` |
| **SSR** | Built-in, zero mismatches, streaming, isomorphic mode | Experimental, 3 packages, load-order constraints, mismatch risk |
| **State** | Built-in layered contexts (local, pop-up, shared, named, CSS, computed) | Reactive properties + `@lit/context` (separate package) + external libs |
| **Shadow DOM** | Opt-in | Default |
| **Styling** | `rootStyles` + `shadowStyles` + CSS Data Binding | Shadow-scoped `static styles` |
| **Routing** | Built-in `AppRouter` | None |
| **Bundle** | ~5.9 kb core, ~7.2 kb full | ~5.1 kb core + addons |
| **Architecture** | Loose coupling, micro-frontends, no-JS config | Component-first, decorator-driven |
| **Ecosystem** | Smaller community, focused tooling (JSDA-Kit) | Large community, Google-backed, mature ecosystem |

Lit is a mature, well-supported library with a large community and strong ecosystem. It's a solid choice for teams that want a lightweight framework experience with custom elements.

Symbiote.js is designed for a different set of priorities: maximally loose coupling, template flexibility, built-in state management, and seamless isomorphic rendering — all without external dependencies. If you're building widgets, micro-frontends, or framework-agnostic component libraries, these architectural choices make a practical difference.

And since both Lit and Symbiote.js produce standard custom elements, they can coexist on the same page — alongside raw native web components — without conflicts. You don't have to choose one exclusively; mix them freely within a single project, using each where it fits best.

---

See also: [Symbiote.js documentation](./README.md) · [SSR guide](./ssr.md) · [Context system](./context.md)