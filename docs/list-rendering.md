# List Rendering

## Using `itemize` API

To create a dynamic list inside your component, use the `itemize` attribute on the list container element:
```js
class MyComponent extends Symbiote {

  init$ = {
    userList: [
      { firstName: 'John', secondName: 'Snow' },
      { firstName: 'Peter', secondName: 'Sand' },
    ],
  };

}

MyComponent.template = html`
  <div itemize="userList">
    <template>
      <div>First name: {{firstName}}</div>
      <div>Second name: {{secondName}}</div>
    </template>
  </div>
`;
```

The `itemize` value points to a key in the component's data context. You can use any type of data context token or a computed list property:

Pop-up (parent must define `userList` in `init$`):
```js
html`<div itemize="^userList">...item template</div>`;
```

Named:
```js
html`<div itemize="APP/userList">...item template</div>`;
```

Computed:
```js
class MyComponent extends Symbiote {
  init$ = {
    rawData: [
      { date: Date.now(), isVisible: true },
      { date: Date.now(), isVisible: false },
    ],
    '+userList': () => this.$.rawData.filter((item) => item.isVisible),
  };
}

MyComponent.template = html`
  <div itemize="+userList"> ... </div>
`;
```

> You can also use the `${{itemize: 'prop'}}` binding syntax if preferred — it produces the same result.

## List items

> **CRITICAL**: Items inside `itemize` are full Symbiote components with their own state scope.
> There are two patterns — **dumb items** and **smart items** — and they differ in how event handlers and logic are bound.

### Dumb items (inline `<template>`)

When you define the item markup directly inside a `<template>` tag, items have **no class definition** — they only receive data properties from the array. Any event handler, method, or additional data must come from an **external context** — not from the item itself.

All standard Symbiote context prefixes work inside dumb item templates:

| Prefix | Source | Example |
|--------|--------|---------|
| `^` | Pop-up (parent component) | `${{onclick: '^onItemClick'}}` |
| `/` | Named context | `${{onclick: 'APP/onItemClick'}}` |
| `*` | Shared context | `${{onclick: '*onItemClick'}}` |

The most common pattern is `^` (pop-up to parent):

```js
class MyList extends Symbiote {
  init$ = {
    userList: [
      { firstName: 'John', secondName: 'Snow' },
      { firstName: 'Peter', secondName: 'Sand' },
    ],
  };

  onItemClick(e) {
    console.log('Item clicked');
  }
}

MyList.template = html`
  <div itemize="userList">
    <template>
      <div>{{firstName}} {{secondName}}</div>
      <button ${{onclick: '^onItemClick'}}>Click</button>
    </template>
  </div>
`;
```

> **Context prefix is required here.** Without it, the binding looks for the handler on the item itself — which doesn't have it, so the event handler breaks silently.

This pattern is best for **simple, display-only items** where all logic lives outside the item.

### Smart items (custom `item-tag` component)

When you define a separate Symbiote component for items, each item has its **own class, template, methods, and state**. Handlers defined on the item component bind directly — **no `^` needed**:

```js
class UserCard extends Symbiote {
  firstName = '';
  secondName = '';

  onCardClick() {
    alert(`Hello ${this.$.firstName} ${this.$.secondName}!`);
  }
}

UserCard.template = html`
  <div>{{firstName}} {{secondName}}</div>
  <button ${{onclick: 'onCardClick'}}>Click</button>
`;

UserCard.reg('user-card');
```

Use it in the parent list:
```js
html`
  <div itemize="userList" item-tag="user-card"></div>
`;
```

> **No `^` needed** — `onCardClick` is the item's own method. You can still use `^` to reach the parent list component if needed (e.g., `${{onclick: '^removeItem'}}`).

This pattern is best for **items with their own logic, lifecycle, or complex templates**.

### Styling list items

By default, all list items are Symbiote components wrapped with a corresponding custom element. If you don't need an extra container for styling, use `display: contents` CSS — this is added to each item by default when you don't set custom tag names.

Use `item-tag` to assign a named tag for styling:
```css
user-card {
  display: flex;
  gap: 8px;
}
```

### Item template

We recommend wrapping item templates in the `<template>` tag:
```js
html`
  <div itemize="listData" item-tag="my-list-item">
    <template>
      <div>{{firstName}}</div>
      <div>{{secondName}}</div>
    </template>
  </div>
