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

---

Next: [Ecosystem →](./ecosystem.md)
