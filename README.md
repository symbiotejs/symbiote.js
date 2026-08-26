[![Tests](https://github.com/symbiotejs/symbiote.js/actions/workflows/tests.yml/badge.svg)](https://github.com/symbiotejs/symbiote.js/actions/workflows/tests.yml)
[![npm version](https://img.shields.io/npm/v/@symbiotejs/symbiote)](https://www.npmjs.com/package/@symbiotejs/symbiote)
[![npm downloads](https://img.shields.io/npm/dm/@symbiotejs/symbiote)](https://www.npmjs.com/package/@symbiotejs/symbiote)
![license](https://img.shields.io/badge/license-MIT-green)

# Symbiote.js

<img src="https://rnd-pro.com/svg/symbiote/index.svg" width="200" alt="Symbiote.js">

Symbiote.js is a lightweight, standards-first UI library built on Web Components. It extends Custom Elements with reactive data bindings, portable HTML templates, app-wide state, routing, and SSR. It works directly with browser APIs and updates bound DOM properties without virtual DOM reconciliation or excess repainting. The library has zero runtime dependencies and needs neither a compiler nor a build step. A bundler remains optional, though it is recommended for production performance.

## Why Symbiote.js?

**Runtime Agnostic Templates (RAT)** are the main reason. A Symbiote.js template is an HTML string that describes markup and named bindings. It is independent of a component instance, render function, runtime, and templating tool. You can define, customize, compose, render, and reuse it at any point in the application lifecycle, on the client or the server.

RAT keeps UI structure, data bindings, and actions declarative across client rendering, SSR, SSG, and hybrid rendering. Because the template remains a plain HTML string, a component can work beside other UI frameworks without converting its template to framework-specific syntax.

Three design choices define the library:

1. Runtime Agnostic Templates keep representation separate from component logic and make templates portable across runtimes and rendering strategies.
2. Direct DOM extension keeps components as real Custom Elements that standard browser APIs can inspect and control.
3. App-wide state connects components without prop drilling. Named contexts provide the data sources, while namespace bindings such as `APP/user` give templates and components explicit access to them.

## What's new in v3.x?

- WebMCP support exposes live Symbiote UI actions as browser-native tools for agents. See the [WebMCP docs](https://github.com/symbiotejs/symbiote.js/blob/webmcp/docs/webmcp.md).
- Server-side rendering uses `SSR.processHtml()` for complete HTML or `SSR.renderToStream()` for streamed chunks. On the client, `ssrMode` attaches bindings to existing DOM without rendering it again.
- The `isoMode` flag lets one component work in SSR and client-only scenarios without environment-specific component logic. It hydrates server-rendered content when present and otherwise renders the template from scratch.
- Computed properties provide reactive derived state with microtask batching.
- The optional `AppRouter` module supports path parameters, route guards, and lazy loading.
- The `animateOut(el)` helper provides CSS-driven exit transitions and integrates with the Itemize API.
- `Symbiote.devMode` enables verbose warnings. Import `devMessages.js` for full, human-readable messages.
- `ssrMode` hydrates both Light DOM and Declarative Shadow DOM.
- Binding keys absent from `init$` fall back to the component's own class properties and methods.
- The `lazyMode` flag defers component initialization and rendering until it enters the viewport. The `lazy` attribute provides the same behavior for `itemize` containers with large data sets.

## Quick start

Run this example directly in a browser without installing the package:

```html
<script type="module">
  import Symbiote, { html } from 'https://esm.run/@symbiotejs/symbiote';

  class MyCounter extends Symbiote {
    count = 0;
    increment() {
      this.$.count++;
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

For npm-based projects:

```bash
npm i @symbiotejs/symbiote
```

```js
import Symbiote, { html, css } from '@symbiotejs/symbiote';
```

## Core concepts

### Runtime Agnostic Templates (RAT)

A template is a plain HTML string that describes markup and named bindings. It does not run inside a component instance or close over `this`; Symbiote.js resolves the component and data context when the template is rendered or hydrated. Templates can be tested, moved between files, and reused across browser and server environments.

```js
// Separate file: my-component.template.js
import { html } from '@symbiotejs/symbiote';

export default html`
  <h1>{{title}}</h1>
  <button ${{onclick: 'doSomething'}}>Go</button>
`;
```

The `html` function supports two interpolation modes:

- An object creates a reactive binding: `${{onclick: 'handler'}}`
- A string or number uses native concatenation: `${pageTitle}`

### Reactive state

```js
class TodoItem extends Symbiote {
  text = '';
  done = false;
  toggle() {
    this.$.done = !this.$.done;
  }
}

TodoItem.template = html`
  <span ${{onclick: 'toggle'}}>{{text}}</span>
`;
```

State changes update bound DOM properties synchronously, without a virtual DOM or scheduler. Because components are real DOM elements, their state is also accessible through standard APIs:

```js
document.querySelector('my-counter').$.count = 42;
```

Any host application can control a Symbiote.js widget or microfrontend through the DOM API. It does not need a framework adapter.

### Itemize (dynamic reactive lists)

Render lists from data arrays or objects with efficient updates:
```js
class TaskList extends Symbiote {
  tasks = [
    { name: 'Buy groceries' },
    { name: 'Write docs' },
  ];
}

TaskList.template = html`
  <ul itemize="tasks">
    <template>
      <li>{{name}}</li>
    </template>
  </ul>
`;
```

### Pop-up binding (`^`)

In a nested component template, the `^` prefix walks up the DOM tree and finds the nearest ancestor with the requested property in its data context (`init$` or `add$()`):

```html
<!-- Text binding to parent property: -->
<div>{{^parentTitle}}</div>

<!-- Handler binding to parent method: -->
<button ${{onclick: '^parentHandler'}}>Click</button>
```

### Namespace bindings and named contexts

A named context is an app-wide data source. A namespace binding such as `APP/user` gives components and templates explicit access to that source without prop drilling:

```js
import { PubSub, html } from '@symbiotejs/symbiote';

PubSub.registerCtx({
  user: 'Alex',
  theme: 'dark',
}, 'APP');

// Any component can read/write:
this.$['APP/user'] = 'New name';

// Any template can use property directly:
let template = html`<h2>{{APP/user}}</h2>`;
```

### Shared context (`*`)

Shared contexts follow the same idea as the native HTML `name` attribute used to group radio buttons. The `ctx` attribute assigns components to a shared data context, and components with the same value can use the same `*`-prefixed properties:

```html
<upload-btn ctx="gallery"></upload-btn>
<file-list  ctx="gallery"></file-list>
<status-bar ctx="gallery"></status-bar>
```

```js
class UploadBtn extends Symbiote {
  init$ = { '*files': [] }

  onUpload() {
    this.$['*files'] = [...this.$['*files'], newFile];
  }
}

class FileList extends Symbiote {
  init$ = { '*files': [] }
}

class StatusBar extends Symbiote {
  init$ = { '*files': [] }
}
```

All three components access the same `*files` state. Setting `ctx="gallery"` in HTML and using `*`-prefixed properties removes the need for a parent coordinator, prop drilling, or global store boilerplate. This allows markup to describe complex relationships between reusable components that do not need direct knowledge of one another.

### Application routing

```js
// Import optional module:
import { AppRouter } from '@symbiotejs/symbiote/core/AppRouter.js';

AppRouter.initRoutingCtx('R', {
  home:    { pattern: '/' },
  profile: { pattern: '/user/:id' },
  about:   { pattern: '/about', lazyComponent: () => import('./about.js') },
});
```

### CSS styling

Shadow DOM is optional in Symbiote.js. Use it when a component needs isolation; otherwise, let the component participate in the page's regular styling.

Light DOM components use regular CSS:

```js
MyComponent.rootStyles = css`
  my-component {
    display: flex;
    gap: 1rem;

    & button { color: var(--accent); }
  }
`;
```

Symbiote.js applies this style to the nearest containing shadow root, when one exists, or to the document.

Use Shadow DOM for opt-in isolation:

```js
class Isolated extends Symbiote {}

Isolated.shadowStyles = css`
  :host { display: block; }
  ::slotted(*) { margin: 0; }
`;
```

Native CSS features remain available. CSS variables cross shadow boundaries, `::part()` exposes selected internals, and modern nesting, `@layer`, and `@container` work without framework abstractions. Light DOM and Shadow DOM components can coexist in the same application.

### CSS data

Components can read CSS custom property values to initiate reactive state:

```css
my-widget {
  --label: 'Click me';
}
```

```js
class MyWidget extends Symbiote {...}

MyWidget.template = html`
  <span>{{--label}}</span>
`;
```

## Best for

- Complex widgets embedded in any host application
- Low-code, HTML-based interfaces with declarative bindings for UI, data, and actions
- Microfrontends built from standard Custom Elements without framework coupling
- Reusable component libraries for React, Vue, Angular, or plain HTML
- SSR applications that need lightweight server rendering without framework lock-in
- Framework-agnostic solutions that reuse one codebase across contexts
- Agent-facing web applications that expose state and actions through WebMCP

## Docs and examples

- [Documentation](https://github.com/symbiotejs/symbiote.js/blob/main/docs/README.md)
- [Live examples](https://rnd-pro.com/symbiote/3x/examples/): interactive code playground
- [JSDA-Kit](https://github.com/rnd-pro/jsda-kit): companion tooling for the server, SSG, bundling, import maps, and native Symbiote.js SSR integration
- [AI / llms.txt](https://rnd-pro.com/symbiote/llms.txt): index for AI tools
- [Full docs (single file)](https://rnd-pro.com/symbiote/llms-full.txt): complete merged reference for AI context

## Related articles

- [Symbiote.js: superpowers for Web Components](https://dev.to/foxeyes/symbiotejs-superpowers-for-web-components-1gid)
- [Symbiote.js: v3 highlights](https://dev.to/foxeyes/symbiotejs-v3-web-components-with-ssr-in-6kb-10n6)
- [Symbiote.js vs Lit](https://dev.to/foxeyes/lit-vs-symbiotejs-22gj)
- [JSDA Stack - A Revolutionary Simple Approach to Build Modern Web](https://dev.to/foxeyes/jsda-kit-a-revolutionary-simple-approach-to-build-modern-web-1dip)

Questions and proposals are welcome in [Symbiote Discussions](https://github.com/symbiotejs/symbiote.js/discussions).

---

© [rnd-pro.com](https://rnd-pro.com), MIT License
