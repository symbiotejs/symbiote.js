# Symbiote.js Examples

Complete, working examples covering major Symbiote.js features. Each example includes JavaScript, HTML, and CSS where applicable.

---

## 1. Basic Component

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

class MyComponent extends Symbiote {
  count = 0;
  increment() {
    this.$.count++;
  }
}

MyComponent.template = html`
  <h2>{{count}}</h2>
  <button ${{onclick: 'increment'}}>Click me!</button>
`;

MyComponent.reg('my-component');
```

```html
<my-component></my-component>
```

---

## 2. Attributes

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

class MyComponent extends Symbiote {
  init$ = {
    '@attr': 'initial value',
    prop: 'initial value',
    checked: true,
  }
}

MyComponent.bindAttributes({
  'data-attr': 'prop',
});

MyComponent.template = html`
  <h2>{{@attr}}</h2>
  <div>{{prop}}</div>
  <input type="checkbox" ${{'@checked': 'checked'}}>
`;

MyComponent.reg('my-component');
```

```html
<my-component attr="CUSTOM VALUE" data-attr="CUSTOM VALUE 2"></my-component>
```

---

## 3. Tag Names (Dynamic and Auto-generated)

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

class Com1 extends Symbiote {}
Com1.template = `<button>Component 1</button>`;
Com1.reg('my-component');

class Com2 extends Symbiote {}
Com2.template = `<button>Component 2</button>`;

class MyApp extends Symbiote {}

MyApp.template = html`
  <h2>Tag name is defined explicitly (${Com1.is}), but used dynamically:</h2>
  <${Com1.is} />

  <h2>Auto-generated tag name: ${Com2.is}</h2>
  <${Com2.is} />

  <h2>Tag name is used in markup directly:</h2>
  <my-component />
`;

MyApp.reg('my-app');
```

```html
<my-app></my-app>
```

---

## 4. Manual Template Rendering

```js
import Symbiote from '@symbiotejs/symbiote';

const HTML = '<h2>{{text}}</h2>';

class MyApp extends Symbiote {
  text = 'Hello world!';
  initCallback() {
    this.render(HTML);
  }
}

MyApp.reg('my-app');
```

```html
<my-app></my-app>
```

---

## 5. Template Processor (Custom Styling)

```js
import Symbiote from '@symbiotejs/symbiote';
import { applyStyles } from '@symbiotejs/symbiote/utils';

const styles = {
  host: {
    'display': 'inline-block',
    'padding': '20px',
    'border': '1px solid currentColor',
  },
  first_name: {
    'color': '#f00',
    'font-size': '20px',
  },
  last_name: {
    'color': '#00f',
    'font-size': '18px',
  },
};

class StyledComponent extends Symbiote {
  constructor() {
    super();
    this.templateProcessors.add((fr) => {
      let cssElArr = [...fr.querySelectorAll('[css]')];
      cssElArr.forEach((el) => {
        let cssName = el.getAttribute('css');
        applyStyles(el, styles[cssName]);
      });
    });
    applyStyles(this, styles.host);
  }
}

class MyApp extends StyledComponent {}

MyApp.template = `
  <div css="first_name">{{firstName}}</div>
  <div css="last_name">{{lastName}}</div>
`;

MyApp.bindAttributes({
  'first-name': 'firstName',
  'last-name': 'lastName',
});

MyApp.reg('my-app');
```

```html
<my-app first-name="John" last-name="Snow"></my-app>
```

---

## 6. External Custom Template

```js
import Symbiote from '@symbiotejs/symbiote';

class MyCom extends Symbiote {
  allowCustomTemplate = true;
  text = 'MY TEXT';
}

MyCom.reg('my-com');
```

```html
<template id="my-tpl">
  <h1>{{text}}</h1>
</template>

<my-com use-template="template#my-tpl"></my-com>
```

---

## 7. Named Context

```js
import Symbiote, { html, PubSub } from '@symbiotejs/symbiote';

PubSub.registerCtx({
  name: 'rnd-pro',
  login: () => {
    alert('Logged in');
  },
}, 'USER');

const appCtx = PubSub.registerCtx({
  text: 'Some text',
  onButtonClick: () => {
    console.log(appCtx.read('text'));
    PubSub.getCtx('USER').pub('name', 'NEW NAME ' + Date.now());
  }
}, 'APP');

