[![Tests](https://github.com/symbiotejs/symbiote.js/actions/workflows/tests.yml/badge.svg)](https://github.com/symbiotejs/symbiote.js/actions/workflows/tests.yml)
[![npm version](https://img.shields.io/npm/v/@symbiotejs/symbiote)](https://www.npmjs.com/package/@symbiotejs/symbiote)
[![npm downloads](https://img.shields.io/npm/dm/@symbiotejs/symbiote)](https://www.npmjs.com/package/@symbiotejs/symbiote)
![license](https://img.shields.io/badge/license-MIT-green)

# Symbiote.js

<img src="https://rnd-pro.com/svg/symbiote/index.svg" width="200" alt="Symbiote.js">

A lightweight, standards-first UI library built on Web Components. No virtual DOM, no compiler, no black boxes, no excess repaints. No build step required - works directly in the browser. A bundler is recommended for production performance, but entirely optional.

Here are the three most important differences between Symbiote.js and other frameworks:
1. **Natural DOM Extension Philosophy** - designed to extend platform APIs, not to replace them
2. **Runtime-Agnostic HTML Templates** - outstanding flexibility for rendering strategies and further customization
3. **Powerful App-wide State Management** - combine data contexts without bloated boilerplate or external tools

## What's new in v3.x?

- **WebMCP support** - expose live Symbiote UI actions as browser-native tools for agents. See the [WebMCP docs](https://github.com/symbiotejs/symbiote.js/blob/webmcp/docs/webmcp.md).
- **Server-Side Rendering** - render components to HTML with `SSR.processHtml()` or stream chunks with `SSR.renderToStream()`. Client-side hydration via `ssrMode` attaches bindings to existing DOM without re-rendering.
- **Isomorphic components** - `isoMode` flag makes components work in both SSR and client-only scenarios automatically. If server-rendered content exists, it hydrates; otherwise it renders the template from scratch. One component, zero conditional logic.
- **Computed properties refined** - reactive derived state with microtask batching.
- **Path-based router** - optional `AppRouter` module with `:param` extraction, route guards, and lazy loading.
- **Exit animations** - `animateOut(el)` for CSS-driven exit transitions, integrated into itemize API.
- **Dev mode** - `Symbiote.devMode` enables verbose warnings; import `devMessages.js` for full human-readable messages.
- **DSD hydration** - `ssrMode` supports both light DOM and Declarative Shadow DOM.
- **Class property fallback** - binding keys not in `init$` fall back to own class properties/methods.
- **Lazy mode** - `lazyMode` flag defers component initialization and rendering based on viewport visibility. Can also be enabled via the `lazy` attribute on `itemize` containers to efficiently handle massive data sets.
- And [more](https://github.com/symbiotejs/symbiote.js/blob/webmcp/CHANGELOG.md).

## Quick start

No install needed - run this directly in a browser:

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

Or install via npm:

```bash
npm i @symbiotejs/symbiote
```

```js
import Symbiote, { html, css } from '@symbiotejs/symbiote';
```

## Core concepts

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

State changes update the DOM synchronously. No virtual DOM, no scheduling, no surprises. And since components are real DOM elements, state is accessible from the outside via standard APIs:

```js
document.querySelector('my-counter').$.count = 42;
```

This makes it easy to control Symbiote-based widgets and microfrontends from any host application - no framework adapters, just DOM.

### Templates

Templates are plain HTML strings - runtime-agnostic, easy to test, easy to move between files:

```js
// Separate file: my-component.template.js
import { html } from '@symbiotejs/symbiote';

export default html`
  <h1>{{title}}</h1>
  <button ${{onclick: 'doSomething'}}>Go</button>
`;
```

The `html` function supports two interpolation modes:
- **Object** → reactive binding: `${{onclick: 'handler'}}`
- **String/number** → native concatenation: `${pageTitle}`

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

The `^` prefix works in any nested component template - it walks up the DOM tree to find the nearest ancestor that has the property registered in its data context (`init$` or `add$()`):

```html
<!-- Text binding to parent property: -->
<div>{{^parentTitle}}</div>

<!-- Handler binding to parent method: -->
<button ${{onclick: '^parentHandler'}}>Click</button>
```

### Named data contexts

Share state across components without prop drilling:
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

Inspired by native HTML `name` attributes - like how `<input name="group">` groups radio buttons - the `ctx` attribute groups components into a shared data context. Components with the same `ctx` value share `*`-prefixed properties:

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

All three components access the same `*files` state - no parent component, no prop drilling, no global store boilerplate. Just set `ctx="gallery"` in HTML and use `*`-prefixed properties. This makes it trivial to build complex component relationships purely in markup, with ready-made components that don't need to know about each other.

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

### CSS Styling

Shadow DOM is **optional** in Symbiote - use it when you need isolation, skip it when you don't. This gives full flexibility:

**Light DOM** - style components with regular CSS, no barriers:

```js
MyComponent.rootStyles = css`
  my-component {
    display: flex;
    gap: 1rem;

    & button { color: var(--accent); }
  }
`;
```

This style will be applied to nearest upper shadow root, if exists and to common document if not.

**Shadow DOM** - opt-in isolation when needed:

```js
class Isolated extends Symbiote {}

Isolated.shadowStyles = css`
  :host { display: block; }
  ::slotted(*) { margin: 0; }
`;
```

All native CSS features work as expected: CSS variables flow through shadow boundaries, `::part()` exposes internals, modern nesting, `@layer`, `@container` - no framework abstractions in the way. Mix light DOM and shadow DOM components freely in the same app.

### CSS Data

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

- **Complex widgets** embedded in any host application
- **Low-code HTML-based solutions** - simple declarative everything
- **Micro frontends** - standard custom elements, no framework coupling
- **Reusable component libraries** - works in React, Vue, Angular, or plain HTML
- **SSR-powered apps** - lightweight server rendering without framework lock-in
- **Framework-agnostic solutions** - one codebase, any context
- **Modern AI-first web** - expose the application state to WebMCP tools automatically

## Docs & Examples

- [Documentation](https://github.com/symbiotejs/symbiote.js/blob/main/docs/README.md)
- [Lit vs Symbiote.js](https://github.com/symbiotejs/symbiote.js/blob/main/docs/lit-vs-symbiote.md) - Side-by-side comparison
- [Live Examples](https://rnd-pro.com/symbiote/3x/examples/) - Interactive Code Playground
- [JSDA-Kit](https://github.com/rnd-pro/jsda-kit) - All-in-one companion tool: server, SSG, bundling, import maps, and native Symbiote.js SSR integration
- [AI / llms.txt](https://rnd-pro.com/symbiote/llms.txt) — index for AI tools
- [Full docs (single file)](https://rnd-pro.com/symbiote/llms-full.txt) — complete merged reference for AI context
- [Changelog](https://github.com/symbiotejs/symbiote.js/blob/main/CHANGELOG.md)

## Related articles

- [Symbiote.js: superpowers for Web Components](https://dev.to/foxeyes/symbiotejs-superpowers-for-web-components-1gid)
- [Symbiote.js: v3 highlights](https://dev.to/foxeyes/symbiotejs-v3-web-components-with-ssr-in-6kb-10n6)
- [Symbiote.js vs Lit](https://dev.to/foxeyes/lit-vs-symbiotejs-22gj)
- [JSDA Stack - A Revolutionary Simple Approach to Build Modern Web](https://dev.to/foxeyes/jsda-kit-a-revolutionary-simple-approach-to-build-modern-web-1dip)

**Questions or proposals? Welcome to [Symbiote Discussions](https://github.com/symbiotejs/symbiote.js/discussions)!** ❤️

---

© [rnd-pro.com](https://rnd-pro.com) - MIT License
