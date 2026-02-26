# Dev Mode

Enable verbose warnings during development to catch common mistakes early.

## Enabling

```js
Symbiote.devMode = true;
```

This also sets `PubSub.devMode = true`.

## Always-on warnings

These warnings are active regardless of the `devMode` flag:

- `[Symbiote]` prefixed warnings for PubSub errors, duplicate tag registrations, type mismatches, and router issues
- `this` in template interpolation — `html` tag detects `${this.x}` usage and fires `console.error` (templates are context-free)

## Dev-only warnings

These additional warnings are enabled only when `devMode = true`:

- **Unresolved binding keys** — warns when a template binding auto-initializes to `null` (likely a typo)
- **`*prop` without context** — warns when `*`-prefixed properties are used without a `ctx` attribute or `--ctx` CSS variable (shared context won't be created)
- **`*prop` conflict** — warns when a later component tries to set a different initial value for the same shared property

## Usage

Enable `devMode` in development and disable for production:
```js
// development
Symbiote.devMode = true;

// production — no overhead, all dev checks are fully gated
```

---

Next: [Security →](./security.md)
