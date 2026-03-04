# Security

## Trusted Types

Symbiote.js is compatible with strict Content Security Policy (CSP) headers that require [Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API).

Template `innerHTML` writes use a Trusted Types policy when the API is available:
```js
// Symbiote creates a passthrough policy automatically:
// trustedTypes.createPolicy('symbiote', { createHTML: (s) => s })
```

### CSP configuration

To use Symbiote.js with strict Trusted Types:
```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types symbiote
```

The policy name is `'symbiote'`.

> No sanitization is performed — templates are developer-authored, not user input. The policy exists to satisfy the Trusted Types API requirement.

## CSP nonce for SSR styles

When using [SSR](./ssr.md), component styles (`rootStyles` / `shadowStyles`) are serialized as inline `<style>` tags. A strict `style-src` CSP policy will block these unless you provide a **nonce**.

All SSR methods accept an optional `{ nonce }` parameter:
```js
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';

let nonce = crypto.randomUUID(); // generate per request

let html = await SSR.processHtml('<my-app></my-app>', { nonce });
// or
let html = SSR.renderToString('my-app', {}, { nonce });
```

Output:
```html
<my-app><style nonce="...">my-app { display: block; }</style>...</my-app>
```

Then set a matching CSP header:
```
Content-Security-Policy: style-src 'nonce-<value>'
```

> On the client side, Symbiote.js applies styles via `adoptedStyleSheets`, which is CSP-safe and requires no nonce.

---

Next: [Ecosystem →](./ecosystem.md)
