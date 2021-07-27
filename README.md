# ☣️ Symbiote.js

## Ultralight and ultrapowerful library for creating widgets, micro-frontends, reusable embeddable components and complete web applications

### Key features:
* Lifecycle control from inside: fully automated initialization and removing
* Environment agnostic: seamless integration with any other popular framework, library or CMS
* Based on modern web standards: Custom Elements, ES Modules, CSS Variables, etc...
* Close to native web-platform APIs: HTML, CSS, JavaScript - all you already familiar with
* Powerful data management out of the box: very simple, flexible and performant
* Synchronous data flow: no more race conditions and unexpected behavior
* Zero dependency: `npm install... nothing`
* CSP compatible: no need to use insecure flags (`'unsafe-inline'`) to make your code work
* Tag names management: no more custom tag name collisions
* Efficient template replication: just native browser parsing and cloning, no any additional slowing processing stage for the template literals
* Shadow DOM is optional: use it where you need it only
* Object model matters: access to the direct properties and methods of the DOM elements. Unlike many other libraries, DOM is not hidden behind opaque abstract layers
* Extensible: use library included extensions or create your own
* Ultralight: ~ 1.5 Kb minified and gzipped base class; ~ 4Kb - for class extended for maximum features
* Development environment agnostic: use your favorite build tools freely

### Installation:
`git submodule add -b main git@github.com:uploadcare/symbiote.js.git symbiote`

Git-submodule approach allows you to put your git-dependency to any path in your project structure, select branches and versions, create your own branches and pull updates into it, use git tooling to manage code much more flexible.

We believe that code sharing on ESM level, as it become standard in modern JS world, is more attractive than NPM package publishing.

## Basic usage example:
```javascript
import { BaseComponent } from '../symbiote/core/BaseComponent.js';

class MyComponent extends BaseComponent {

  constructor() {
    super();

    // Define local state:
    this.initLocalState({
      firstName: 'unknown',
      secondName: 'unknown',

      // Click handlers:
      firstNameClicked: () => {
        console.log(this.state.firstName);
      },
      secondNameClicked: () => {
        console.log(this.state.secondName);
      },
    });
  }

  /* 
  The only custom lifecycle callback in Symbiote is "initCallback".
  This callback will be called only once after component .
  */
  initCallback() {
    // Update state properties when needed:
    this.localState.multiPub({
      firstName: 'John',
      secondName: 'Snow',
    });
  }
}

// Use /*html*/ for template syntax highlighting:
MyComponent.template = /*html*/ `
<div loc="textContent: firstName; onclick: firstNameClicked"></div>
<div loc="textContent: secondName; oncllick: secondNameClicked"></div>
`;

// Bind attributes directly to local state:
MyComponent.bindAttributes({
  'first-name': ['local'],
  'second-name': ['local'],
});

// Define your custom HTML-tag:
MyComponent.reg('my-custom-tag');
```
Than you can use your custom tag in your templates or any static HTML file:
```html
<my-custom-tag first-name="Satoshi" second-name="Nakamoto"></my-custom-tag>
```

For more abilities and more advanced usage use Symbiote extensions at:

`/core/extensions/...`

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

### Useful external links:
* https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
* https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM
* https://custom-elements-everywhere.com

## This is not a final version of the README file, work still in progress...

## Issues and PRs are welcome