class MyDumbComponent extends Symbiote {}

MyDumbComponent.template = html`
  <h3>User name: {{USER/name}}</h3>
  <button ${{onclick: 'USER/login'}}>Login</button>
  <button ${{onclick: 'APP/onButtonClick'}}>Click me!</button>
`;

MyDumbComponent.reg('my-dumb-component');
```

```html
<my-dumb-component></my-dumb-component>
```

---

## 8. Shared Context

Components with the same `ctx` attribute share `*`-prefixed properties. The `--ctx` CSS custom property enables CSS-cascaded context inheritance.

```js
import Symbiote from '@symbiotejs/symbiote';

class CtxEl extends Symbiote {
  init$ = {
    '*time': 'Click me to show time!',
  };

  renderCallback() {
    this.onclick = () => {
      this.$['*time'] = Date.now();
    };
  }
}

CtxEl.template = '{{*time}}';
CtxEl.reg('ctx-el');
```

```html
<h3>Manual context name (same-level elements):</h3>
<ctx-el ctx="ctx1"></ctx-el>
<ctx-el ctx="ctx1"></ctx-el>

<h3>CSS-based context (cascading via --ctx):</h3>
<div style="--ctx: 'ctx1'">
  <ctx-el>
    <ctx-el></ctx-el>
  </ctx-el>
</div>
```

```css
ctx-el {
  display: inline-block;
  border: 1px solid #00f;
  padding: 20px;
  user-select: none;
}
```

---

## 9. All Context Types

Demonstrates local, attribute, named (`X/`), shared (`*`), and pop-up (`^`) contexts in one component.

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

class MyApp extends Symbiote {
  init$ = {
    localCtxProp: 'LOCAL',
    attributeProp: 'Initial value...',
    'X/namedCtxProp': 'NAMED',
    '*sharedCtxProp': 'SHARED',
  };

  onUpdate() {
    let updStr = ' updated... ';
    this.$.localCtxProp += updStr;
    this.$.attributeProp += updStr;
    this.$['X/namedCtxProp'] += updStr;
    this.$['*sharedCtxProp'] += updStr;
  }
}

MyApp.template = html`
  <div>{{localCtxProp}}</div>
  <div>{{attributeProp}}</div>
  <div>{{X/namedCtxProp}}</div>
  <div>{{*sharedCtxProp}}</div>
  <button ${{onclick: 'onUpdate'}}>Update</button>
  <inner-el></inner-el>
`;

MyApp.bindAttributes({
  'attr-test': 'attributeProp',
});

MyApp.reg('my-app');

class InnerEl extends Symbiote {}
InnerEl.template = '<h1>{{^attributeProp}}</h1>';
InnerEl.reg('inner-el');
```

```html
<my-app attr-test="HTML ATTRIBUTE VALUE" ctx="my-ctx"></my-app>
```

```css
my-app {
  display: block;

  > * {
    border: 1px solid green;
    margin: 10px;
    padding: 10px;
  }

  inner-el {
    display: inline-block;
  }
}
```

---

## 10. CSS Data Binding

CSS custom properties used as reactive component state.

```js
import Symbiote from '@symbiotejs/symbiote';

class MyCom extends Symbiote {}

MyCom.template = `
  <h2>{{--heading}}</h2>
  <div>{{--text}}</div>
`;

MyCom.reg('my-com');
```

```html
<my-com class="css-data-1"></my-com>
<my-com class="css-data-2"></my-com>
```

```css
my-com {
  display: block;
  padding: 10px;
  margin: 10px;
  border: 1px solid green;
}

.css-data-1 {
  --heading: 'CSS Data 1';
  --text: 'Some text...';
}

.css-data-2 {
  --heading: 'CSS Data 2';
  --text: 'Some other text...';
}
```

---

## 11. Dynamic List Rendering (Itemize with `item-tag`)

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

class TableRow extends Symbiote {
  renderCallback() {
    this.onclick = () => {
      this.classList.toggle('selected');
    };
  }
}

TableRow.template = `
  <td>{{rowNum}}</td>
  <td>Random number: {{randomNum}}</td>
  <td>{{date}}</td>
`;

TableRow.reg('table-row');

