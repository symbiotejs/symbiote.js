# Routing

Symbiote.js has a built-in SPA routing solution based on the standard [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API).

For HTML-only applications, the optional foundation provides [`sym-router`](../html-app/README.md#declarative-routing), a declarative adapter to this same router.

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
initRoutingCtx(id, routingMap, options)
// > PubSub instance
```

| Argument | Type | Required | Description |
|:--|:--|:--|:--|
| `id` | `String` | yes | Context ID |
| `routingMap` | `Object<string, RouteDescriptor>` | yes | Routing map |

Optional `options.signal` removes the context's route-event listener when aborted. An existing named context is reused without replacement; missing route-state fields are initialized. The context owner remains responsible for releasing its store and, when it owns the application router, calling `removePopstateListener()`.

`RouteDescriptor` type:

| Property | Type | Required | Description |
|:--|:--|:--|:--|
| `pattern` | `String` | no | URL path pattern (enables path-based mode) |
| `title` | `String \| Function` | no | Page title (string or `() => string` for dynamic/localized titles) |
| `default` | `Boolean` | no | Default route |
| `error` | `Boolean` | no | Error (404) route |
| `load` | `Function` | no | Lazy loader `() => import(...)` |

### AppRouter.navigate()

Navigate and dispatch the route change event. The returned promise resolves after native guards and loading complete:
```js
await AppRouter.navigate('user', { id: '42' });
```

URL options are copied before path substitution. Query values are encoded and decoded. A newer navigation or map configuration prevents an obsolete asynchronous guard/loader from publishing over current state.

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

Read and parse the current URL, or supply a URL/location-like object without changing browser history:
```js
let { route, options } = AppRouter.readAddressBar();
let target = AppRouter.readAddressBar(new URL(link.href));
```

Malformed percent encoding produces an unmatched route instead of throwing.

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

Pass `true` as the second argument to replace the map and reset route defaults and path/query mode. Patterns compile before the new map takes effect, so an invalid pattern leaves the previous configuration intact. The default behavior remains additive.

### AppRouter.setSeparator()

Set custom separator for query-string mode (default: `&`):
```js
AppRouter.setSeparator('@');
```

### AppRouter.setDefaultTitle()

Set default page title when route title is not defined. Accepts a string or a function:
```js
AppRouter.setDefaultTitle('My App');
AppRouter.setDefaultTitle(() => i18n.t('app.title'));
```

### Dynamic titles (i18n)

Both route `title` and `defaultTitle` accept a function `() => string` that is called at navigation time. This enables localized or computed page titles:
```js
AppRouter.initRoutingCtx('R', {
  home: {
    pattern: '/',
    title: () => t('pages.home'),
    default: true,
  },
  about: {
    pattern: '/about',
    title: () => t('pages.about'),
  },
});

AppRouter.setDefaultTitle(() => t('app.title'));
```
The function is re-evaluated on every `navigate()` / `notify()`, so language changes take effect on the next navigation.

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
