# CSS Data Binding

Symbiote components can read CSS custom property values into component state. This enables CSS-driven configuration: theme values, layout parameters, localized strings — all settable from CSS without touching JavaScript.

## `cssInit$`

Use `cssInit$` to define properties initialized from CSS custom properties:
```js
class MyWidget extends Symbiote {
  cssInit$ = {
    '--columns': 1,       // fallback value if CSS prop not set
    '--label': '',
  }
}

MyWidget.template = html`
  <span ${{textContent: '--label'}}></span>
`;
```

```css
my-widget {
  --columns: 3;
  --label: 'Click me';
}
```

CSS values are parsed automatically — quoted strings become strings, numbers become numbers.

> Values should be valid JSON, parseable with `JSON.parse()`. Use numbers for boolean flags (`0`/`1`).

## `--` prefix in templates

You can bind to CSS custom properties directly in templates:
```js
class TestApp extends Symbiote {}

TestApp.template = html`
  <h1>{{--header}}</h1>
  <div>{{--text}}</div>
`;
```

```css
:root {
  --header: 'CSS Data';
  --text: 'Hello!';
}
```

> CSS custom properties are used for value initialization only. After that, they act like normal local context properties.

## Updating CSS data

Call `this.updateCssData()` to re-read CSS custom properties after runtime CSS changes.

Call `this.dropCssDataCache()` to clear the cached CSS data.

## Why CSS as data?

- **Browser-native**: CSS custom properties are a platform feature for passing context down the DOM cascade — no JS library needed.
- **Shadow DOM friendly**: CSS custom properties are accessible inside nested shadow roots, unlike other CSS properties.
- **Flexible**: Redefine values at any level using `style` or `class` attributes.
- **Framework-agnostic**: Works with any external framework, library, or meta-platform.
- **CSP-safe**: Unlike inline scripts, CSS is typically allowed by CSP policies — making it ideal for configuration.

---

Next: [Dev Mode →](./dev-mode.md)
