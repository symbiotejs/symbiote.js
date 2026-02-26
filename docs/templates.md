# Templates

The core template mechanic in Symbiote.js is native browser HTML-string parsing via standard DOM API methods. That's the fastest way to create a component template instance in the object model representation.

## `html` helper

The `html` tag function constructs templates using compact binding-maps:
```js
import { html } from '@symbiotejs/symbiote';

const myTemplate = html`
  <button ${{onclick: 'onBtnClick'}}>Click me!</button>
`;
```
In this example, we created the button and connected it to a `onBtnClick` handler, which should be defined in the component state.

Every binding-map is a simple JavaScript object that describes connections between the element's own properties and the component's data. It is standard JavaScript template literal syntax with no special additions.

### Dual-mode interpolation

The `html` function supports two interpolation modes:

- **Object** → converted to `bind="prop:key;"` attribute (reactive binding)
- **String / number** → concatenated as-is (native interpolation, useful for SSR page shells)

This dual-mode design means `html` works for both component templates and full-page SSR output — no separate "server-only template" function is needed.

> Note: In Symbiote.js, you can define templates outside the component's context (`this`). This is a clean abstraction that makes template handling much more flexible than in other libraries.

## Binding to text nodes

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

class MyComponent extends Symbiote {

  init$ = {
    name: 'John',
    btnTxt: 'Click me!',
    onBtnClick: () => {
      console.log('Button clicked!');
    },
  }

}

MyComponent.template = html`
  <h1>Hello {{name}}!</h1>
  <button ${{onclick: 'onBtnClick'}}>{{btnTxt}}</button>
`;
```
Text node bindings use double braces syntax — `{{myProp}}`. Multiple bindings in one text node are supported: `{{first}} - {{second}}`.

## Binding to element properties

```js
MyComponent.template = html`
  <button ${{onclick: 'handlerName'}}>Click</button>
  <div ${{textContent: 'myProp'}}></div>
`;
```
The `${{key: 'value'}}` interpolation creates a `bind="key:value;"` attribute. Keys are DOM element property names. Values are component state property names (strings).

### Event handler resolution (3.x)

For `on*` bindings, Symbiote first looks for the key in `init$` (reactive state). If not found, it falls back to a **class method** with the same name:
```js
class MyComp extends Symbiote {
  // Approach 1: state property (arrow function)
  init$ = { onClick: () => console.log('clicked') };

  // Approach 2: class method (fallback)
  onSubmit() { console.log('submitted'); }
}
```

## Binding to nested properties

Symbiote.js allows binding to nested properties of elements:
```js
MyComponent.template = html`
  <div ${{'style.color': 'myCssValue'}}>Some text...</div>
`;
```

You can also bind to a nested component's state directly, using the `$` proxy:
```js
MyComponent.template = html`
  <my-component ${{'$.nestedPropName': 'propName'}}></my-component>
`;
```

## Binding to HTML attributes

To bind a property to an element's attribute, use the `@` prefix:
```js
MyComponent.template = html`
  <div ${{'@hidden': 'isHidden'}}></div>
  <input ${{'@disabled': 'isDisabled'}}>
  <div ${{'@data-value': 'myValue'}}></div>
`;
```
The `@` prefix means "bind to HTML attribute" (not DOM property). For boolean attributes: `true` → attribute present, `false` → attribute removed.

> `@` is for binding syntax only — do NOT use it as a regular HTML attribute prefix.

## Type casting

You can cast any property value to `boolean` using `!`:

Inversion:
```js
html`<div ${{'@hidden': '!showContent'}}> ... </div>`;
```

Double inversion (cast to boolean):
```js
html`<div ${{'@contenteditable': '!!hasText'}}> ... </div>`;
```

## Property tokens (key prefixes)

| Prefix | Meaning | Example |
|--------|---------|---------|
| _(none)_ | Local state | `{{count}}` |
| `^` | Parent inherited | `{{^parentProp}}` |
| `*` | Shared context | `{{*sharedProp}}` |
| `/` | Named context | `{{APP/myProp}}` |
| `--` | CSS Data | `${{textContent: '--my-css-var'}}` |
| `+` | Computed | `'+sum': () => ...` |

> More details in the [Context](./context.md) section.

## Loose-coupling alternative

Templates can be written as plain HTML without any JavaScript context — the `html` helper generates this automatically:
```html
<div bind="textContent: myProp"></div>
<div bind="onclick: handler; @hidden: !flag"></div>
```

## Slots

[Slots](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot) allow you to define placeholders in your template that can be filled with external markup.

Since 2.x, slot processing must be imported and added explicitly:
```js
import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';

class MyWrapper extends Symbiote {
  constructor() {
    super();
    this.templateProcessors.add(slotProcessor);
  }
}

MyWrapper.template = html`
  <header><slot name="header"></slot></header>
  <main><slot></slot></main>
`;
```

Usage:
```html
<my-wrapper>
  <h1 slot="header">Title</h1>
  <p>Default slot content</p>
</my-wrapper>
```

## Element references

Use the `ref` attribute to get element references in your code:
```js
html`
  <div>
    <input ${{ref: 'nameInput'}}>
    <button ${{ref: 'submitBtn', onclick: 'onSubmit'}}>Submit</button>
  </div>
`;
```
Or the plain HTML form:
```html
<div ref="myRef"></div>
```

Reference names should be unique. Access them via `this.ref`:
```js
class MyComponent extends Symbiote {
  renderCallback() {
    this.ref.nameInput.focus();
    this.ref.submitBtn.disabled = true;
  }
}
```

## Dynamic list rendering

To render efficient dynamic reactive lists, use the `itemize` API:
```js
class MyComponent extends Symbiote {
  init$ = {
    listData: [
      { firstName: 'John', secondName: 'Snow' },
      { firstName: 'Jane', secondName: 'Stone' },
    ],
  }
}

MyComponent.template = html`
  <h1>My list:</h1>
  <ul itemize="listData">
    <template>
      <li>{{firstName}} - {{secondName}}</li>
    </template>
  </ul>
`;
```

> More information about `itemize` API in the [List Rendering](./list-rendering.md) section.

## External customizable templates

Symbiote.js allows components to connect templates defined in the common HTML document.

Set the `allowCustomTemplate` flag:
```js
class MyComponent extends Symbiote {
  allowCustomTemplate = true;
}
```

Define templates in markup:
```html
<template id="first">
  <h1>{{headingText}}</h1>
</template>

<template id="second">
  <h2>{{headingText}}!</h2>
</template>
```

Use them:
```html
<my-component use-template="#first"></my-component>
<my-component use-template="#second"></my-component>
```

---

Next: [Properties →](./properties.md)
