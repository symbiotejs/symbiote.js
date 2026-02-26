# Migration Guide: 2.x → 3.x

## Breaking Changes

### `AppRouter.applyRoute()` → `AppRouter.navigate()`

```js
// 2.x:
AppRouter.applyRoute('settings', { tab: 'general' });

// 3.x:
AppRouter.navigate('settings', { tab: 'general' });
```

### `AppRouter` removed from main entry point

```js
// 2.x:
import { AppRouter } from '@symbiotejs/symbiote';

// 3.x:
import { AppRouter } from '@symbiotejs/symbiote/core/AppRouter.js';
```

### `tplProcessors` → `templateProcessors`

The `addTemplateProcessor()` method is removed. Use native `Set` methods:
```js
// 2.x:
this.addTemplateProcessor(myProcessor);

// 3.x:
this.templateProcessors.add(myProcessor);
```

### Computed properties: cross-context requires explicit deps

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

### Shared context (`*prop`) simplified

- Removed `ctxOwner` flag and `ctx-owner` HTML attribute
- First-registered value always wins
- Dev-mode warnings when `*prop` used without `ctx` attribute

## New Features

### Server-Side Rendering

`SSR` class with static methods for server-side rendering:
```js
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';

await SSR.init();
await import('./my-app.js');
let html = await SSR.processHtml('<my-app>content</my-app>');
SSR.destroy();
```

See [SSR documentation](./ssr.md).

### Path-based routing

Routes with `pattern` key use path-based URLs with `:param` extraction:
```js
AppRouter.initRoutingCtx('R', {
  home: { pattern: '/', title: 'Home', default: true },
  user: { pattern: '/users/:id', title: 'User' },
});
// /users/42 → { route: 'user', options: { id: '42' } }
```

Query-string routes remain fully backward compatible. See [Routing documentation](./routing.md).

### Route guards

```js
let unsub = AppRouter.beforeRoute((to, from) => {
  if (!isAuth && to.route === 'settings') return 'login';
});
```

### Lazy loaded routes

```js
{ pattern: '/settings', load: () => import('./pages/settings.js') }
```

### Exit animations

`animateOut(el)` for CSS-driven exit transitions:
```css
my-item {
  transition: opacity 0.3s;
  &[leaving] { opacity: 0; }
}
```

See [Animations documentation](./animations.md).

### Event handler method fallback

`on*` bindings fall back to class methods when no `init$` property found:
```js
class MyComp extends Symbiote {
  onSubmit() { console.log('submitted'); }
}
```

### Dev mode

```js
Symbiote.devMode = true;
```

Enables verbose warnings for unresolved bindings, tag names, and context issues. See [Dev Mode documentation](./dev-mode.md).

### `destructionDelay`

Configurable delay (default 100ms) before cleanup in `disconnectedCallback`:
```js
class MyComp extends Symbiote {
  destructionDelay = 500;
}
```

### `reg()` returns the class

Enables:
```js
export default MyComponent.reg('my-component');
```

### Trusted Types

Template writes use `'symbiote'` Trusted Types policy when available. See [Security documentation](./security.md).

### Declarative Shadow DOM hydration

`ssrMode = true` hydrates pre-rendered content (light DOM + `<template shadowrootmode>`). See [SSR documentation](./ssr.md).

## Performance Improvements

- **Computed properties**: per-instance dependency tracking — up to **676× faster** for local computeds
- **Microtask batching**: all computed recalculation uses `queueMicrotask` instead of `setTimeout`
- **`$` proxy fast path**: `get` and `set` traps bypass parsing for local props
- **`PubSub.pub()` direct value pass**: eliminates redundant `read()` on every update
- **`txtNodesProcessor` early exit**: skips scanning when template contains no `{{` tokens
- **Dev warnings gated**: type-mismatch checks have zero overhead in production
- **Optional keyed itemize processor**: up to **3×** faster for appends, **32×** for no-ops

## Fixes

- `css()` trailing `undefined` when no interpolations exist
- `new DocumentFragment()` → `document.createDocumentFragment()` for linkedom compatibility
- `txtNodesProcessor` null check for `fr.textContent` in SSR environments
