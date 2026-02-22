# Symbiote.js — AI Context Reference (v3.x)

> **Purpose**: Authoritative reference for AI code assistants. All information is derived from source code analysis of [symbiote.js](https://github.com/symbiotejs/symbiote.js).
> Current version: **3.0.0-rc.1**. Zero dependencies. ~6 KB gzip.

---

## Installation & Import

```js
// NPM
import Symbiote, { html, css, PubSub, DICT } from '@symbiotejs/symbiote';

// CDN / HTTPS
import Symbiote, { html, css } from 'https://esm.run/@symbiotejs/symbiote';

// Individual module imports (tree-shaking)
import Symbiote from '@symbiotejs/symbiote/core/Symbiote.js';
import { PubSub } from '@symbiotejs/symbiote/core/PubSub.js';
import { AppRouter } from '@symbiotejs/symbiote/core/AppRouter.js';
import { html } from '@symbiotejs/symbiote/core/html.js';
import { css } from '@symbiotejs/symbiote/core/css.js';
```

### Full export list (index.js)
`Symbiote` (default), `html`, `css`, `PubSub`, `AppRouter`, `DICT`, `UID`, `setNestedProp`, `applyStyles`, `applyAttributes`, `create`, `kebabToCamel`, `reassignDictionary`

---

## Component Basics

Symbiote extends `HTMLElement`. Every component is a Custom Element.

```js
class MyComponent extends Symbiote {
  // Initial reactive state (key-value pairs)
  init$ = {
    name: 'World',
    count: 0,
    onBtnClick: () => {
      this.$.count++;
    },
  };

  // Called once after init$ is processed but BEFORE template is rendered
  initCallback() {}

  // Called once AFTER template is rendered and attached to DOM
  renderCallback() {
    // Safe to access this.ref, this.$, DOM children here
  }

  // Called when element is disconnected and readyToDestroy is true
  destroyCallback() {}
}

// Template — assigned via static property SETTER, outside the class body
MyComponent.template = html`
  <h1>Hello {{name}}!</h1>
  <p>Count: {{count}}</p>
  <button ${{onclick: 'onBtnClick'}}>Increment</button>
`;

// Register Custom Element tag
MyComponent.reg('my-component');
```

> **CRITICAL**: `template` is a **static property setter** on the `Symbiote` class, not a regular static class field.
> You **MUST** assign it **outside** the class body: `MyComponent.template = html\`...\``.
> Using `static template = html\`...\`` inside the class declaration **will NOT work**.
> Templates are plain HTML strings, NOT JSX. Use the `html` tagged template literal.

### Usage in HTML
```html
<my-component></my-component>
```

---

## Template Binding Syntax

Use the `html` tagged template literal for ergonomic binding syntax. It supports **two interpolation modes**:

- **`Object`** → converted to `bind="prop:key;"` attribute (reactive binding)
- **`string` / `number`** → concatenated as-is (native interpolation, useful for SSR page shells)

This dual-mode design means `html` works for both component templates and full-page SSR output — no separate "server-only template" function is needed.

### Text node binding
```html
<div>{{propName}}</div>
```
Binds `propName` from component state to the text content of a text node. Works inside any element. Multiple bindings in one text node are supported: `{{first}} - {{second}}`.

### Property binding (element's own properties)
```html
<button ${{onclick: 'handlerName'}}>Click</button>
<div ${{textContent: 'myProp'}}></div>
```
The `${{key: 'value'}}` interpolation creates a `bind="key:value;"` attribute. Keys are DOM element property names. Values are component state property names (strings).

**Event handler resolution (3.x):** For `on*` bindings, Symbiote first looks for the key in `init$` (reactive state). If not found, it falls back to a **class method** with the same name. Both approaches work:
```js
class MyComp extends Symbiote {
  // Approach 1: state property (arrow function)
  init$ = { onClick: () => console.log('clicked') };

  // Approach 2: class method (fallback)
  onSubmit() { console.log('submitted'); }
}
```

### Nested property binding
```html
<div ${{'style.color': 'colorProp'}}>Text</div>
```
Dot notation navigates nested properties on the element.

### Direct child component state binding
```html
<child-component ${{'$.innerProp': 'parentProp'}}></child-component>
```
The `$.` prefix accesses the child component's `$` state proxy directly.

### Attribute binding (`@` prefix)
```html
<div ${{'@hidden': 'isHidden'}}>Content</div>
<input ${{'@disabled': 'isDisabled'}}>
<div ${{'@data-value': 'myValue'}}></div>
```
The `@` prefix means "bind to HTML attribute" (not DOM property). For boolean attributes: `true` → attribute present, `false` → attribute removed. `@` is for binding syntax only, do NOT use it as a regular HTML attribute prefix.

### Type casting (`!` / `!!`)
```html
<div ${{'@hidden': '!showContent'}}>...</div>    <!-- inverted boolean -->
<div ${{'@contenteditable': '!!hasText'}}>...</div> <!-- double inversion = cast to boolean -->
```

### Loose-coupling alternative (plain HTML, no JS context needed)
```html
<div bind="textContent: myProp"></div>
<div bind="onclick: handler; @hidden: !flag"></div>
```
This is the raw form. The `html` helper generates it automatically.

---

## Property Token Prefixes

Prefixes control which data context a binding resolves to:

| Prefix | Meaning | Example | Description |
|--------|---------|---------|-------------|
| _(none)_ | Local state | `{{count}}` | Current component's local context |
| `^` | Parent inherited | `{{^parentProp}}` | Walk up DOM ancestry to find nearest component that has this prop |
| `*` | Shared context | `{{*sharedProp}}` | Shared context scoped by `ctx` attribute or CSS `--ctx` |
| `/` | Named context | `{{APP/myProp}}` | Global named context identified by key before `/` |
| `--` | CSS Data | `${{textContent: '--my-css-var'}}` | Read value from CSS custom property |
| `+` | Computed | (in init$) `'+sum': () => ...` | Function recalculated when local dependencies change (auto-tracked) |

### Examples in init$
```js
init$ = {
  localProp: 'hello',           // local
  '*sharedProp': 'shared value', // shared context
  'APP/globalProp': 42,          // named context "APP"
  '+computed': () => this.$.a + this.$.b, // local computed (auto-tracked)
};
```

### Computed properties (v3.x)

Computed props use the `+` prefix and are auto-tracked: dependencies are recorded when the function executes.

**Local computed** — reacts to local state changes automatically:
```js
init$ = {
  a: 1,
  b: 2,
  '+sum': () => this.$.a + this.$.b, // auto-tracks 'a' and 'b'
};
```

**Cross-context computed** — reacts to external named context changes via explicit deps:
```js
init$ = {
  local: 0,
  '+total': {
    deps: ['GAME/score'],
    fn: () => this.$['GAME/score'] + this.$.local,
  },
};
```

> **NOTE**: Computed values are recalculated asynchronously (via `queueMicrotask`), so subscribers are notified in the next microtask, not inline during `pub()`.
```

---

## State Management API

### `$` proxy (read/write state)
```js
this.$.count = 10;          // publish
let val = this.$.count;     // read
this.$['APP/prop'] = 'x';   // named context
this.$['^parentProp'] = 5;  // parent context
```

### `set$(kvObj, forcePrimitives?)` — bulk update
```js
this.set$({ name: 'Jane', count: 5 });
// forcePrimitives=true → triggers callbacks even if value unchanged (for primitives)
```

### `sub(prop, handler, init?)` — subscribe to changes
```js
this.sub('count', (val) => {
  console.log('count changed:', val);
});
// init defaults to true (handler called immediately with current value)
```

### `add(prop, val, rewrite?)` — add property to context
### `add$(obj, rewrite?)` — bulk add

### `has(prop)` — check if property exists in context
### `notify(prop)` — force notification to all subscribers

> **WARNING**: Property keys with nested dots (`prop.sub`) are NOT supported as state keys.
> Use flat names: `propSub` instead of `prop.sub`.

---

## PubSub (Standalone State Management)

```js
import { PubSub } from '@symbiotejs/symbiote';

// Register a named global context
const ctx = PubSub.registerCtx({
  userName: 'Anonymous',
  score: 0,
}, 'GAME'); // 'GAME' is the context key

// Read/write from any component
this.$['GAME/userName'] = 'Player 1';
console.log(this.$['GAME/score']);

// Subscribe from any component
this.sub('GAME/score', (val) => {
  console.log('Score:', val);
});

// Direct PubSub API
ctx.pub('score', 100);
ctx.read('score');
ctx.sub('score', callback);
ctx.multiPub({ score: 100, userName: 'Hero' });
```

### PubSub static methods
- `PubSub.registerCtx(schema, uid?)` → `PubSub` instance
- `PubSub.getCtx(uid, notify?)` → `PubSub` instance or null
- `PubSub.deleteCtx(uid)`

---

## Lifecycle & Instance Properties

### Lifecycle callbacks (override in subclass)
| Method | When called |
|--------|------------|
| `initCallback()` | Once, after state initialized, before render (if `pauseRender=true`) or normally after render |
| `renderCallback()` | Once, after template is rendered and attached to DOM |
| `destroyCallback()` | On disconnect, after 100ms delay, only if `readyToDestroy=true` |

### Constructor flags (set in constructor or as class fields)
| Property | Default | Description |
|----------|---------|-------------|
| `pauseRender` | `false` | Skip automatic rendering; call `this.render()` manually later |
| `renderShadow` | `false` | Render template into Shadow DOM |
| `readyToDestroy` | `true` | Allow cleanup on disconnect |
| `processInnerHtml` | `false` | Process existing inner HTML with template processors |
| `ssrMode` | `false` | **Client-only.** Hydrate server-rendered HTML: skips template injection, attaches bindings to existing DOM. Supports both light DOM and Declarative Shadow DOM. Ignored when `__SYMBIOTE_SSR` is active (server side) |
| `allowCustomTemplate` | `false` | Allow `use-template="#selector"` attribute |
| `ctxOwner` | `false` | Force overwrite shared context props on init |
| `isVirtual` | `false` | Replace element with its template fragment |
| `allowTemplateInits` | `true` | Auto-add props found in template but not in init$ |

### Instance properties (available after render)
- `this.ref` — object map of `ref`-attributed elements
- `this.initChildren` — array of original child nodes (before template render)
- `this.$` — state proxy
- `this.allSubs` — Set of all subscriptions (for cleanup)
---

## Exit Animation (`animateOut`)

`animateOut(el)` sets `[leaving]` attribute, waits for CSS `transitionend`, then removes the element. If no CSS transition is defined, removes immediately. Available as standalone import or `Symbiote.animateOut`.

```js
import { animateOut } from '@symbiotejs/symbiote';
// or: Symbiote.animateOut(el)
```

### CSS pattern

```css
my-item {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s, transform 0.3s;

  /* Enter (CSS-native, no JS needed): */
  @starting-style {
    opacity: 0;
    transform: translateY(20px);
  }

  /* Exit (triggered by animateOut): */
  &[leaving] {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

### Itemize integration

Both itemize processors use `animateOut` automatically for item removal. Items with CSS `transition` + `[leaving]` styles will animate out before being removed from the DOM.

---

## Styling

### rootStyles (Light DOM, adopted stylesheets)
```js
MyComponent.rootStyles = css`
  my-component {
    display: block;
    color: var(--text-color);
  }
`;
```
Styles are added to the closest document root via `adoptedStyleSheets`. Use the custom tag name as selector.

### shadowStyles (Shadow DOM, auto-creates shadow root)
```js
MyComponent.shadowStyles = css`
  :host {
    display: block;
  }
  button {
    color: red;
  }
`;
```
Setting `shadowStyles` automatically creates a Shadow Root and uses `adoptedStyleSheets`.

### addRootStyles / addShadowStyles (append additional sheets)
```js
MyComponent.addRootStyles(anotherSheet);
MyComponent.addShadowStyles(anotherSheet);
```

### `css` tag function
Returns a `CSSStyleSheet` instance (constructable stylesheet). Supports processors:
```js
css.useProcessor((txt) => txt.replaceAll('$accent', '#ff0'));
```

---

## Element References

```js
MyComponent.template = html`
  <input ${{ref: 'nameInput'}}>
  <button ${{ref: 'submitBtn', onclick: 'onSubmit'}}>Submit</button>
`;

// In renderCallback:
this.ref.nameInput.focus();
this.ref.submitBtn.disabled = true;
```

Alternative HTML syntax: `<div ref="myRef"></div>`

---

## Itemize API (Dynamic Lists)

```js
class MyList extends Symbiote {
  init$ = {
    items: [
      { name: 'Alice', role: 'Admin' },
      { name: 'Bob', role: 'User' },
    ],
    onItemClick: (e) => {
      console.log('clicked');
    },
  };
}

MyList.template = html`
  <ul ${{itemize: 'items'}}>
    <template>
      <li>
        <span>{{name}}</span> - <span>{{role}}</span>
        <button ${{onclick: '^onItemClick'}}>Click</button>
      </li>
    </template>
  </ul>
`;
```

> **CRITICAL**: Inside itemize templates, items are full Symbiote components with their own state scope.
> - `{{name}}` — item's own property
> - `${{onclick: 'handler'}}` — binds to the item component's own method/property
> - `${{onclick: '^handler'}}` — use `^` prefix to reach the **parent** component's property
> - Failure to use `^` for parent handlers will result in broken event bindings

### Custom item component
```html
<div ${{itemize: 'items', 'item-tag': 'my-item'}}></div>
```
Then define `my-item` as a separate Symbiote component.

### Data formats
- **Array**: `[{prop: val}, ...]` — items rendered in order
- **Object**: `{key1: {prop: val}, ...}` — items get `_KEY_` property added

### Updating lists
Assign new array to trigger re-render:
```js
this.$.items = [...newItems]; // triggers update
```
Existing items are updated in-place via `set$`, new items appended, excess removed.

---

## Slots (Light DOM)

Slots work without Shadow DOM (processed by `slotProcessor`). Import and add manually since v2.x:

```js
import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';

class MyWrapper extends Symbiote {
  constructor() {
    super();
    this.templateProcessors.add(slotProcessor);
  }
}

MyWrapper.template = html`
  <header><slot name="header"></slot></header>
  <main><slot></slot></main>
`;
```

Usage:
```html
<my-wrapper>
  <h1 slot="header">Title</h1>
  <p>Default slot content</p>
</my-wrapper>
```

---

## Server-Side Rendering (SSR)

Import `core/ssr.js` to render components to HTML strings on the server. Requires `linkedom` (optional peer dependency).

```js
import { initSSR, renderToString, destroySSR } from '@symbiotejs/symbiote/core/ssr.js';

await initSSR(); // patches globals with linkedom env

import './my-component.js'; // component reg() works normally

let html = renderToString('my-component', { title: 'Hello' });
// => '<my-component title="Hello"><h1>Hello</h1></my-component>'

destroySSR(); // cleanup globals
```

### API

| Function | Description |
|----------|-------------|
| `initSSR()` | `async` — creates linkedom document, polyfills CSSStyleSheet/NodeFilter/MutationObserver, patches globals |
| `renderToString(tagName, attrs?)` | Creates element, triggers `connectedCallback`, serializes to HTML string. Shadow DOM → DSD with inlined `<style>` |
| `renderToStream(tagName, attrs?)` | Async generator — yields HTML chunks as it walks the DOM tree. Same output as `renderToString`, but streamed for lower TTFB and memory |
| `destroySSR()` | Removes global patches, cleans up document |

### Streaming usage

```js
import http from 'node:http';
import { initSSR, renderToStream } from '@symbiotejs/symbiote/core/ssr.js';

await initSSR();
import './my-app.js';

http.createServer(async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<!DOCTYPE html><html><body>');
  for await (let chunk of renderToStream('my-app')) {
    res.write(chunk);
  }
  res.end('</body></html>');
}).listen(3000);
```

### Shadow DOM output

Shadow components produce Declarative Shadow DOM markup with styles inlined:
```html
<my-shadow>
  <template shadowrootmode="open">
    <style>:host { display: block; }</style>
    <h1>Content</h1>
  </template>
</my-shadow>
```

### SSR context detection

`initSSR()` sets `globalThis.__SYMBIOTE_SSR = true`. This is separate from the instance `ssrMode` flag:

| Flag | Scope | Purpose |
|------|-------|-------|
| `__SYMBIOTE_SSR` | Server (global) | Preserves binding attributes (`bind`, `ref`, `itemize`) in HTML output. Bypasses `ssrMode` effects |
| `ssrMode` | Client (instance) | Skips template injection, hydrates existing DOM with bindings |

### Hydration flow

1. **Server**: `renderToString()` produces HTML with `bind=` / `itemize=` attributes preserved
2. **Client**: component with `ssrMode = true` skips template injection, attaches bindings to pre-rendered DOM
3. State mutations on client update DOM reactively

---

## Routing (AppRouter)

### Path-based routing (recommended)
```js
import { AppRouter } from '@symbiotejs/symbiote/core/AppRouter.js';

const routerCtx = AppRouter.initRoutingCtx('R', {
  home:     { pattern: '/',            title: 'Home', default: true },
  user:     { pattern: '/users/:id',   title: 'User Profile' },
  settings: { pattern: '/settings',    title: 'Settings' },
  notFound: { pattern: '/404',         title: 'Not Found', error: true },
});

// Navigate programmatically
AppRouter.navigate('user', { id: '42' });
// URL becomes: /users/42

// React to route changes in any component
this.sub('R/route', (route) => console.log('Route:', route));
this.sub('R/options', (opts) => console.log('Params:', opts)); // { id: '42' }
```

### Query-string routing (legacy/alternative)
```js
// Routes WITHOUT `pattern` use query-string mode automatically
const routerCtx = AppRouter.initRoutingCtx('R', {
  home:  { title: 'Home', default: true },
  about: { title: 'About' },
});
AppRouter.navigate('about', { section: 'team' });
// URL becomes: ?about&section=team
```

### Route guards
```js
// Register guard — runs before every navigation
let unsub = AppRouter.beforeRoute((to, from) => {
  if (!isAuth && to.route === 'settings') {
    return 'login'; // redirect
  }
  // return false to cancel, nothing to proceed
});

unsub(); // remove guard
```

### Lazy loaded routes
```js
AppRouter.initRoutingCtx('R', {
  settings: {
    pattern: '/settings',
    title: 'Settings',
    load: () => import('./pages/settings.js'), // loaded once, cached
  },
});
```

### AppRouter API
- `AppRouter.initRoutingCtx(ctxName, routingMap)` → PubSub
- `AppRouter.navigate(route, options?)` — navigate and dispatch event
- `AppRouter.reflect(route, options?)` — update URL without triggering event
- `AppRouter.notify()` — read URL, run guards, lazy load, dispatch event
- `AppRouter.beforeRoute(fn)` — register guard, returns unsubscribe fn
- `AppRouter.setRoutingMap(map)` — extend routes
- `AppRouter.readAddressBar()` → `{ route, options }`
- `AppRouter.setSeparator(char)` — default `&` (query-string mode)
- `AppRouter.setDefaultTitle(title)`
- `AppRouter.removePopstateListener()`
- Mode auto-detected: routes with `pattern` → path-based, without → query-string

---

## Attribute Binding

```js
class MyComponent extends Symbiote {
  init$ = {
    '@name': '',  // reads from HTML attribute `name` automatically
  };
}
MyComponent.bindAttributes({
  'value': 'inputValue',  // maps HTML attr `value` → state prop `inputValue`
});
// observedAttributes is auto-populated
```

---

## CSS Data Binding

Read CSS custom property values into component state:

```js
class MyComponent extends Symbiote {
  cssInit$ = {
    '--accent-color': '#ff0',  // fallback value
  };
}
```

Or in template:
```html
<div ${{textContent: '--my-css-prop'}}>...</div>
```

Update with: `this.updateCssData()` / `this.dropCssDataCache()`.

---

## Component Registration

```js
// Explicit tag name
MyComponent.reg('my-component');

// Auto-generated tag (sym-1, sym-2, ...)
MyComponent.reg();

// Alias registration (creates a subclass)
MyComponent.reg('my-alias', true);

// Get tag name (auto-registers if needed)
const tag = MyComponent.is; // 'my-component'
```

---

## Utilities

```js
import { UID } from '@symbiotejs/symbiote';
UID.generate('XXXXX-XXX'); // e.g. 'aB3kD-z9Q'

import { create, applyStyles, applyAttributes } from '@symbiotejs/symbiote';
let el = create({ tag: 'div', attributes: { id: 'x' }, styles: { color: 'red' }, children: [...] });

import { reassignDictionary } from '@symbiotejs/symbiote';
reassignDictionary({ BIND_ATTR: 'data-bind' }); // customize internal attribute names
```

---

## Dev Mode

Enable verbose warnings during development:
```js
Symbiote.devMode = true;
```

**Always-on** (regardless of `devMode`):
- `[Symbiote]` prefixed warnings for PubSub errors, duplicate tags, type mismatches, router issues
- `this` in template interpolation error (`html` tag detects `${this.x}` usage)

**Dev-only** (`devMode = true`):
- Unresolved binding keys — warns when a template binding auto-initializes to `null` (likely typo)

---

## Common Mistakes to Avoid

1. **DON'T** use `this` in template strings — templates are decoupled from component context
2. **DON'T** nest property keys with dots in state: `'obj.prop'` won't work as a state key
3. **DON'T** forget `^` prefix when referencing **parent** component properties from itemize items
4. **DON'T** use `@` prefix directly in HTML — it's only for binding syntax (`${{'@attr': 'prop'}}`)
5. **DON'T** treat `init$` as a regular object — it's processed at connection time
6. **DON'T** define `template` inside the class body (`static template = html\`...\`` won't work) — it's a static property **setter**, assign it outside: `MyComponent.template = html\`...\``. Same applies to `rootStyles` and `shadowStyles`.
7. **DON'T** expect Shadow DOM by default — use `renderShadow = true` or `shadowStyles` to opt in
8. **DON'T** wrap Custom Elements in extra divs — the custom tag IS the wrapper
9. **DON'T** use CSS frameworks (Tailwind, etc.) — use native CSS with custom properties
10. **DON'T** use `require()` — ESM only (import/export)
