# Context

Usage context is one of the central things in Symbiote.js. Every Symbiote component is able to analyze its environment, read external settings from its actual position in DOM, and provide data to related components. Symbiote.js utilizes the DOM structure as the basic entity for data flow management and interconnection.

Component context is a sum of all accessible data sources. Each source represents its own type of interaction. Let's have a look at them.

## Local context

Local context properties work the same way as component state in most other libraries:
```js
class MyComponent extends Symbiote {

  init$ = {
    myProperty: 'some value',
  }

}
```

Use the `$` proxy to read and write values:
```js
class MyComponent extends Symbiote {

  init$ = {
    myProperty: 'some value',
  }

  renderCallback() {
    // Read:
    console.log(this.$.myProperty); // > 'some value'

    // Write:
    this.$.myProperty = 'new value';
  }

}

MyComponent.template = html`
  <h1>{{myProperty}}</h1>
`;
```

## Named context

Named context is an external abstract data source accessed by its name. It can contain any application data or be used for a dedicated purpose.

Example — using named context as a localization tool:
```js
import Symbiote, { html, PubSub } from '@symbiotejs/symbiote';

// Create localization map for English:
let EN = {
  users: 'Users',
  comments: 'Comments',
  likes: 'Likes',
};

// Create localization context:
let l10nCtx = PubSub.registerCtx(EN, 'L10N');

// Use localized strings in templates:
class MyComponent extends Symbiote { ... }

MyComponent.template = html`
  <div>{{L10N/users}} - {{numberOfUsers}}</div>
  <div>{{L10N/comments}} - {{numberOfComments}}</div>
  <div>{{L10N/likes}} - {{numberOfLikes}}</div>
`;
```

Use `/` token with the context key to access properties: `L10N/users`.

Switching language:
```js
let ES = {
  users: 'Usuarios',
  comments: 'Comentarios',
  likes: 'Gustos',
};

l10nCtx.multiPub(ES);
```

Read and modify named context properties with the `$` proxy:
```js
class MyComponent extends Symbiote {
  renderCallback() {
    // Read:
    console.log(this.$['L10N/users']);

    // Modify:
    this.$['L10N/users'] = 'ユーザー';
  }
}
```

More information about `PubSub` in the [PubSub section](./pubsub.md).

## Inherited context

Property inheritance helps control component interactions based on their DOM position and hierarchy. It works similarly to the CSS cascade model.

Use the `^` token to reference a higher-level property:
```js
class MyComponent extends Symbiote {}

MyComponent.template = html`
  <button ${{onclick: '^onButtonClicked'}}>Click me!</button>
`;
```
Symbiote walks up the DOM tree until it finds the component with `onButtonClicked` defined.

This is useful for composition, customization, and responsibility splitting:
```js
html`
  <my-text-editor>
    <complete-toolbar></complete-toolbar>
  </my-text-editor>
`;
```
Or:
```js
html`
  <my-text-editor>
    <simplified-toolbar></simplified-toolbar>
    <symbol-counter></symbol-counter>
  </my-text-editor>
`;
```

> Like in CSS, inherited properties have no collision guard — use additional prefixes in uncontrolled environments.

## Shared context

Shared context works similarly to native HTML radio inputs — set the `name` attribute and different inputs connect into one workflow.

In 3.x, an explicit context name is **required** for shared properties. Set it using the `ctx` HTML attribute:
```html
<upload-btn ctx="gallery"></upload-btn>
<file-list ctx="gallery"></file-list>
```

Or using the `--ctx` CSS custom property:
```css
.gallery-section {
  --ctx: gallery;
}
```
```html
<div class="gallery-section">
  <upload-btn></upload-btn>
  <file-list></file-list>
</div>
```

The CSS approach is useful when:
- You want **layout-driven grouping** — components inherit the context from their visual container rather than repeating the attribute on each one
- You need to **reassign context at different DOM levels** — just like any CSS custom property, `--ctx` cascades and can be overridden in nested selectors
- You work in a **framework-agnostic setup** — CSS can be managed separately from markup, so context assignment doesn't depend on template engine or host framework

Then use the `*` token to define shared properties:
```js
class UploadBtn extends Symbiote {
  init$ = { '*files': [] }

  onUpload() {
    this.$['*files'] = [...this.$['*files'], newFile];
  }
}

class FileList extends Symbiote {
  init$ = { '*files': [] }  // same shared prop — first-registered value wins
}
```

Both components access the same `*files` state — no parent component, no prop drilling, no global store.

### Context name resolution

The context name is resolved in this order (first match wins):

1. `ctx="name"` HTML attribute
2. `--ctx` CSS custom property (inherited from ancestors)

> **IMPORTANT**: In 3.x, `*` properties **require** an explicit `ctx` attribute or `--ctx` CSS variable. Without one, the shared context is not created, `*` props have no effect, and dev mode will warn about it.

## CSS Data context

Symbiote components can initiate their properties from CSS custom property values:
```css
:root {
  --header: 'CSS Data';
  --text: 'Hello!';
}
```

> CSS custom property values should be valid JSON values, parseable with `JSON.parse()`. Use numbers for boolean flags (`0`/`1`).

Use CSS values in templates directly:
```js
class TestApp extends Symbiote {}

TestApp.template = html`
  <h1>{{--header}}</h1>
  <div>{{--text}}</div>
`;
```

> CSS custom properties are used for value initialization only. After that, they act like normal local context properties.

More details in the [CSS Data](./css-data.md) section.

## Property token summary

| Token | Context Type | Example |
|-------|-------------|---------|
| _(none)_ | Local | `myProperty` |
| `^` | Inherited | `^parentProp` |
| `*` | Shared | `*sharedProp` |
| `/` | Named | `APP/myProp` |
| `--` | CSS Data | `--my-css-var` |
| `@` | Attribute | `@my-attribute` |
| `+` | Computed | `+computedProp` |

---

Next: [List Rendering →](./list-rendering.md)
