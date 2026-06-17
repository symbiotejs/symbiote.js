# Common Mistakes

Patterns that frequently trip up new users and AI code generators.

---

## 1. Using `this` inside template strings

Templates are context-free strings — they DO NOT execute inside a component instance and do not close over `this`. Binding values by name; the component resolves them at render time.

```js
// WRONG
MyComponent.template = html`<div>${this.title}</div>`;

// CORRECT — use binding syntax
MyComponent.template = html`<div>{{title}}</div>`;
// OR
MyComponent.template = html`<div ${{textContent: 'title'}}></div>`;
// OR
MyComponent.template = `<div bind="textContent: title"></div>`;
```

---

## 2. Defining `template`, `rootStyles`, or `shadowStyles` inside the class body

`template`, `rootStyles`, and `shadowStyles` are **static property setters** on the `Symbiote` base class — not regular static fields. Assigning them inside the class body with `static template = ...` bypasses the setter and does nothing.

```js
// WRONG
class MyComponent extends Symbiote {
  static template = html`<div>{{text}}</div>`; // setter never called
}

// CORRECT — assign outside the class body
class MyComponent extends Symbiote {}
MyComponent.template = html`<div>{{text}}</div>`;
MyComponent.rootStyles = css`my-component { display: block; }`;
```

---

## 3. Missing `^` prefix when referencing a parent-defined handler from an item template

Itemize items are real Symbiote components with their own reactive state (the data properties mapped from the source array or object). They can have their own handlers too — either passed as functions in the source data objects, or defined on a separate component class registered for the tag name set by `item-tag` attribute.

The common mistake is defining a shared handler on the **parent** (e.g. to handle all item clicks in one place) and then binding to it from the item template *without* `^`. Without `^`, the binding looks for the handler on the item itself — where it doesn't exist — and fails.

```js
class MyList extends Symbiote {
  init$ = {
    items: [{ name: 'Alice' }, { name: 'Bob' }],
    onItemClick: (e) => { console.log('clicked'); },
  }
}

// WRONG — looks for onItemClick on the item, not the parent
MyList.template = html`
  <ul itemize="items">
    <template>
      <li><button ${{onclick: 'onItemClick'}}>{{name}}</button></li>
    </template>
  </ul>
`;

// CORRECT — ^ walks up the DOM to find onItemClick in the parent's init$
MyList.template = html`
  <ul itemize="items">
    <template>
      <li><button ${{onclick: '^onItemClick'}}>{{name}}</button></li>
    </template>
  </ul>
`;
```

> `^`-targeted properties must be defined in the ancestors's `init$` — the walk does not check plain class properties.

When each item needs its own independent handler, you can pass it directly in the data:
```js
this.$.items = [
  { name: 'Alice', onItemClick: () => console.log('Alice clicked') },
  { name: 'Bob',   onItemClick: () => console.log('Bob clicked') },
];
```
```html
<ul itemize="items">
  <template>
    <li><button ${{onclick: 'onItemClick'}}>{{name}}</button></li>
  </template>
</ul>
```

Or, as it recommended for the most cases, register a dedicated component class for the tag name set by `item-tag`:
```js
class MyItem extends Symbiote {
  onItemClick() { console.log(this.$.name); }
}
MyItem.template = html`<li><button ${{onclick: 'onItemClick'}}>{{name}}</button></li>`;
MyItem.reg('my-item');
```
```html
<ul itemize="items" item-tag="my-item"></ul>
```

---

## 4. Using `@` attribute prefix directly in HTML

`@` is a binding syntax prefix only — it means "bind to HTML attribute" inside `${{}}` expressions. It is not a valid HTML attribute prefix.

```html
<!-- WRONG -->
<div @hidden="isHidden">...</div>

<!-- CORRECT — @-prefix is only inside binding objects -->
<div ${{'@hidden': 'isHidden'}}>...</div>
<!-- OR, when html template helper is not used: -->
<div bind="@hidden': isHidden">...</div>
```

---

## 5. Expecting dotted `init$` keys to create nested state

State is flat by design. A key like `'obj.prop'` in `init$` is a literal flat key named `obj.prop` — it does not create a nested object `{ obj: { prop: ... } }`. `this.$['obj.prop']` reads and writes that same flat key and works fine.

```js
// MISLEADING — this does NOT create { obj: { prop: 'value' } }
init$ = { 'obj.prop': 'value' };
// It creates a flat key: store['obj.prop'] = 'value'
// Reading/writing it works: this.$['obj.prop'] = 'new' ✓

// If you need a nested object in state, store it as a flat key with an object value:
init$ = { obj: { prop: 'value' } };
this.$.obj = { ...this.$.obj, prop: 'new' }; // replace the whole object to trigger reactivity
```

Dot notation in binding **targets** is fully supported — for both standard DOM properties and child component state:
```js
// DOM property path:
html`<div ${{'style.color': 'colorProp'}}>Text</div>`

// Child component's $ state proxy:
html`<child-el ${{'$.childProp': 'parentProp'}}></child-el>`
```

---

## 6. Using `*prop` without a `ctx` attribute or `--ctx` CSS variable

Shared context properties (`*`-prefix) require a context name to be set on the component — either via the `ctx` HTML attribute or the `--ctx` CSS custom property. Without one, `*` props silently have no effect (dev mode warns).

