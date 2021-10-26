## Attribute binding

```javascript
class MyComponent extends BaseComponent {
  set 'my-attribute'(val) {
    console.log(val);
  }
}

MyComponent.observedAttributes = [
  'my-attribute',
];
```

```javascript
class MyComponent extends BaseComponent {
  init$ = {
    myProp: null,
  }
}

MyComponent.bindAttributes({
  'my-attribute': 'myProp',
});
```