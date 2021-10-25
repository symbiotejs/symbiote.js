## Component lifecycle

Symbiote component - is a Custom Element, so it has all [native lifecycle callbacks](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks). But it also has two custom ones. Let's walk through the most of them:

```javascript
class MyComponent extends BaseComponent {
  constructor() {
    super();
    // NATIVE: Element constructor. Element is not present in DOM structure.
  }

  connectedCallback() {
    // NATIVE: Element connected to the DOM. Standars DOM API methods are available.
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    // NATIVE: HTML attribute has changed
  }

  initCallback() {
    // CUSTOM: Element is connected to DOM. Unlike a "connectedCallback" would be called only once. Data context is availible.
  }

  disconnectedCallback() {
    // NATIVE: Element removed from DOM, but still presents in memory.
  }

  destroyCallback() {
    // CUSTOM: this callback is asynchronously called after the "disconnectedCallback" if component is ready to be destroed. Data subscriptions removed. Memory is cleared. You cannot use this element anymore. If you need  it again - create the new one.
  }

}
```

For the most simple cases, you will need custom `initCallback` only. Here you can subscribe on some property, or process some template element reference:
```javascript
class MyComponent extends BaseComponent {
  initCallback() {
    this.sub('propName', (propValue) => {
      this.ref.someOtputElement.textContent = propValue;
    });
  }
}
```

If you DO NOT planning to permanently remove your component from DOM and destroy it - set `readyToDestroy` property:
```javascript
class MyComponent extends BaseComponent {
  readyToDestroy = false;
}
```
Otherwise, component will be destroyed in case of DOM detachment, if you will not return it back with a synchronous DOM API call.

Than means, that you able to take Symbiote component from the one place in DOM and move it to another place **synchronously** (f.e. for the list ordering), without any additional action from your side.