`;
```

> The `<template>` tag helps the browser ignore specific tag behavior before the template is copied as item contents. When using an external component as a list item, template wrapping is not necessary.

## Data types and structure

Source data can be `Array` or `Object` collections. Each item descriptor should have a flat structure.

For `Object` collections, each item key is reflected via the `_KEY_` property:
```js
class MyComponent extends Symbiote {

  init$ = {
    userList: {
      id1: { firstName: 'John', secondName: 'Snow' },
      id2: { firstName: 'Peter', secondName: 'Sand' },
    },
  };

}

MyComponent.template = html`
  <div itemize="userList" item-tag="user-card">
    <template>
      <div>ID: {{_KEY_}}</div>
      <div>{{firstName}}</div>
      <div>{{secondName}}</div>
    </template>
  </div>
`;
```

## Dynamic updates

Assign a new data collection to trigger re-render:
```js
this.$.userList = await (await window.fetch('https://<MY-DATA-ENDPOINT>.io')).json();
```

Existing items are updated in-place via `set$`, new items appended, excess removed. Setting the value to `null` or `false` clears the entire list.

## Exit animations

Both itemize processors use `animateOut` automatically for item removal. Items with CSS `transition` + `[leaving]` styles will animate out before being removed:
```css
user-card {
  opacity: 1;
  transition: opacity 0.3s;

  &[leaving] {
    opacity: 0;
  }
}
```

More details in the [Animations](./animations.md) section.

## Keyed itemize processor

For performance-critical lists, use the optional keyed itemize processor with reference-equality fast paths and key-based reconciliation:
```js
import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { itemizeProcessor as defaultProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor.js';

class BigList extends Symbiote {
  constructor() {
    super();
    this.templateProcessors.delete(defaultProcessor);
    this.templateProcessors = new Set([itemizeProcessor, ...this.templateProcessors]);
  }
}
```

Up to **3× faster** for appends, **2×** for in-place updates, **32×** for no-ops.

## Nested lists

List nesting is fully supported. To render hierarchical data, define a custom item component that contains its own `itemize`:
```js
class CategoryItem extends Symbiote {
  name = '';
  init$ = { items: [] }
}

CategoryItem.template = html`
  <h3>{{name}}</h3>
  <ul itemize="items">
    <template>
      <li>{{title}}</li>
    </template>
  </ul>
`;

CategoryItem.reg('category-item');
```

Then use it in the parent:
```js
class MyApp extends Symbiote {

  init$ = {
    categories: [
      {
        name: 'Frontend',
        items: [
          { title: 'Symbiote.js' },
          { title: 'HTML' },
          { title: 'CSS' },
        ],
      },
      {
        name: 'Backend',
        items: [
          { title: 'Node.js' },
          { title: 'Rust' },
        ],
      },
    ],
  };

}

MyApp.template = html`
  <div itemize="categories" item-tag="category-item"></div>
`;
```

Each nesting level is an independent Symbiote component with its own state scope, so updates at any level are handled efficiently.

## Custom raw web components as items

Symbiote.js allows using any custom component as a list item, including raw web components for maximum performance:
```js
class TableRow extends HTMLElement {

  set rowData(data) {
    data.forEach((cellContent, idx) => {
      if (!this.children[idx]) {
        this.appendChild(document.createElement('td'));
      }
      this.children[idx].textContent = cellContent;
    });
  }

}

window.customElements.define('table-row', TableRow);

class MyTable extends Symbiote {

  init$ = {
    tableData: [],
  }

  initCallback() {
    window.setInterval(() => {
      let data = [];
      for (let i = 0; i < 10000; i++) {
        data.push({ rowData: [i + 1, Date.now()] });
      }
      this.$.tableData = data;
    }, 1000);
  }

}

MyTable.rootStyles = css`
  table-row {
    display: table-row;
  }
  td {
    border: 1px solid currentColor;
  }
`;

MyTable.template = html`
  <h1>Hello table!</h1>
  <table itemize="tableData" item-tag="table-row"></table>
`;

MyTable.reg('my-table');
```

> The `itemize` API can be used as a convenient benchmarking tool — test your components for performance by adding them into large lists.

---

Next: [Lifecycle →](./lifecycle.md)
