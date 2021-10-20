# Symbi<span style="color:#f0f">ఠ</span>te.js

## Ultralight and ultrapowerful library to create widgets, organize micro-frontends, build reusable embeddable components and complete web applications

### Core benefits
* Minimalistic but reach
* No additional dependencies
* Ultralight (2.6kb br/gzip for featurefull CDN version)
* Blazing fast (faster than any other mainstream solution)
* Memory friendly (no any redux-like huge immutables)
* CSP friendly - is very important for enterprize usage
* Extensible. Really extensible.
* Easy to learn - nothing new for experienced developers, nothing complicated for newbies
* Works in all modern browsers. As is.
* Easy to test
* TypeScript friendly - use it in TS or JS projects from the common source code
* Integration friendly: works with any development stack
* Lifecycle control: no need to initiate something from outside
* ESM friendly
* Open source (MIT license)

### Tech concept description
* Native DocumentFragment instead of expensive Virtual DOM
* Shadow DOM - is optional
* Styling approach: total freedom
* Native HTML and DOM API instead of expensive custom template syntax processing
* Templates - are out of the component or render function context, it’s just a simple JavaScript literals. So you can keep them or process wherever you want
* Fast synchronous UI updates
* Full data context from the document structure
* Full data context availability for template bindings
* DOM API friendly approach
* Convenient object model access instead of opaque abstractions
* Custom Elements work strange sometimes. Don’t worry about that (construction flow)

### Quick start
Fastest way to try Symbiote.js is to connect it's base class from CDN:

```javascript
import { BaseComponent } from 'https://uc-jsdk.web.app/build/symbiote.js';

class MyComponent extends BaseComponent {
  // Initial property values and handlers:
  init$ = {
    firstName: 'John',
    secondName: 'Snow',
    time: 0,
    cssColor: '#f00',
    onTimeClicked: () => {
      // Dynamically change local property value:
      this.$.time = Date.now();
    },
  }
}

// Component template with the reactive data bindings:
MyComponent.template = /*html*/ `
  <div set="textContent: firstName"></div>
  <div set="textContent: secondName; style.color: cssColor"></div>
  <div set="textContent: time; onclick: onTimeClicked"></div>
`;

// It's possible to connect attributes to the data context directly:
MyComponent.bindAttributes({
  'first-name': 'firstName',
  'second-name': 'secondName',
});

MyComponent.reg('my-component');
```

This code can work directly in any modern browser, so you don't need to install anything.

Then you can use the new tag in your HTML:
```html
<my-component 
  first-name="Satoshi" 
  second-name="Nakamoto">
</my-component>
```

## Browser support
Symbiote.js is supported and tested in all major modern desktop and mobile browsers: 
* Chrome
* Firefox
* Safari
* Edge
* Opera
* etc...

**Internet Explorer** - is outdated and not supported anymore:

https://uploadcare.com/blog/uploadcare-stops-internet-explorer-support/

## General sponsor
Thanks to Uploadcare for supporting this project!

### Useful external links:
* https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
* https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM
* https://custom-elements-everywhere.com

## This is not a final version of the README file, work still in progress...

## Issues and PRs are welcome
