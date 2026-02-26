# Attributes

Like all regular DOM elements, Symbiote components can have their own HTML attributes. And like standard Custom Elements, they can react to dynamic attribute changes.

## Attribute connection

The simplest way to connect a local state property to an attribute value is with the `@` token:
```js
class MyComponent extends Symbiote {

  init$ = {
    '@attribute-name': 'initial value',
  }

}
```

Or initiate from the component's template directly:
```js
class MyComponent extends Symbiote {}

MyComponent.template = html`<h1>{{@attribute-name}}</h1>`;
```

Then use it as an attribute in markup:
```html
<my-component attribute-name="attribute value"></my-component>
```

## Attribute change reaction

Using a property accessor:
```js
class MyComponent extends Symbiote {

  set 'my-attribute'(val) {
    console.log(val);
  }

}

MyComponent.observedAttributes = [
  'my-attribute',
];
```

## `bindAttributes()` static method

Bind attributes to property values directly:
```js
class MyComponent extends Symbiote {

  init$ = {
    myProp: '',
  }

}

// Map the attribute name to corresponding property key:
MyComponent.bindAttributes({
  'my-attribute': 'myProp',
});

// observedAttributes is auto-populated

MyComponent.template = html`
  <div>{{myProp}}</div>
`;
```

## Reserved attribute names

These attribute names are used internally by Symbiote.js:

- `bind`
- `ctx`
- `ref`
- `itemize`
- `item-tag`
- `use-template`
- `skip-text-nodes`

---

Next: [PubSub →](./pubsub.md)
