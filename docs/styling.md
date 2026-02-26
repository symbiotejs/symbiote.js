# Styling

Symbiote.js utilizes the [CSSStyleSheet API](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet) for efficient in-memory style manipulation. It works similarly to the styles of built-in browser elements (inputs, video tags), but you have full control.

This API also helps parse CSS rules in JavaScript without Content Security Policy (CSP) violations.

You can style your components using any other styling approach — or combine them. Symbiote components support regular stylesheets for Document or Shadow Roots.

## Style interfaces

Every Symbiote component has two major static style interfaces:

### rootStyles (Light DOM)

Creates and adds a stylesheet via `adoptedStyleSheets` to the closest root in the document:
```js
class MyComponent extends Symbiote {}

MyComponent.rootStyles = css`
  my-component {
    display: block;
    color: var(--text-color);

    & button {
      color: var(--accent);
    }
  }
`;

MyComponent.reg('my-component');
```

Use the custom tag name as the CSS selector.

### shadowStyles (Shadow DOM)

Creates and adds a stylesheet to the component's Shadow Root. If the Shadow Root doesn't exist, it's created automatically:
```js
class MyComponent extends Symbiote {}

MyComponent.shadowStyles = css`
  :host {
    display: block;
  }
  button {
    color: red;
  }
`;

MyComponent.reg('my-component');
```

> You can combine shadow scope styles with external scope styles for maximum control.

### addRootStyles / addShadowStyles

Append additional stylesheets:
```js
MyComponent.addRootStyles(anotherSheet);
MyComponent.addShadowStyles(anotherSheet);
```

## `css` tag function

The `css` tag function returns a `CSSStyleSheet` instance (constructable stylesheet):
```js
import { css } from '@symbiotejs/symbiote';

let styles = css`
  h1 {
    color: red;
  }
`;
```

### CSS processing

You can add processing via `css.useProcessor()`:
```js
css.useProcessor((cssText) => {
  return cssText.replaceAll('red', 'green');
});
```

Or add a processing sequence:
```js
class MyComponent extends Symbiote {}

let randomTag = 'tag-' + Math.round(Math.random() * Date.now());
MyComponent.reg(randomTag);

css.useProcessor(
  (cssText) => cssText.replaceAll(' blue;', ' green;'),
  (cssText) => cssText.replaceAll('random-tag', randomTag),
);

MyComponent.rootStyles = css`
  random-tag {
    background-color: blue;
  }
`;
```

## SSR style output

When using [server-side rendering](./ssr.md):
- **rootStyles** → emitted as `<style>` tag as the first child of the component (light DOM, deduplicated per constructor)
- **shadowStyles** → emitted inside the Declarative Shadow DOM `<template>`
- Both are supported simultaneously on the same component

---

Next: [Routing →](./routing.md)