class TableApp extends Symbiote {
  tableData = [];

  generateTableData() {
    let data = [];
    for (let i = 0; i < 1000; i++) {
      data.push({
        rowNum: i + 1,
        randomNum: Math.random() * 100,
        date: Date.now(),
      });
    }
    this.$.tableData = data;
  }
}

TableApp.template = html`
  <button ${{onclick: 'generateTableData'}}>Generate data</button>
  <table itemize="tableData" item-tag="table-row"></table>
`;

TableApp.reg('table-app');
```

```html
<table-app></table-app>
```

```css
table-row {
  display: table-row;
}
table-row.selected {
  background-color: rgba(255, 0, 200, .3);
}
td {
  background-color: rgba(0, 0, 0, .1);
  padding: 2px;
}
```

---

## 12. Alternative List Rendering (DOM API + animateOut)

Direct DOM manipulation for lists, using `ref`, `animateOut`, and CSS enter/exit transitions.

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

class ListItem extends Symbiote {
  onRemove() {
    Symbiote.animateOut(this);
  }

  get checked() {
    return this.ref.checkbox.checked;
  }

  clear() {
    this.$.text = '';
  }

  renderCallback() {
    this.ref.edit.focus();
  }
}

ListItem.template = html`
  <input ref="checkbox" type="checkbox">
  <div
    ref="edit"
    contenteditable="true"
    ${{textContent: 'text'}}></div>
  <button ${{onclick: 'onRemove'}}>Remove Item</button>
`;

ListItem.reg('list-item');

class MyApp extends Symbiote {
  get items() {
    return [...this.ref.list_wrapper.children];
  }

  onAddItem() {
    this.ref.list_wrapper.appendChild(new ListItem());
  }

  onClearChecked() {
    this.items.forEach((item) => {
      if (item.checked) item.clear();
    });
  }

  onRemoveChecked() {
    this.items.forEach((item) => {
      if (item.checked) Symbiote.animateOut(item);
    });
  }

  renderCallback() {
    this.onAddItem();
  }
}

MyApp.template = html`
  <div ref="list_wrapper"></div>
  <div class="toolbar">
    <button ${{onclick: 'onAddItem'}}>Add Item</button>
    <button ${{onclick: 'onClearChecked'}}>Clear Checked</button>
    <button ${{onclick: 'onRemoveChecked'}}>Remove Checked</button>
  </div>
`;

MyApp.reg('my-app');
```

```html
<my-app></my-app>
```

```css
list-item {
  padding: 10px;
  display: grid;
  grid-template-columns: min-content auto min-content;
  border-bottom: 1px solid currentColor;
  transition: .4s;

  @starting-style {
    opacity: 0;
    transform: translateY(20px);
  }
  &[leaving] {
    opacity: 0;
    transform: translateX(100px);
  }
}
```

---

## 13. Nested Lists

`processInnerHtml = true` lets you write bindings directly in the component's HTML using the plain `bind=` attribute syntax.

```js
import Symbiote from '@symbiotejs/symbiote';

class NestApp extends Symbiote {
  processInnerHtml = true;
  data = [];
  buttonActionName = 'Generate';

  onGenerateData() {
    this.set$({ buttonActionName: 'Update' });
    let data = [];
    for (let i = 0; i < 3; i++) {
      data.push({
        name: i + 1,
        nestedData: [
          { nestedName: 'Nested A', nestedText: Date.now(), nestedData: [
            { nestedName: '111', nestedText: Date.now() },
            { nestedName: '222', nestedText: Date.now() },
          ]},
        ],
      });
    }
    this.$.data = data;
  }
}

NestApp.reg('nest-app');
```

```html
<nest-app>
  <button bind="onclick: onGenerateData">{{buttonActionName}} list data</button>
  <div itemize="data">
    <div>{{name}}</div>
    <div itemize="nestedData">
      <div>{{nestedName}}</div>
      <div>{{nestedText}}</div>
      <div itemize="nestedData">
        <div>{{nestedName}}</div>
        <div>{{nestedText}}</div>
      </div>
    </div>
  </div>
</nest-app>
```

---

## 14. CSS-Defined Table Rendering

Using CSS `display` values to create table layout from custom elements.