```html
<!-- WRONG — no context name, *files is never shared -->
<upload-btn></upload-btn>
<file-list></file-list>

<!-- CORRECT -->
<upload-btn ctx="gallery"></upload-btn>
<file-list  ctx="gallery"></file-list>
```

---

## 7. Expecting Shadow DOM by default

Shadow DOM is opt-in. By default, templates render into the component's light DOM. Use `renderShadow = true` or assign `shadowStyles` to opt in.

```js
// Light DOM (default)
class MyComponent extends Symbiote {}

// Shadow DOM — either flag:
class MyComponent extends Symbiote {
  renderShadow = true;
}
// or via shadowStyles (auto-creates shadow root):
MyComponent.shadowStyles = css`:host { display: block; }`;
```

---

## 8. Adding a wrapper div inside the template

The custom element itself is the container. Adding a wrapping `<div>` as the single root inside the template is unnecessary — it creates extra DOM nesting and duplicates the element's own box. Style the component tag directly instead.

```js
// WRONG — the <div class="wrapper"> is redundant, my-widget is already the root
MyWidget.template = html`
  <div class="wrapper">
    <h1>{{title}}</h1>
    <button ${{onclick: 'onAction'}}>Go</button>
  </div>
`;

// CORRECT — template content renders directly inside the custom element
MyWidget.template = html`
  <h1>{{title}}</h1>
  <button ${{onclick: 'onAction'}}>Go</button>
`;
```

```css
/* Style the element tag directly */
my-widget {
  display: block;
  padding: 20px;
}
```

---

## 9. Relying on class property fallbacks for prefixed bindings

Class property fallbacks (resolving unregistered keys from own instance properties or prototype methods) only apply to **local, unprefixed** bindings. Any prefixed binding — `^prop`, `*prop` — resolves exclusively through the data context (`init$` or `add$()`). Plain class properties are never checked for these.

```js
// WRONG — onItemClick is a class property, not in init$
// ^ will not find it
class TaskList extends Symbiote {
  onItemClick() { console.log('clicked'); }
}

TaskList.template = html`
  <ul itemize="tasks">
    <template>
      <li ${{onclick: '^onItemClick'}}>{{name}}</li>
    </template>
  </ul>
`;

// CORRECT — register in init$ so any prefixed binding can resolve it
class TaskList extends Symbiote {
  init$ = {
    onItemClick: () => { console.log('clicked'); },
  }
}
```

The same applies to shared (`*`) bindings — the property must exist in the shared context's registered data, not merely as a class property. 

Named external contexts (`CTX/prop`) are different: they are registered globally via `PubSub.registerCtx()` and are fully independent of any component's `init$` — components reference them freely without declaring anything locally.

---

## 10. Using `{{prop}}` binding syntax inside tag definitions

`{{prop}}` is a **text node** binding — it only works inside element content. Any binding that targets a tag itself — attributes, DOM properties, event handlers, or CSS custom properties — must use `${{}}` or `bind=""` syntax inside the opening tag.

```html
<!-- WRONG — {{}} syntax does not work inside tag definitions -->
<div class="{{APP/theme}}">...</div>
<img src="{{imageUrl}}">
<button onclick="{{onAction}}">Go</button>

<!-- CORRECT — use ${{}} binding object inside the tag -->
<div ${{'@class': 'APP/theme'}}>...</div>
<img ${{'@src': 'imageUrl'}}>
<button ${{onclick: 'onAction'}}>Go</button>
<div ${{'style.color': 'colorProp'}}>...</div>

<!-- CORRECT — or use the bind attribute string syntax -->
<div bind="@class: APP/theme">...</div>
<img bind="@src: imageUrl">
<button bind="onclick: onAction">Go</button>

<!-- CORRECT — {{}} works fine in text node content -->
<h1>Hello, {{userName}}!</h1>
<p>Theme: {{APP/theme}}</p>
```

---

## 11. Expecting two-way data binding

Symbiote.js bindings are **one-way by design** — from state to DOM. There is no `v-model`, `[(ngModel)]`, or `bind:value` equivalent. To react to user input, wire the event handler explicitly and write back to state yourself.

```js
// WRONG — expecting the binding to also update state on user input
MyComponent.template = html`
  <input ${{value: 'query'}}>
`;

// CORRECT — handle the input event and write back to state
class MyComponent extends Symbiote {
  init$ = { query: '' }
}

MyComponent.template = html`
  <input
    ${{value: 'query', oninput: 'onInput'}}
  >
`;
```
```js
class MyComponent extends Symbiote {
  init$ = {
    query: '',
    onInput: (e) => { this.$.query = e.target.value; },
  }
}
```

This is intentional — explicit event handling keeps data flow predictable and avoids the hidden side effects that two-way binding can introduce.

---

## 12. Treating `init$` as a plain object

`init$` is processed once at connection time to populate the component's reactive context. Mutating it after the fact has no effect. Use `this.$` or `add$()` for runtime changes.

```js
// WRONG — modifying init$ after construction does nothing
class MyComponent extends Symbiote {
  init$ = { count: 0 };
  initCallback() {
    this.init$.count = 10; // too late, already processed
  }
}

// CORRECT
class MyComponent extends Symbiote {
  init$ = { count: 0 };
  initCallback() {
    this.$.count = 10; // write through the $ proxy
  }
}
```

