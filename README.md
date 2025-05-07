[![npm version](https://badge.fury.io/js/@symbiotejs%2Fsymbiote.svg)](https://badge.fury.io/js/@symbiotejs%2Fsymbiote)

# Symbiote.js

Simple, light and very powerful library to create embedded components for any purpose, with a data flow management included.

## ⚖️ What for?
Symbiote.js - is for symbiosis. That means, you can create complex meta-applications, above another applications, built with any modern stack.

The major purpose of Symbiote.js - is to move application inner interactions from the locked space of certain frameworks implementations to the common open space based on native platform features and standards, to be closer to the HTML, CSS and simple DOM APIs, without a lack of DX.

Best for:
* Complex widgets
* Micro frontends
* Reusable component libraries
* Fast and reliable web applications
* Framework agnostic solutions
* Meta-applications
* JamStack solutions

> Symbiote.js is designed to give the level of freedom, you got with Vanilla JS and to give the convenience level, as you got from the modern frameworks at the same time.

## 🔥 Core benefits
* Symbiote.js - is a total agnostic. It can work with any of modern tools or in the target environment directly.
* No extra dependencies.
* Ultralight (~6kb br/gzip).
* Global state-management already included, more powerful and flexible, than ever before.
* Styling engine already included, based on cutting-edge platform features.
* Blazing fast.
* Memory friendly (no immutables).
* CSP friendly - good for enterprise usage.
* Highly extensible - you can add new custom features with ease.
* Easy to learn - nothing completely new for experienced developers, nothing complicated for newbies.
* Works in all modern browsers. As is.
* Easy to test.
* TypeScript friendly - use it in TS or JS projects from the same source code.
* Integration friendly: works with any modern development stack.
* Lifecycle control: no need to initiate or to remove something from outside.
* ESM friendly - native JavaScript modules are best!
* Developer Experience on the mind: compact & convenient APIs, habitual syntax.
* Open source (MIT license).

## 💎 Tech concept keypoints
* Native modern APIs instead of performance-expensive external libraries.
* Shadow DOM is optional. Use it when you need it only.
* Total styling freedom: from the old classics to the cutting edge platform abilities.
* Native HTML instead of custom template syntax processing.
* Templates are out of the component or render function context. It’s just a simple JavaScript template literals. So you can keep or process them wherever you want.
* Fast synchronous UI updates, no unexpected redraws.
* Full data context access from the document structure.
* Full data context availability for template bindings.
* DOM API friendly approach for the most performant solutions.
* Convenient object model access instead of opaque abstractions.
* CDN friendly: every module is a possible endpoint for build or delivery process.

## 🧠 DX
We believe, that good Developer Experience is not just a vulgar minimum of symbols you typing.
We believe, that good DX is ability to easily understand, what exactly you see in the code and what exactly you doing. Mental models behind your work are very important for the best result achievement. So, we don't like an excess abstraction layers and the black-box magic compilers.

We build our DX philosophy on these principles:
* We keep our entities close to platform native ones
* We don't invent things, which are should be explained on a special developer conference
* We try to keep maximum similarity between your code and what happens in your runtime
* We keep in minimum the count of the necessary steps needed to deploy your code

## 🍏 Quick start
The easiest way to try Symbiote.js is to create a simple `html` file in your text editor and connect the Symbiote base class from web:

```html
<script type="module">
  import Symbiote, { html } from 'https://symbiotejs.github.io/symbiote.js/core/Symbiote.js';

  class MyComponent extends Symbiote {
    init$ = {
      count: 0,
      increment: () => {
        this.$.count++;
      },
    }
  }

  MyComponent.template = html`
    <h2>{{count}}</h2>
    <button ${{onclick: 'increment'}}>Click me!</button>
  `;

  MyComponent.reg('my-component');
</script>

<my-component></my-component>
```

**This code can work directly in any modern browser, so you don't need to install anything to try it!**

## 🧜‍♀️ Dive deeper
Check the project documentation for details:
* [rnd-pro.com/symbiote/](https://rnd-pro.com/symbiote/)
* [Docs](https://symbiotejs.org/2x/docs/Get_started/)
* [Code Playground](https://symbiotejs.org/#playground)

## ✅ Browser support
Symbiote.js is supported and tested in all major modern desktop and mobile browsers: 
* Chrome
* Firefox
* Safari
* Edge
* Opera
* etc.

**Internet Explorer** - is outdated and not supported anymore.

## 💰 General sponsor
Big thanks to 🟡 **Uploadcare** for supporting this project!

> https://uploadcare.com/

## 🌎 Useful external links
* https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
* https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM
* https://custom-elements-everywhere.com
* https://open-wc.org/

**If you have questions or proposals - welcome to [Symbiote Discussions](https://github.com/symbiotejs/symbiote.js/discussions)!** ❤️