```js
import Symbiote from '@symbiotejs/symbiote';

class MyTable extends Symbiote {
  tableData = [];
  onSelect(e) {
    e.target?.closest('table-row')?.classList.toggle('selected');
  }
}

MyTable.template = /*html*/ `
  <table-css
    bind="onclick: onSelect"
    itemize="tableData"
    item-tag="table-row">
    <td-css>{{rowNumber}}</td-css>
    <td-css>{{date}}</td-css>
  </table-css>
`;

MyTable.reg('my-table');
```

```html
<my-table></my-table>

<script>
  window.onload = () => {
    document.querySelector('my-table').$.tableData = [
      { rowNumber: 1, date: Date.now() },
      { rowNumber: 2, date: Date.now() },
      { rowNumber: 3, date: Date.now() },
    ];
  }
</script>
```

```css
table-css {
  display: table;
  border-spacing: 2px;

  table-row {
    display: table-row;
    &.selected { background-color: rgba(255, 0, 200, .3); }
    td-css {
      display: table-cell;
      border: 1px solid currentColor;
      padding: 4px;
    }
  }
}
```

---

## 15. Customized Built-in Element as List Item

```js
import {} from 'https://cdn.jsdelivr.net/npm/@ungap/custom-elements/+esm';
import Symbiote, { html } from '@symbiotejs/symbiote';

window.customElements.define('option-item', class extends HTMLOptionElement {}, {
  extends: 'option',
});

class MyApp extends Symbiote {
  init$ = {
    options: [
      { value: '1', textContent: 'Option 1' },
      { value: '2', textContent: 'Option 2' },
      { value: '3', textContent: 'Option 3' },
    ],
    selectedValue: '1',
  };

  onChange(e) {
    this.$.selectedValue = e.target.value;
  }
}

MyApp.template = html`
  <h3>Selected value: {{selectedValue}}</h3>
  <select ${{
    onchange: 'onChange',
    itemize: 'options',
    'item-tag': 'option-item',
  }}></select>
`;

MyApp.reg('my-app');
```

```html
<my-app></my-app>
```

---

## 16. SSR Markup Hydration

`ssrMode = true` skips template injection and attaches bindings to server-rendered HTML. The component connects to existing DOM without re-rendering.

```js
import Symbiote from '@symbiotejs/symbiote';

class MyApp extends Symbiote {
  ssrMode = true;
  heading = 'Some heading after hydration';
  text = 'Some text after hydration...';
  onUpdate() {
    this.notify('heading');
    this.notify('text');
  }
}

MyApp.reg('my-app');
```

```html
<my-app>
  <h1 bind="textContent: heading">Hello world!</h1>
  <div bind="textContent: text">Some initial text from server...</div>
  <button bind="onclick: onUpdate">Click me!</button>
</my-app>
```

---

## 17. SSR CSS Variables Binding

CSS custom properties read reactively at runtime, with SSR hydration mode.

```js
import Symbiote from '@symbiotejs/symbiote';

class MyCom extends Symbiote {
  ssrMode = true;
  onUpdate() {
    this.$['--text'] = `Updated text... (${Date.now()})`;
  }
}

MyCom.reg('my-com');
```

```html
<my-com>
  <button bind="onclick: onUpdate">Update</button>
  <div>{{--text}}</div>
</my-com>

<div container>
  <my-com>
    <h1>{{--heading}}</h1>
    <div>{{--text}}</div>
  </my-com>
</div>

<my-com class="my-class">
  <h1>{{--heading}}</h1>
  <h2>{{--local-custom-data}}</h2>
  <div>{{--text}}</div>
</my-com>
```

```css
:root {
  --heading: 'Root CSS heading';
  --text: 'Root CSS text...';
}

[container] {
  --heading: 'Container heading';
  --text: 'Container text...';
}

.my-class {
  --heading: 'CSS class heading';
  --text: 'CSS class text...';
  --local-custom-data: 'Some custom data...';
}

my-com {
  display: block;
  padding: 20px;
  border: 1px solid blue;
  margin-bottom: 10px;
}
```

---

## 18. Localization via PubSub

Using a named PubSub context as a reactive l10n store.

