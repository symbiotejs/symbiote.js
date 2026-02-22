[![npm version](https://badge.fury.io/js/@symbiotejs%2Fsymbiote.svg)](https://badge.fury.io/js/@symbiotejs%2Fsymbiote)

# Symbiote.js

A lightweight, standards-first UI library built on Web Components. No virtual DOM, no compiler, no build step required — works directly in the browser. A bundler is recommended for production performance, but entirely optional. **~6kb** gzipped.

Symbiote.js gives you the convenience of a modern framework while staying close to the native platform — HTML, CSS, and DOM APIs. Components are real custom elements that work everywhere: in any framework, in plain HTML, or in a micro-frontend architecture.

## What's new in 3.x

- **Server-Side Rendering** — render components to HTML on the server with `renderToString()` or stream chunks with `renderToStream()`. Client-side hydration via `ssrMode` attaches bindings to existing DOM without re-rendering.
- **Computed properties** — reactive derived state with microtask batching.
- **Path-based router** — `AppRouter` with `:param` extraction, route guards, and lazy loading.
- **Exit animations** — `animateOut(el)` for CSS-driven exit transitions, integrated into itemize.
- **Dev mode** — `Symbiote.devMode` enables verbose warnings for unresolved bindings.
- **DSD hydration** — `ssrMode` supports both light DOM and Declarative Shadow DOM.

## Quick start

No install needed — run this directly in a browser:

```html
<script type="module">
  import Symbiote, { html } from 'https://esm.sh/@symbiotejs/symbiote';

  class MyCounter extends Symbiote {
    init$ = {
      count: 0,
      increment: () => {
        this.$.count++;
      },
    }
  }

  MyCounter.template = html`
    <h2>{{count}}</h2>
    <button ${{onclick: 'increment'}}>Click me!</button>
  `;

  MyCounter.reg('my-counter');
</script>

<my-counter></my-counter>
```

Or install via npm:

```bash
npm i @symbiotejs/symbiote
```

```js
import Symbiote, { html, css } from '@symbiotejs/symbiote';
```

## SSR — simpler than you'd expect

Symbiote's SSR doesn't need a virtual DOM, a reconciler, or framework-specific server packages. It's three functions:

```js
import { initSSR, renderToString, destroySSR } from '@symbiotejs/symbiote/core/ssr.js';

await initSSR();              // patches globals with linkedom
await import('./my-app.js');  // your components register normally

let html = renderToString('my-app');  // full HTML string
destroySSR();                 // cleanup
```

On the client, components with `ssrMode = true` skip template injection and attach bindings to the existing DOM. State mutations work immediately — no hydration step, no reconciliation, no diffing.

### Streaming

For large pages, stream HTML chunks instead of building a string:

```js
import { renderToStream } from '@symbiotejs/symbiote/core/ssr.js';

http.createServer(async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<!DOCTYPE html><html><body>');
  for await (let chunk of renderToStream('my-app')) {
    res.write(chunk);
  }
  res.end('</body></html>');
}).listen(3000);
```

### How it compares

| | **Symbiote.js** | **Next.js (React)** | **Lit** (`@lit-labs/ssr`) |
|--|----------------|---------------------|--------------------------|
| **Architecture** | Binding-based. Client attaches to existing DOM | Virtual DOM. Client re-renders and diffs against server HTML | Template-based with comment markers |
| **Hydration** | `ssrMode = true` — one flag, no diffing | `hydrateRoot()` — must produce identical output or errors | Requires `ssr-client` + hydrate support module loaded before Lit |
| **Packages** | 1 module (`core/ssr.js`) + `linkedom` peer dep | Next.js framework (full buy-in) | 3 packages: `ssr`, `ssr-client`, `ssr-dom-shim` |
| **Streaming** | `renderToStream()` async generator | `renderToPipeableStream()` | Iterable `RenderResult` |
| **Mismatch handling** | Not needed — bindings attach to whatever DOM exists | Hard errors or visual glitches if server/client output differs | N/A |
| **Component code** | Same code, no changes | Server Components vs Client Components split | Same code, but load-order constraints |
| **Template output** | Clean HTML with `bind=` attributes | HTML with framework markers | HTML with `<!--lit-part-->` comment markers |
| **Bundle impact** | Zero — SSR module is server-only | React runtime required on client | Zero — SSR packages are server-only |
| **Lock-in** | None — standard Web Components | Full framework commitment | Lit-specific, but Web Components |

**Key insight:** Symbiote's SSR is simpler because it doesn't try to reconcile server and client output. The server produces HTML with binding attributes preserved. The client reads those attributes and adds reactivity. No comparison, no diffing, no mismatch errors.

## Core concepts

### Reactive state

```js
class TodoItem extends Symbiote {
  init$ = {
    text: '',
    done: false,
    toggle: () => {
      this.$.done = !this.$.done;
    },
  }
}

TodoItem.template = html`
  <span ${{textContent: 'text', onclick: 'toggle'}}></span>
`;
```

State changes update the DOM synchronously. No virtual DOM, no scheduling, no surprises.

### Templates

Templates are plain HTML strings — context-free, easy to test, easy to move between files:

```js
// Separate file: my-component.template.js
import { html } from '@symbiotejs/symbiote';

export default html`
  <h1>{{title}}</h1>
  <button ${{onclick: 'doSomething'}}>Go</button>
`;
```

The `html` function supports two interpolation modes:
- **Object** → reactive binding: `${{textContent: 'myProp'}}`
- **String/number** → native concatenation: `${pageTitle}`

### Itemize (lists)

Render lists from data arrays with efficient diffing:

```js
class TaskList extends Symbiote {
  init$ = {
    tasks: [
      { name: 'Buy groceries' },
      { name: 'Write docs' },
    ],
  }
}

TaskList.template = html`
  <ul itemize="tasks">
    <template>
      <li>{{name}}</li>
    </template>
  </ul>
`;
```

### Named data contexts

Share state across components without prop drilling:

```js
import { PubSub } from '@symbiotejs/symbiote';

PubSub.registerCtx({
  user: 'Alex',
  theme: 'dark',
}, 'APP');

// Any component can read/write:
this.$['APP/user'] = 'New name';
```

### Routing

```js
import { AppRouter } from '@symbiotejs/symbiote/core/AppRouter.js';

AppRouter.initRoutingCtx('R', {
  home:    { pattern: '/' },
  profile: { pattern: '/user/:id' },
  about:   { pattern: '/about', lazyComponent: () => import('./about.js') },
});
```

### Exit animations

CSS-driven transitions with zero JS animation code:

```css
task-item {
  opacity: 1;
  transition: opacity 0.3s;

  @starting-style { opacity: 0; }  /* enter */
  &[leaving] { opacity: 0; }       /* exit  */
}
```

`animateOut(el)` sets `[leaving]`, waits for `transitionend`, then removes. Itemize uses this automatically.

## Best for

- **Complex widgets** embedded in any host application
- **Micro frontends** — standard custom elements, no framework coupling
- **Reusable component libraries** — works in React, Vue, Angular, or plain HTML
- **SSR-powered apps** — lightweight server rendering without framework lock-in
- **Framework-agnostic solutions** — one codebase, any context

## Bundle size

| Library | Minified | Gzip | Brotli |
|---------|----------|------|--------|
| **Symbiote.js** (full) | 18.4 kb | 6.6 kb | **5.9 kb** |
| **Lit** (LitElement + html + css) | 15.1 kb | 5.8 kb | **5.3 kb** |
| **React + ReactDOM** | 188.8 kb | 58.8 kb | **50.6 kb** |

Symbiote and Lit have similar base sizes, but Symbiote's **5.9 kb** includes more powerful features: global state management, exit animations, computed properties etc. Lit needs additional packages for comparable features. React is **~10× larger** before adding a router, state manager, or SSR framework.

## Browser support

All modern browsers: Chrome, Firefox, Safari, Edge, Opera.

## Docs

- [Documentation](https://rnd-pro.com/symbiote/)
- [Code Playground](https://rnd-pro.com/symbiote/2x/docs/live-examples/)
- [AI Reference](./AI_REFERENCE.md)
- [Changelog](./CHANGELOG.md)

**Questions or proposals? Welcome to [Symbiote Discussions](https://github.com/symbiotejs/symbiote.js/discussions)!** ❤️
