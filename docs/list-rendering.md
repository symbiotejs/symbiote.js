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

Inherited:
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
> - `{{name}}` — binds to the **item's** own property
> - `${{onclick: 'handler'}}` — binds to the **item** component's own method/property
> - `${{onclick: '^handler'}}` — use `^` prefix to reach the **parent** component's property
> - **Failure to use `^` for parent handlers will result in broken event bindings**

By default, all list items are Symbiote components wrapped with a corresponding custom element. If you don't need an extra container for styling, use `display: contents` CSS — this is added to each item by default when you don't set custom tag names.

### Custom item tag name

Use `item-tag` attribute to define a named tag for list items:
```js
MyComponent.template = html`
  <div itemize="userList" item-tag="user-card">
    <template>
      <div>{{firstName}}</div>
      <div>{{secondName}}</div>
    </template>
  </div>
`;
```

Then use the tag as a CSS selector:
```css
user-card {
  display: flex;
}
```

### Pre-defined item component

For additional item functionality, define the item component separately:
```js
class UserCard extends Symbiote {
  firstName = '';
  secondName = '';

  initCallback() {
    this.onclick = () => {
      alert(`Hello ${this.$.firstName} ${this.$.secondName}!`);
    };
  }
}

UserCard.template = html`
  <div>{{firstName}}</div>
  <div>{{secondName}}</div>
`;

UserCard.reg('user-card');
```

Use it:
```js
html`
  <div itemize="listData" item-tag="user-card"></div>
`;
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
