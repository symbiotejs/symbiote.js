# Context

Context is the central concept in Symbiote.js. Rather than passing data through prop chains or maintaining a separate global store, Symbiote uses the DOM structure itself as the data flow graph. Every component can read from and write to multiple data sources - its **context** is the union of all the sources currently accessible to it.

There are seven context types, each addressed by a token prefix in property keys:

| Token | Context Type | Scope |
|-------|-------------|-------|
| _(none)_ | [Local](#local-context) | Component instance |
| `^` | [Pop-up](#pop-up-context) | Nearest ancestor that owns the property |
| `*` | [Shared](#shared-context) | All components sharing a `ctx` attribute |
| `name/` | [Named](#named-context) | Any component, anywhere |
| `--` | [CSS Data](#css-data-context) | Inherited from the CSS cascade |
| `@` | [Attribute](./attributes.md) | HTML attribute on the element |
| `+` | [Computed](./properties.md#computed-properties) | Derived, auto-recalculated value |

---

## Local context

Local context is the component's own reactive state, scoped to the instance. It works the same way as component state in other frameworks and is invisible to other components.

Define properties in `init$`:
```js
class MyComponent extends Symbiote {
  init$ = {
    myProperty: 'some value',
  }
}
```

Use the `$` proxy to read and write values at runtime:
```js
class MyComponent extends Symbiote {
  init$ = {
    myProperty: 'some value',
  }

  renderCallback() {
    console.log(this.$.myProperty); // > 'some value'
    this.$.myProperty = 'new value';
  }
}

MyComponent.template = html`
  <h1>{{myProperty}}</h1>
`;
```

For simple components without shared or computed props, you can also declare properties as plain class fields - Symbiote picks them up automatically via class-field fallback:
```js
class MyComponent extends Symbiote {
  count = 0;
  label = 'Hello';
}
```

> Use `init$` when you need shared (`*`), computed (`+`), or attribute (`@`) props in the same declaration - those tokens are only recognized inside `init$`.

See [Properties →](./properties.md) for the full property API: `add$()`, `sub()`, `set$()`, computed props, and more.

---

## Named context

Named context is a global, named data store created independently of any component. Any component can read from or write to it using the `CONTEXT_NAME/property` syntax - regardless of DOM position.

Use named context when data must be shared across unrelated parts of the application.

**Creating a named context:**
```js
import { PubSub } from '@symbiotejs/symbiote';

let appCtx = PubSub.registerCtx({
  theme: 'light',
  user: null,
}, 'APP');
```

**Accessing it from a component:**
```js
class MyComponent extends Symbiote {
  init$ = {
    'APP/theme': 'light', // optional local fallback - used if the named context hasn't published yet
  }

  renderCallback() {
    console.log(this.$['APP/theme']); // read
    this.$['APP/theme'] = 'dark';     // write - updates the named context for all subscribers
  }
}

MyComponent.template = html`
  <div ${{'@class': 'APP/theme'}}>...</div>
`;
```

**Example - localization:**
```js
import Symbiote, { html, PubSub } from '@symbiotejs/symbiote';

let l10nCtx = PubSub.registerCtx({
  users: 'Users',
  comments: 'Comments',
  likes: 'Likes',
}, 'L10N');

MyComponent.template = html`
  <div>{{L10N/users}} - {{numberOfUsers}}</div>
  <div>{{L10N/comments}} - {{numberOfComments}}</div>
  <div>{{L10N/likes}} - {{numberOfLikes}}</div>
`;

// Switch language at any time - all subscribed components update instantly:
l10nCtx.multiPub({
  users: 'Usuarios',
  comments: 'Comentarios',
  likes: 'Gustos',
});
```

You can also read and modify named context directly from any component using the `$` proxy:
```js
class MyComponent extends Symbiote {
  renderCallback() {
    console.log(this.$['L10N/users']);
    this.$['L10N/users'] = 'ユーザー';
  }
}
```

More information about `PubSub` in the [PubSub →](./pubsub.md) section.

---

## Pop-up context

Pop-up context lets a child component reach a property defined by an ancestor, without the ancestor needing to pass it down explicitly. Symbiote walks up the DOM tree until it finds a component that has the requested property in its data context.

Use the `^` token to reference a pop-up property - in both text bindings and event handlers:
```html
<!-- Text binding to ancestor property: -->
<div>{{^parentTitle}}</div>

<!-- Handler binding to ancestor method: -->
<button ${{onclick: '^onButtonClicked'}}>Click me!</button>
```

```js
class MyButton extends Symbiote {}

MyButton.template = html`
  <span>{{^parentTitle}}</span>
  <button ${{onclick: '^onButtonClicked'}}>Click me!</button>
`;
```

Symbiote walks up the DOM tree until it finds a component with the requested property registered in its context:
```js
class MyEditor extends Symbiote {
  init$ = {
    onButtonClicked: () => console.log('clicked'),
    editorTitle: 'My Editor',
  }
}
```

> [!IMPORTANT]
> Pop-up lookup only searches the **data context** (properties registered via `init$` or `add$()`). Plain class properties are not resolved this way. Always declare `^`-targeted properties in the parent's `init$`:
> ```js
> class ParentComponent extends Symbiote {
>   init$ = {
>     onButtonClicked: () => console.log('clicked'),
>     parentTitle: 'Hello',
>   }
> }
> ```

Pop-up context is useful for composition - the same child component adapts to whichever ancestor provides the expected behavior:
```js
html`
  <my-text-editor>
    <complete-toolbar></complete-toolbar>
  </my-text-editor>
`;
// or:
html`
  <my-text-editor>
    <simplified-toolbar></simplified-toolbar>
    <symbol-counter></symbol-counter>
  </my-text-editor>
`;
```

> Like the CSS cascade, pop-up context has no collision guard. Use additional prefixes (e.g. `myApp_onSave`) in environments you don't fully control.

---

## Shared context

Shared context is inspired by native HTML `name` attributes - the same way `<input name="group">` connects radio buttons into one workflow, the `ctx` attribute connects Symbiote components into a shared data context. Components with the same `ctx` name access a common reactive store with no intermediary component required.

**Assign a context name via the `ctx` HTML attribute:**
```html
<upload-btn ctx="gallery"></upload-btn>
<file-list ctx="gallery"></file-list>
```

**Or via the `--ctx` CSS custom property**, which cascades like any CSS variable:
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
- You want **layout-driven grouping** - components inherit context from their visual container rather than repeating the attribute on each one
- You need to **override context at different DOM levels** - just like any CSS custom property, `--ctx` cascades and can be reassigned in nested selectors
- You work in a **framework-agnostic setup** - CSS context assignment is independent of the host template engine

**Define shared properties with the `*` token:**
```js
class UploadBtn extends Symbiote {
  init$ = { '*files': [] }

  onUpload(newFile) {
    this.$['*files'] = [...this.$['*files'], newFile];
  }
}

class FileList extends Symbiote {
  init$ = { '*files': [] }  // same shared prop - first-registered value wins
}
```

Both components read and write the same `*files` store. When one updates it, the other reacts automatically - no parent component, no prop drilling, no global store.

### Context name resolution

The `ctx` name is resolved in this order (first match wins):

1. `ctx="name"` HTML attribute on the element
2. `--ctx` CSS custom property inherited from ancestors

> **IMPORTANT**: In Symbiote 3.x, `*` properties **require** an explicit `ctx` attribute or `--ctx` variable. Without one, no shared context is created, `*` props have no effect, and dev mode will warn (W6).

---

## CSS Data context

Symbiote components can initialize their properties from CSS custom property values, enabling CSS-driven configuration: theme tokens, layout parameters, or localized strings - all settable from a stylesheet without touching JavaScript.

Use `cssInit$` to explicitly declare CSS-initialized properties with fallback values:
```js
class MyWidget extends Symbiote {
  cssInit$ = {
    '--columns': 1,
    '--label': '',
  }
}

MyWidget.template = html`
  <span>{{--label}}</span>
`;
```

```css
my-widget {
  --columns: 3;
  --label: 'Click me';
}
```

You can also use `--` bindings directly in templates without `cssInit$`:
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

> CSS custom property values must be valid JSON - use quoted strings (`'text'`), numbers, and `0`/`1` for booleans.

> CSS properties are used for **initialization only**. After the component mounts, they act as normal local context properties and no longer track CSS changes. Call `this.updateCssData()` to re-read them after runtime CSS updates.

Full details - `updateCssData()`, `dropCssDataCache()`, `ResizeObserver` patterns, and SSR caveats - in the [CSS Data →](./css-data.md) section.

---

## Choosing the right context type

| Situation | Use |
|-----------|-----|
| Component-local reactive state | Local - no token |
| Behavior or data passed from an ancestor | Pop-up - `^` |
| Sibling components sharing a workflow state | Shared - `*` |
| App-wide data, accessed from anywhere in the tree | Named - `/` |
| Component configured via CSS / design tokens | CSS Data - `--` |
| Reacting to HTML attribute values | Attribute - `@` |
| Values derived from other properties | Computed - `+` |

---

## All context types in one component

A concise example showing local, attribute, named, shared, and pop-up contexts working together:

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

class MyApp extends Symbiote {
  init$ = {
    localCtxProp: 'LOCAL',
    '@attr-test': '',         // bound to HTML attribute
    'APP/namedProp': 'NAMED', // named context
    '*sharedProp': 'SHARED',  // shared context (requires ctx="..." in HTML)
  }

  onUpdate() {
    let suffix = ' updated';
    this.$.localCtxProp += suffix;
    this.$['APP/namedProp'] += suffix;
    this.$['*sharedProp'] += suffix;
  }
}

MyApp.template = html`
  <div>local: {{localCtxProp}}</div>
  <div>attribute: {{@attr-test}}</div>
  <div>named: {{APP/namedProp}}</div>
  <div>shared: {{*sharedProp}}</div>
  <button ${{onclick: 'onUpdate'}}>Update</button>
  <inner-el></inner-el>  <!-- reads ^localCtxProp via pop-up -->
`;

MyApp.reg('my-app');

class InnerEl extends Symbiote {}
InnerEl.template = html`<h2>pop-up: {{^localCtxProp}}</h2>`;
InnerEl.reg('inner-el');
```

```html
<my-app attr-test="HTML value" ctx="my-ctx"></my-app>
```

---

## Property token summary

| Token | Context Type | Example |
|-------|-------------|---------|
| _(none)_ | Local | `myProperty` |
| `^` | Pop-up | `^parentProp` |
| `*` | Shared | `*sharedProp` |
| `/` | Named | `APP/myProp` |
| `--` | CSS Data | `--my-css-var` |
| `@` | Attribute - see [Attributes →](./attributes.md) | `@my-attribute` |
| `+` | Computed - see [Properties →](./properties.md#computed-properties) | `+computedProp` |

---

Next: [List Rendering →](./list-rendering.md)