```js
import Symbiote, { html, PubSub } from '@symbiotejs/symbiote';

const lMap = {
  EN: { users: 'Users', comments: 'Comments', likes: 'Likes' },
  ES: { users: 'Usuarios', comments: 'Comentarios', likes: 'Gustos' },
  RU: { users: 'Пользователи', comments: 'Комментарии', likes: 'Лайки' },
};

const l10nCtx = PubSub.registerCtx(lMap.EN, 'L10N');

class MyApp extends Symbiote {
  numberOfUsers = 10;
  numberOfComments = 2;
  numberOfLikes = 12;

  onLangSelect(e) {
    l10nCtx.multiPub(lMap[e.target.value]);
  }
}

MyApp.template = html`
  <select ${{onchange: 'onLangSelect'}}>
    ${Object.keys(lMap).map(lang => `<option>${lang}</option>`).join('')}
  </select>
  <div>{{L10N/users}} -- {{numberOfUsers}}</div>
  <div>{{L10N/comments}} -- {{numberOfComments}}</div>
  <div>{{L10N/likes}} -- {{numberOfLikes}}</div>
`;

MyApp.reg('my-app');
```

```html
<my-app></my-app>
```

---

## 19. Icons via Template Processor

Custom template processor that replaces `[icon]` attributes with inline SVG.

```js
import Symbiote from '@symbiotejs/symbiote';

const ICON_SET = {
  star: 'M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z',
  ok: 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
};

function getSvg(iconName) {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="${ICON_SET[iconName] || ICON_SET.star}"></path>
  </svg>`.trim();
}

class AppSuper extends Symbiote {
  constructor() {
    super();
    this.templateProcessors.add((fr) => {
      [...fr.querySelectorAll('[icon]')].forEach((el) => {
        let icon = document.createElement('icon-el');
        icon.innerHTML = getSvg(el.getAttribute('icon'));
        el.prepend(icon);
      });
    });
  }
}

class MyCom extends AppSuper {}

MyCom.template = `
  <h1 icon="star">Header</h1>
  <button icon="ok">Button</button>
`;

MyCom.reg('my-com');
```

```html
<my-com></my-com>
```

---

## 20. Icons via Computed Attribute Binding

`isoMode` component using a computed property (`+path`) to drive an SVG attribute.

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

const ICONS = {
  star: 'M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z',
  ok: 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
};

class IconSvg extends Symbiote {
  isoMode = true;
  init$ = {
    '@name': 'star',
    '+path': () => ICONS[this.$['@name']],
  }
}

IconSvg.template = html`
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path ${{'@d': '+path'}}></path>
  </svg>
`;

IconSvg.reg('icon-svg');
```

```html
<h1><icon-svg name="star"></icon-svg> Heading</h1>
<button><icon-svg name="ok"></icon-svg> Ok</button>
```

---

## 21. CSS-Driven Icons

SVG path driven entirely by a CSS custom property (`--path`). Zero JS for icon switching.

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

class ICon extends Symbiote {}

ICon.template = html`
  <svg viewBox="0 0 24 24">
    <path ${{'@d': '--path'}} />
  </svg>
`;

ICon.reg('i-con');
```

```html
<i-con></i-con>
<i-con home></i-con>
<i-con dashboard></i-con>
```

```css
i-con {
  display: inline-flex;
  height: 60px;
  width: 60px;

  --path: "M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z";

  svg {
    width: 100%;
    height: 100%;
    path {
      fill: currentColor;
      d: path(var(--path));
    }
  }

  &[home] {
    --path: "M10,20V14H14V20H20V12H24L12,0L0,12H4V20H10Z";
  }
  &[dashboard] {
    --path: "M3,3H11V11H3V3M13,3H21V11H13V3M13,13H21V21H13V13M3,13H11V21H3V13Z";
  }
}
```

---

## 22. Universal Tabs

Tab navigation using shared context (`*currentTabName`) with no parent coordinator component.

```js
import Symbiote from '@symbiotejs/symbiote';

class SuperTabs extends Symbiote {
  init$ = {
    '*currentTabName': 'first',
  };

  renderCallback() {
    this.tabEls = [...this.querySelectorAll('[tab]')];
    this.tabEls.forEach((el) => {
      let tab = el.getAttribute('tab');
      if (el.hasAttribute('current')) {
        this.$['*currentTabName'] = tab;
      }
      el.onclick = () => {
        this.$['*currentTabName'] = tab;
      };
    });
    this.sub('*currentTabName', (val) => {
      this.tabEls.forEach((el) => {
        el.toggleAttribute('current', el.getAttribute('tab') === val);
      });
    });
  }
}

