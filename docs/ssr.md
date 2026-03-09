# Server-Side Rendering (SSR)

Symbiote.js provides a simple SSR solution via `node/SSR.js`. It doesn't need a virtual DOM, a reconciler, or framework-specific server packages — just one class.

Requirements: [linkedom](https://github.com/WebReflection/linkedom) (optional peer dependency).

### Install linkedom

```
npm install linkedom
```

> [!NOTE]
> Minimum supported version is `0.16.0`. linkedom is listed as an optional peer dependency, so it won't be installed automatically with Symbiote.js — you need to add it yourself when using SSR features.


```js
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';
```

## Basic usage — `processHtml`

Process any HTML string, render all Symbiote components found within, and return the result:
```js
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';

await SSR.init();                 // patches globals with linkedom env
await import('./my-component.js'); // component reg() works normally

let html = await SSR.processHtml('<div><my-component></my-component></div>');
// => '<div><my-component><style>...</style><template shadowrootmode="open">...</template>content</my-component></div>'

SSR.destroy();                    // cleanup globals
```

If `SSR.init()` was already called, `processHtml` reuses the existing environment; otherwise it auto-initializes and auto-destroys after.

## Using `html` helper on the server

You can define server-side templates using the `html` helper — it outputs clean HTML with `bind=` attributes:
```js
import { html } from '@symbiotejs/symbiote/core/html.js';

export default html`
<my-component>
  <h2 ${{textContent: 'count'}} ref="count">0</h2>
  <button ${{onclick: 'increment'}}>Click me!</button>
</my-component>
`;
```

This transforms to:
```html
<my-component>
  <h2 ref="count" bind="textContent: count">0</h2>
  <button bind="onclick: increment">Click me!</button>
</my-component>
```

## `renderToString`

Render a single component to an HTML string:
```js
await SSR.init();
await import('./my-component.js');

let html = SSR.renderToString('my-component', { title: 'Hello' });
// => '<my-component title="Hello"><h1>Hello</h1></my-component>'

SSR.destroy();
```

## Streaming — `renderToStream`

For large pages, stream HTML chunks instead of building a string:
```js
import http from 'node:http';
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';

await SSR.init();
await import('./my-app.js');

http.createServer(async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<!DOCTYPE html><html><body>');
  for await (let chunk of SSR.renderToStream('my-app')) {
    res.write(chunk);
  }
  res.end('</body></html>');
}).listen(3000);
```

## API reference

| Method | Description |
|--------|-------------|
| `SSR.init()` | `async` — creates linkedom document, polyfills CSSStyleSheet/NodeFilter/MutationObserver/adoptedStyleSheets, patches globals |
| `SSR.processHtml(html, options?)` | `async` — parses HTML string, renders all custom elements, returns processed HTML. Auto-inits if needed |
| `SSR.renderToString(tagName, attrs?, options?)` | Creates element, triggers `connectedCallback`, serializes to HTML string |
| `SSR.renderToStream(tagName, attrs?, options?)` | Async generator — yields HTML chunks (same output as `renderToString`, streamed for lower TTFB) |
| `SSR.destroy()` | Removes global patches, cleans up document |

**Options:**

| Property | Type | Description |
|----------|------|-------------|
| `nonce` | `string` | CSP nonce value to add to generated `<style>` tags. See [Security → CSP nonce](./security.md#csp-nonce-for-ssr-styles) |

## Styles in SSR output

- **rootStyles** → `<style>` tag as the first child of the component (light DOM, deduplicated per constructor)
- **shadowStyles** → `<style>` inside the Declarative Shadow DOM `<template>`
- Both are supported simultaneously on the same component

### CSP nonce

Pass `{ nonce }` to add a `nonce` attribute to all generated `<style>` tags for [CSP compliance](./security.md#csp-nonce-for-ssr-styles):
```js
let html = await SSR.processHtml('<my-app></my-app>', { nonce: 'abc123' });
// <style nonce="abc123">...</style>
```

On the client, styles are applied via `adoptedStyleSheets` — no nonce needed.

## Shadow DOM output

Shadow components produce Declarative Shadow DOM markup with styles inlined:
```html
<my-shadow>
  <style>my-shadow { display: block; }</style>
  <template shadowrootmode="open">
    <style>:host { color: red; }</style>
    <h1>Content</h1>
    <slot></slot>
  </template>
  Light DOM content here
</my-shadow>
```

## SSR context detection

`SSR.init()` sets `globalThis.__SYMBIOTE_SSR = true`. This is separate from the instance `ssrMode` flag:

| Flag | Scope | Purpose |
|------|-------|---------|
| `__SYMBIOTE_SSR` | Server (global) | Preserves binding attributes (`bind`, `ref`, `itemize`) in HTML output. Bypasses `ssrMode` effects |
| `ssrMode` | Client (instance) | Skips template injection, hydrates existing DOM with bindings |
| `isoMode` | Client (instance) | Isomorphic mode: hydrates if children exist, renders template otherwise |

> [!IMPORTANT]
> **SSR rendering is synchronous.** Async subscription callbacks (e.g. with `await import(...)`) will not affect SSR output — the HTML is serialized before the callback resolves. Any state that must appear in SSR output should be initialized synchronously via class properties or `init$`.

## Client-side hydration

Use `isoMode = true` to make components work in both SSR and client-only scenarios. It detects children automatically: hydrates pre-rendered content when it exists, renders from template otherwise. No conditional logic needed:

```js
class MyComponent extends Symbiote {
  isoMode = true;
  count = 0;
  increment() {
    this.$.count++;
  }
}

MyComponent.template = html`
  <h2 ${{textContent: 'count'}} ref="count">0</h2>
  <button ${{onclick: 'increment'}}>Click me!</button>
`;
MyComponent.reg('my-component');
```

> [!TIP]
> `isoMode` is the recommended default for isomorphic components. It works correctly whether the component was server-rendered or created dynamically on the client.

### Hydration flow

1. **Server**: `SSR.processHtml()` / `SSR.renderToString()` produces HTML with `bind=` / `itemize=` attributes preserved
2. **Client**: `isoMode` detects pre-rendered children → attaches bindings to existing DOM (no template injection)
3. State mutations on client update DOM reactively

> [!WARNING]
> **Text-node bindings (`{{prop}}`) are not hydratable.** They produce no `bind=` attribute in SSR output, so the client has no marker to re-attach the binding. The server-rendered value will display correctly, but won't update on the client. Use `${{textContent: 'prop'}}` for text that must stay reactive after hydration. Enable `devMode` to see warnings for this.

> [!WARNING]
> **CSS data bindings (`cssInit$`, `--prop`) use fallback values during SSR.** Computed styles are not available on the server — `getCssData()` returns `null` and the init value is used instead. If your component relies on CSS-driven configuration, ensure the `cssInit$` fallback is a sensible server-side default. Enable `devMode` to see warnings for this.

### `ssrMode` — strict SSR-only

For components that are **always** server-rendered and never created client-side, you can use `ssrMode = true` instead. Unlike `isoMode`, it unconditionally skips template injection — the component must have pre-rendered content:

```js
class MyComponent extends Symbiote {
  ssrMode = true;
  // ...
}
```

---

Next: [SSR and Your Server Setup →](./ssr-server.md) · [Animations →](./animations.md)
