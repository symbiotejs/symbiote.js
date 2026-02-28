# Properties

## Property initialization

For simple components, define properties as class fields — Symbiote picks them up automatically via fallback:
```js
class MyComponent extends Symbiote {
  myProp = 'some value';
  someOtherProp = 123;
  oneMoreProp = true;
}
```

For complex components with shared context, computed props, or many reactive properties, use `init$` to explicitly declare state:
```js
class MyComponent extends Symbiote {
  init$ = {
    myProp: 'some value',
    '*sharedProp': [],
    '+computed': () => this.$.myProp.length,
  }
}
```
The `init$` map should be a flat object that provides access to all values by top-level keys. Nested property key access (e.g. `'obj.prop'`) is **not supported** — use flat names instead.

## Reading and writing values

Use the `$` proxy (a standard JavaScript `Proxy` object) to access property values:
```js
class MyComponent extends Symbiote {
  time = Date.now();

  renderCallback() {
    // Write a new value:
    this.$.time = Date.now();

    // Read current value:
    console.log(this.$.time);
  }
}
```

## Bulk updates

To change multiple property values at once, use the `set$` method:
```js
class MyComponent extends Symbiote {

  init$ = {
    firstProp: 'some value',
    secondProp: 'some value',
  }

  renderCallback() {
    this.set$({
      firstProp: 'new value',
      secondProp: 'new value',
    });
  }

}
```

The optional second argument `forcePrimitives` triggers callbacks even if the value hasn't changed (for primitive types):
```js
this.set$({ count: 0 }, true); // forces notification even though value may be the same
```

## Property subscription

To subscribe to property changes, use the `sub` method:
```js
class MyComponent extends Symbiote {

  init$ = {
    myProp: 'some value',
  }

  renderCallback() {
    this.sub('myProp', (newVal) => {
      console.log(newVal);
    });

    // This will invoke the subscription callback:
    this.$.myProp = 'Changed value';
  }

}
```

The third argument `init` (default `true`) controls whether the handler is called immediately with the current value:
```js
this.sub('myProp', handler, false); // don't call handler immediately
```

To trigger change notification manually:
```js
this.notify('myProp');
```

## Adding properties dynamically

Add properties to the context at runtime:
```js
this.add('newProp', 'initial value');     // single property
this.add$({ prop1: 'a', prop2: 'b' });   // bulk add
```

Check if a property exists:
```js
this.has('myProp'); // true / false
```

## Computed properties

Computed properties recalculate their values automatically when dependencies change. Use the `+` prefix for the property name.

### Local computed (auto-tracked)

Dependencies are recorded automatically when the function executes:
```js
class MyComponent extends Symbiote {

  init$ = {
    a: 1,
    b: 2,
    '+sum': () => this.$.a + this.$.b, // auto-tracks 'a' and 'b'
  }

}

MyComponent.template = html`<div>{{+sum}}</div>`;
```

> Computed values are recalculated asynchronously (via `queueMicrotask`). The computed doesn't make an excess re-render if the final value has not changed.

### Cross-context computed (explicit deps)

When a computed property depends on external named context properties, you must declare dependencies explicitly:
```js
init$ = {
  local: 0,
  '+total': {
    deps: ['GAME/score'],
    fn: () => this.$['GAME/score'] + this.$.local,
  },
};
```

To trigger manual recalculation:
```js
this.notify('+computedText');
```

## Property context and tokens

Symbiote components can interact with different types of properties, not just local ones. The context type is set by key prefixes:

| Prefix | Meaning | Description |
|--------|---------|-------------|
| _(none)_ | Local | Component's own local state |
| `^` | Inherited | Direct access to upper level component property |
| `*` | Shared | Share properties between components in the same workflow context |
| `/` | Named | Access abstract named data context |
| `--` | CSS Data | Initiate property from CSS custom property value |
| `@` | Attribute | Bind state property to HTML attribute value |
| `+` | Computed | Auto-calculated derived value |

> More details in the [Context](./context.md) section.

---

Next: [Context →](./context.md)
