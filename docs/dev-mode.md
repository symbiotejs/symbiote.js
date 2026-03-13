# Dev Mode

Enable verbose warnings during development to catch common mistakes early.

## Enabling

```js
Symbiote.devMode = true;
```

This also sets `PubSub.devMode = true`.

## Dev messages module

All warning and error messages are stored in an optional module. Without it, warnings print short numeric codes like `[Symbiote W5]`. Import the dev messages module once to get full human-readable messages and automatically enable `devMode`:

```js
import '@symbiotejs/symbiote/core/devMessages.js';
```

This single import enables the full dev experience — both verbose messages and dev-only diagnostics. It is typically added in your development entry point and removed (or excluded via tree-shaking) for production builds.

## Warning codes reference

| Code | Type | Guard | Description |
|------|------|-------|-------------|
| W1 | warn | always | PubSub: cannot read/publish/subscribe — property not found |
| W2 | warn | devMode | PubSub: type change detected on publish |
| W3 | warn | always | PubSub: context already registered |
| W4 | warn | always | PubSub: context not found |
| W5 | warn | always | Custom template selector not found |
| W6 | warn | devMode | `*prop` used without `ctx` attribute or `--ctx` CSS variable |
| W7 | warn | devMode | Shared prop already has a value — keeping existing |
| W8 | warn | always | Tag already registered with a different class |
| W9 | warn | always | CSS data parse error |
| W10 | warn | devMode | CSS data binding will not read computed styles during SSR |
| W11 | warn | devMode | Binding key not found in `init$` (auto-initialized to `null`) |
| W12 | warn | devMode | Text-node binding has no hydration attribute in SSR/ISO mode |
| W13 | warn | always | AppRouter message |
| W14 | warn | always | History API is not available |
| E15 | error | always | `this` used in template interpolation |
| W16 | warn | always | Itemize data must be Array or Object |

## Usage

Enable `devMode` and load messages in development, omit for production:
```js
// development — one import does it all
import '@symbiotejs/symbiote/core/devMessages.js';

// or, if you only want devMode without full messages:
Symbiote.devMode = true;

// production — no overhead, all dev checks are fully gated,
// messages module is not loaded
```

---

Next: [Security →](./security.md)
