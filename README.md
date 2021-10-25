# Symbi<span style="color:#f0f">ఠ</span>te.js

## 🥷 Ultralight and ultrapowerful library to create widgets, organize micro-frontends, build reusable embeddable components and make the whole modern web applications

### 🔥 Core benefits
* Minimalistic but reach
* No additional dependencies
* Ultralight (2.6kb br/gzip for featurefull CDN version)
* Blazing fast (faster than most of the other mainstream solutions. All of them.)
* Memory friendly (no any redux-like immutables)
* CSP friendly - good for enterprize usage
* Extensible. Really extensible.
* Easy to learn - nothing completely new for experienced developers, nothing complicated for newbies
* Works in all modern browsers. As is.
* Easy to test
* TypeScript friendly - use it in TS or JS projects from the common source code
* Integration friendly: works with any modern development stack
* Lifecycle control: no need to initiate something from outside
* ESM friendly - native JavaScript modules are best!
* Developer Experience on the mind: compact names, convenient APIs
* Open source (MIT license)

### 💎 Tech concept description
* Native `DocumentFragment` instead of expensive Virtual DOM sync
* Shadow DOM is optional. Use it when you need it only
* Styling approach: total freedom, from the old classics to the cutting age platforn abilities
* Native HTML and DOM API instead of expensive custom template syntax processing
* Templates are out of the component or render function context. It’s just a simple JavaScript literals. So you can keep or process them wherever you want
* Fast synchronous UI updates
* Full data context access from the document structure
* Full data context availability for template bindings
* DOM API friendly approach for the most perfomant solutions
* Convenient object model access instead of opaque abstractions
* Custom Elements work strange sometimes. Don’t worry about that, we do (construction flow)

### 🍏 Quick start
Easiest way to try Symbiote.js is to connect its base class from CDN:

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

// Component template with reactive data bindings:
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

// Custom Element registration:
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
## 🧜‍♀️ Dive deeper
* Templates
* Lifecycle
* Component data context
* Data (pub/sub)
* Extending
* Routing
* Naming collisions
* Domain specific data abstractions
* DOM helpers
* Indexed DB wrapper
* Solution history
* Playground

## ✅ Browser support
Symbiote.js is supported and tested in all major modern desktop and mobile browsers: 
* Chrome
* Firefox
* Safari
* Edge
* Opera
* etc...

**Internet Explorer** - is outdated and not supported anymore:

https://uploadcare.com/blog/uploadcare-stops-internet-explorer-support/

(But it's possible with polyfills: https://github.com/webcomponents/polyfills/tree/master/packages/webcomponentsjs)

## 💰 General sponsor
Big thanks to 🟡 **Uploadcare** for supporting this project!

> https://uploadcare.com/

## Symbiote application example
https://github.com/uploadcare/jsdk/tree/main/upload-blocks

### 🌎 Useful external links:
* https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
* https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM
* https://custom-elements-everywhere.com
* https://open-wc.org/

## This is not a final version of the README file, work still in progress...

## Issues and PRs are welcome
