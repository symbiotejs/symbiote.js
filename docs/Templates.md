## Template syntax

One of the core template mechanics in Symbiote.js - is a native browser HTML parsing via standard DOM API methods. That's the fastest way to create componet template instance in object model representation. It might be quite contrintuitive, but in modern browsers `innerHTML` works faster, than imperative elements structure creation with `document.createElement`.
That's why we use custom tag attribute `set` to describe template data bindings.

Attribute value syntax based on key/value pairs:
```html
<div 
  set="textContent: myText; style.color: textColor">
</div>
```
* Keys and values should be separated with `:`
* All key/value pairs should be sepatated by `;`
* Spaces are optional, you can use them for better readability.
* As you can see, nested properties are supported: `style.color`.
* All keys are native object property names. So, they provide direct access to the DOM API.

To bind some property to own elemnt's HTML-attribute use `@` prefix:
```html
<div 
  set="@class: className">
</div>
```

To bind element to some external data context property, use `*` prefix for property name:
```html
<div 
  set="textContent: *textFromContext">
</div>
```

Also, to bind element to named (abstract) conext, use context name as property prefix separated by slash symbol:
```html
<div 
  set="textContent: profile/name">
</div>
```

**More information about data context you can find in "Data context" section.**

Action handler binding is the same as own property:
```html
<input type="text" set="oninput: onTextInput" />
```

## Slots

[Slots](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot) allow you to define placeholders in your template that can be filled with any external markup fragment.

> Symbiote.js make slots available without Shadow DOM usage.

Dafault template slot:
```html
<div class="my-wrapper">
  <slot></slot>
</div>
```

Named template slots:
```html
<header>
  <slot name="header"></slot>
</header>
<article>
  <slot name="article"></slot>
</article>
<footer>
  <slot name="footer"></slot>
</footer>
```

## Element references

If you need an element reference somewhere in your code logics, use `ref` attribute for your template element:
```html
<div class="layout">
  <div ref="div1"></div>
  <div ref="div2"></div>
</div>
```
Reference name should be unique for each element (like an element's `id`).
Then you can use `ref` collection to get those elements in your code without any additional search:
```javascript
class MyComponent extends BaseComponent {
  initCallback() {
    this.ref.div1.contenteditable = true;
    this.ref.div2.style.color = 'red';
  }
}
```

## Data based rendering

```javascript
class MyComponent extends BaseComponent {
  init$ = {
    listHtml: '',
  }

  initCallback() {
    this.sub('*list', (/** @type {{uid:string}[]} */ list) => {
      this.$.listHtml = list.reduce((html, item) => {
        return html += /*html*/ `<list-item uid="${item.uid}"></list-item>`;
      }, '');
    });
  }
}

MyComponent.template = /*html*/ `
<h2>Items:<h2>
<div class="list-wrapper" set="innerHTML: listHtml"></div>
`;
```