# Routing

Symbiote.js has a built-in SPA routing solution based on the standard [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API).

> In 3.x, `AppRouter` is imported separately from the main package:
> ```js
> import { AppRouter } from '@symbiotejs/symbiote/core/AppRouter.js';
> ```
> Or use the `full` entry point to get everything in one import:
> ```js
> import Symbiote, { html, css, AppRouter } from '@symbiotejs/symbiote/full';
> ```

> [!TIP]
> **Importmap users**: If you resolve `@symbiotejs/symbiote` and `AppRouter` via separate importmap entries (e.g. different CDN URLs), PubSub contexts will still work correctly — `PubSub.globalStore` is shared via `globalThis.__SYMBIOTE_PUBSUB_STORE` across all module copies.

## Path-based routing (recommended)

Routes with the `pattern` property use path-based URLs with `:param` extraction:
```js
import Symbiote, { html } from '@symbiotejs/symbiote';
import { AppRouter } from '@symbiotejs/symbiote/core/AppRouter.js';

const routerCtx = AppRouter.initRoutingCtx('R', {
  home:     { pattern: '/',            title: 'Home', default: true },
  user:     { pattern: '/users/:id',   title: 'User Profile' },
  settings: { pattern: '/settings',    title: 'Settings' },
  notFound: { pattern: '/404',         title: 'Not Found', error: true },
});

// Navigate programmatically:
AppRouter.navigate('user', { id: '42' });
// URL becomes: /users/42

// React to route changes in any component:
class AppShell extends Symbiote {
  renderCallback() {
    this.sub('R/route', (route) => {
      console.log('Route:', route);
    });
    this.sub('R/options', (opts) => {
      console.log('Params:', opts); // { id: '42' }
    });
  }
}

AppShell.template = html`
  <h1>{{R/title}}</h1>
  <div ref="viewport"></div>
`;

AppShell.reg('app-shell');
```

## Query-string routing (legacy/alternative)

Routes **without** `pattern` use query-string mode automatically:
```js
const routerCtx = AppRouter.initRoutingCtx('R', {
  home:  { title: 'Home', default: true },
  about: { title: 'About' },
  error: { title: 'Error...', error: true },
});

AppRouter.navigate('about', { section: 'team' });
// URL becomes: ?about&section=team
```

Mode is auto-detected: routes with `pattern` → path-based, without → query-string.

## Route guards

Register a guard function that runs before every navigation:
```js
let unsub = AppRouter.beforeRoute((to, from) => {
  if (!isAuth && to.route === 'settings') {
    return 'login'; // redirect to 'login' route
  }
  // return false to cancel navigation
  // return nothing to proceed
});

unsub(); // remove guard
```

## Lazy loaded routes

Use `load` in route descriptors for dynamic imports (loaded once, cached):
```js
AppRouter.initRoutingCtx('R', {
  settings: {
    pattern: '/settings',
    title: 'Settings',
    load: () => import('./pages/settings.js'),
  },
});
```

## Static methods

### AppRouter.initRoutingCtx()

```js
initRoutingCtx(id, routingMap)
// > PubSub instance
```

| Argument | Type | Required | Description |
|:--|:--|:--|:--|
| `id` | `String` | yes | Context ID |
| `routingMap` | `Object<string, RouteDescriptor>` | yes | Routing map |

`RouteDescriptor` type:

| Property | Type | Required | Description |
|:--|:--|:--|:--|
| `pattern` | `String` | no | URL path pattern (enables path-based mode) |
| `title` | `String` | no | Page title |
| `default` | `Boolean` | no | Default route |
| `error` | `Boolean` | no | Error (404) route |
| `load` | `Function` | no | Lazy loader `() => import(...)` |

### AppRouter.navigate()

Navigate and dispatch route change event:
```js
AppRouter.navigate('user', { id: '42' });
```

> **Migration note**: `applyRoute()` from 2.x has been renamed to `navigate()` in 3.x.

### AppRouter.reflect()

Update the URL without triggering a route change event:
```js
AppRouter.reflect('user', { id: '42' });
```

### AppRouter.notify()

Read the current URL, run guards, lazy load if needed, and dispatch the route change event:
```js
AppRouter.notify();
```

### AppRouter.readAddressBar()

Read and parse the current URL:
```js
let { route, options } = AppRouter.readAddressBar();
```

### AppRouter.beforeRoute()

Register a route guard. Returns an unsubscribe function:
```js
let unsub = AppRouter.beforeRoute((to, from) => { ... });
unsub();
```

### AppRouter.setRoutingMap()

Extend routes dynamically:
```js
AppRouter.setRoutingMap({
  new_route: { pattern: '/new', title: 'New Section' },
});
```

### AppRouter.setSeparator()

Set custom separator for query-string mode (default: `&`):
```js
AppRouter.setSeparator('@');
```

### AppRouter.setDefaultTitle()

Set default page title when route title is not defined:
```js
AppRouter.setDefaultTitle('My App');
```

### AppRouter.removePopstateListener()

Remove the popstate event listener.

## SSR & isomorphic usage

`AppRouter` is SSR-safe. In Node.js or linkedom environments, `initRoutingCtx()` creates the PubSub context (so `{{R/title}}` bindings resolve during server rendering) while browser-only APIs are skipped automatically:

```js
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';
import { AppRouter } from '@symbiotejs/symbiote/core/AppRouter.js';

await SSR.init();

// Works in both browser and SSR — creates the 'R' context:
AppRouter.initRoutingCtx('R', {
  home: { pattern: '/', title: 'Home', default: true },
  about: { pattern: '/about', title: 'About' },
});

await import('./my-app.js');
let html = SSR.renderToString('my-app');
SSR.destroy();
```

In SSR, `navigate()`, `reflect()`, and `notify()` are no-ops — they return immediately without errors.

---

Next: [SSR →](./ssr.md)
