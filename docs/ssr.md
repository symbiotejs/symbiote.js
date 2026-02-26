# Server-Side Rendering (SSR)

Symbiote.js provides a simple SSR solution via `node/SSR.js`. It doesn't need a virtual DOM, a reconciler, or framework-specific server packages — just one class.

Requirements: [linkedom](https://github.com/WebReflection/linkedom) (optional peer dependency).

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
| `SSR.processHtml(html)` | `async` — parses HTML string, renders all custom elements, returns processed HTML. Auto-inits if needed |
| `SSR.renderToString(tagName, attrs?)` | Creates element, triggers `connectedCallback`, serializes to HTML string |
| `SSR.renderToStream(tagName, attrs?)` | Async generator — yields HTML chunks (same output as `renderToString`, streamed for lower TTFB) |
| `SSR.destroy()` | Removes global patches, cleans up document |

## Styles in SSR output

- **rootStyles** → `<style>` tag as the first child of the component (light DOM, deduplicated per constructor)
- **shadowStyles** → `<style>` inside the Declarative Shadow DOM `<template>`
- Both are supported simultaneously on the same component

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

## Client-side hydration

On the client, components with `ssrMode = true` skip template injection and attach bindings to the pre-rendered DOM. State mutations update DOM reactively — no reconciliation, no diffing:
```js
class MyComponent extends Symbiote {

  ssrMode = true;

  init$ = {
    count: 0,
    increment: () => {
      this.$.count++;
    },
  }

  renderCallback() {
    // Initialize from server-rendered value:
    this.$.count = parseFloat(this.ref.count.textContent);
  }

}

MyComponent.reg('my-component');
```

### Hydration flow

1. **Server**: `SSR.processHtml()` / `SSR.renderToString()` produces HTML with `bind=` / `itemize=` attributes preserved
2. **Client**: Component with `ssrMode = true` skips template injection, attaches bindings to pre-rendered DOM
3. State mutations on client update DOM reactively

---

Next: [Animations →](./animations.md)
