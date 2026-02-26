# Lifecycle

Symbiote component is an extension of a native Custom Element, so it has all regular [lifecycle stages](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks):
- `constructor()`
- `connectedCallback()`
- `disconnectedCallback()`
- `adoptedCallback()`
- `attributeChangedCallback(name, oldValue, newValue)`

## Additional lifecycle callbacks

| Method | When called |
|--------|------------|
| `initCallback()` | Once, after state initialized, before render (if `pauseRender=true`) or normally after render |
| `renderCallback()` | Once, after template is rendered and attached to DOM |
| `destroyCallback()` | On disconnect, after delay, only if `readyToDestroy=true` |

`renderCallback()` is the most common place to describe component logic:
```js
class MyComponent extends Symbiote {

  renderCallback() {
    // You have access to data and all DOM API methods here
    // this.ref, this.$, DOM children are all available
  }

}
```

## Destruction and cleanup

By default, components are destroyed when disconnected from DOM (after a 100ms delay). This delay allows synchronous DOM moves (e.g. list reordering) without triggering destruction.

If you do **NOT** plan to permanently remove your component from DOM, disable destruction:
```js
class MyComponent extends Symbiote {

  readyToDestroy = false;

}
```

Otherwise, the component will be destroyed on DOM detachment if you don't return it back with a synchronous DOM API call.

### `destructionDelay`

Configure the delay (in milliseconds) before cleanup in `disconnectedCallback`:
```js
class MyComponent extends Symbiote {

  destructionDelay = 500; // default is 100

}
```

This is useful when components might be temporarily removed and re-added to the DOM (animations, transitions, etc.).

### `destroyCallback()`

Called when the component is about to be destroyed and removed from memory:
```js
class MyComponent extends Symbiote {

  destroyCallback() {
    // Clean up external resources, event listeners, etc.
  }

}
```

---

Next: [Flags →](./flags.md)
