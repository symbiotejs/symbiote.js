## Attribute binding

To process any attribute changes, you can use accessors:
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

It's possible to bind attribute values directly to data context properties:
```javascript
class MyComponent extends BaseComponent {
  init$ = {
    myProp: null,
    '*commonProp': 'initial value' 
  }
}

MyComponent.bindAttributes({
  'my-attribute': 'myProp',
  'other-attribute': '*commonProp',
});
```