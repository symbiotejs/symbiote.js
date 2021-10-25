## Template syntax

One of the core template mechanics in Symbiote.js - is native browser HTML parsing via standard DOM API methods. That's the fastest way to create componet template instance in object model representation. It might be quite contrintuitive, but in modern browsers `innerHTML` works faster, than imperative elements structure creation with `document.createElement`.
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

Dafault slot:

Named slots:

## Element references


## Conditional rendering
To be updated...

## Data based rendering
To be updated...