SuperTabs.reg('super-tabs');

class SuperTabsView extends Symbiote {
  renderCallback() {
    this.tabCtxEls = [...this.querySelectorAll('[tab-ctx]')];
    this.sub('*currentTabName', (val) => {
      this.tabCtxEls.forEach((el) => {
        el.toggleAttribute('active', el.getAttribute('tab-ctx') === val);
      });
    });
  }
}

SuperTabsView.reg('super-tabs-view');
```

```html
<super-tabs ctx="section-select">
  <button tab="first">First</button>
  <button tab="second">Second</button>
  <button tab="third">Third</button>
</super-tabs>

<super-tabs-view ctx="section-select">
  <div tab-ctx="first">First content</div>
  <div tab-ctx="second">Second content</div>
  <div tab-ctx="third">Third content</div>
</super-tabs-view>
```

```css
super-tabs {
  display: inline-flex;
  gap: 2px;
  [tab][current] {
    background-color: transparent;
    pointer-events: none;
  }
}

super-tabs-view {
  display: block;
  [tab-ctx] { display: none; }
  [tab-ctx][active] { display: contents; }
}
```

---

## 23. Widget Routing via PubSub

Custom router using a PubSub named context and computed properties — no AppRouter required.

```js
import Symbiote, { html, PubSub } from '@symbiotejs/symbiote';

const routes = [
  { route: 'home', title: 'Home', options: { timestamp: Date.now() } },
  { route: 'user', title: 'User', options: { timestamp: Date.now() } },
  { route: 'settings', title: 'Settings', options: { timestamp: Date.now() } },
];

const router = PubSub.registerCtx(routes[0], 'R');

class AppShell extends Symbiote {
  init$ = {
    routes: structuredClone(routes),

    '+optionsJson': {
      deps: ['R/options'],
      fn: () => JSON.stringify(this.$['R/options'], undefined, 2),
    },
    '+sectionHtml': {
      deps: ['R/route'],
      fn: () => {
        let sec = this.$['R/route'];
        return `<${sec}-section></${sec}-section>`;
      },
    },

    onNav: (e) => {
      let route = e.target.getAttribute('route');
      if (route) {
        let routeDescriptor = routes.find((desc) => desc.route === route);
        if (routeDescriptor) {
          routeDescriptor.options.timestamp = Date.now();
          router.multiPub(routeDescriptor);
        }
      }
    },
  }
}

AppShell.template = html`
  <h1>Section title: {{R/title}}</h1>
  <h2>Current route: {{R/route}}</h2>
  <nav itemize="routes">
    <button ${{onclick: '^onNav', '@route': 'route'}}>{{title}}</button>
  </nav>
  <code>{{+optionsJson}}</code>
  <div ${{innerHTML: '+sectionHtml'}}></div>
`;

AppShell.reg('app-shell');
```

```html
<app-shell></app-shell>
```

---

## 24. AI-Assisted Smart Textarea

SSR hydration mode with `ref`, async handlers, and attribute-driven configuration.

```js
import Symbiote from '@symbiotejs/symbiote';

const CFG = {
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '<YOUR_API_KEY>',
};

const textStyles = [
  'Free informal speech, jokes, memes, emoji, possibly long',
  'Casual chat, friendly tone, occasional emoji, short and relaxed',
  'Medium formality, soft style, compact',
  'Neutral tone, clear and direct, minimal slang',
  'Professional tone, polite and respectful, no emoji',
  'Strict business language, polite and grammatically correct',
  'Highly formal, authoritative, complex vocabulary, long and structured',
];

class SmartTextarea extends Symbiote {
  ssrMode = true;
  #sourceText = '';

  init$ = {
    '@model': 'gpt-4o',
    currentTextStyle: textStyles[3],

    saveSourceText: () => {
      this.#sourceText = this.ref.text.value;
    },
    revertChanges: () => {
      this.ref.text.value = this.#sourceText;
    },
    onTextStyleChange: (e) => {
      this.$.currentTextStyle = textStyles[e.target.value - 1];
    },
    askAi: async () => {
      if (!this.ref.text.value.trim()) {
        alert('Your text input is empty');
        return;
      }
      let response = await fetch(CFG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CFG.apiKey}`,
        },
        body: JSON.stringify({
          model: this.$['@model'],
          messages: [
            {
              role: 'system',
              content: JSON.stringify({
                useLanguage: this.ref.lang.value || 'Same as input language',
                textStyle: this.$.currentTextStyle,
              }),
            },
            {
              role: 'assistant',
              content: 'You are a text writing assistant. Rewrite the input text according to the parameters provided.',
            },
            {
              role: 'user',
              content: this.ref.text.value,
            },
          ],
          temperature: 0.7,
        }),
      });
      let aiResponse = await response.json();
      this.ref.text.value = aiResponse?.choices?.[0]?.message.content || this.ref.text.value;
    },
  }
}

SmartTextarea.reg('smart-textarea');
```

```html
<smart-textarea model="gpt-4o-mini">
  <textarea
    bind="oninput: saveSourceText"
    placeholder="AI assisted text input..."
    ref="text"></textarea>

  <input type="text" placeholder="Preferred Language" ref="lang">

  <label>Text style: {{currentTextStyle}}</label>
  <input
    bind="onchange: onTextStyleChange"
    type="range" min="1" max="7" step="1">

  <button bind="onclick: askAi">Rewrite text</button>
  <button bind="onclick: revertChanges">Revert AI changes</button>
</smart-textarea>
```

```css
smart-textarea {
  display: inline-flex;
  flex-flow: column;
  gap: 10px;
  width: 500px;

  textarea {
    width: 100%;
    height: 200px;
  }
}
```

---

## 25. rootStyles (Light DOM Adopted Stylesheets)

```js
import Symbiote, { html, css } from '@symbiotejs/symbiote';

class MyCard extends Symbiote {
  init$ = {
    '@title': 'Card title',
    '@text': 'Card text content...',
  }
}

MyCard.template = html`
  <h3>{{@title}}</h3>
  <p>{{@text}}</p>
  <button>Action</button>
`;

MyCard.rootStyles = css`
  my-card {
    display: block;
    padding: 20px;
    border: 1px solid var(--border-color, #ccc);
    border-radius: 8px;
    background-color: var(--card-bg, #f9f9f9);
    margin: 10px;
    max-width: 300px;

    & h3 { margin: 0 0 8px; color: var(--heading-color, #333); }
    & p { margin: 0 0 12px; color: var(--text-color, #666); }
    & button {
      background-color: var(--accent, #0057ff);
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
    }
  }
`;

MyCard.reg('my-card');
```

```html
<my-card title="Default theme"></my-card>

<div style="--card-bg: #1a1a2e; --heading-color: #e0e0ff; --text-color: #a0a0cc; --accent: #7c4dff;">
  <my-card title="Dark theme" text="Styled via CSS custom properties."></my-card>
</div>
```

---

## 26. shadowStyles (Shadow DOM Isolation)

```js
import Symbiote, { html, css } from '@symbiotejs/symbiote';

class MyWidget extends Symbiote {
  init$ = {
    '@label': 'Widget',
    count: 0,
  }
  increment() {
    this.$.count++;
  }
}

MyWidget.template = html`
  <div class="header">{{@label}}</div>
  <div class="body">
    <span class="count">{{count}}</span>
    <button ${{onclick: 'increment'}}>+1</button>
  </div>
`;

MyWidget.shadowStyles = css`
  :host {
    display: inline-block;
    border: 2px solid #333;
    border-radius: 8px;
    overflow: hidden;
    font-family: sans-serif;
    margin: 8px;
  }
  .header {
    background: #333;
    color: #fff;
    padding: 6px 12px;
    font-size: 12px;
    text-transform: uppercase;
  }
  .body {
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .count {
    font-size: 28px;
    font-weight: bold;
    min-width: 2ch;
    text-align: center;
  }
  button {
    background: #0057ff;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 18px;
    cursor: pointer;
    &:hover { background: #0040cc; }
  }
`;

MyWidget.reg('my-widget');
```

```html
<my-widget label="Counter A"></my-widget>
<my-widget label="Counter B"></my-widget>
```
