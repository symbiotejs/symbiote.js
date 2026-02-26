# PubSub

`PubSub` is the main Symbiote.js entity for data manipulation. It implements the [Publish-Subscribe](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern) pattern and provides everything you need to organize data flow inside and outside your components. It is integrated into the `Symbiote` base class but can also be used standalone:
```js
import { PubSub } from '@symbiotejs/symbiote';

let myDataCtx = PubSub.registerCtx({
  myProp: 'some value',
  myOtherProp: 'some other value',
});
```

## Static methods

### PubSub.registerCtx()

Create and register a `PubSub` instance.

```js
registerCtx(schema)
registerCtx(schema, id)

// > PubSub instance
```

| Argument | Type | Required | Description |
|:--|:--|:--|:--|
| `schema` | `Object<string, *>` | yes | Property map |
| `id` | `String \| Symbol` | no | Context ID |

```js
let myDataCtx = PubSub.registerCtx({
  myProp: 'some value',
  myOtherProp: 'some other value',
}, 'MY_CTX_ID');
```

### PubSub.getCtx()

Get a PubSub object from the registry.

```js
getCtx(id)
getCtx(id, notify)

// > PubSub instance or null
```

| Argument | Type | Required | Description |
|:--|:--|:--|:--|
| `id` | `String \| Symbol` | yes | Context ID |
| `notify` | `Boolean` | no | Trigger notification on retrieval |

```js
let myDataCtx = PubSub.getCtx('MY_CTX_ID');
```

### PubSub.deleteCtx()

Remove a `PubSub` object from the registry and clear memory.

```js
PubSub.deleteCtx('MY_CTX_ID');
```

## Instance methods

### pub()

Publish a new property value.

| Argument | Type | Required | Description |
|:--|:--|:--|:--|
| `propertyKey` | `String` | yes | Property name |
| `newValue` | `*` | yes | Property value |

```js
myDataCtx.pub('propertyName', 'newValue');
```

### multiPub()

Publish multiple changes at once.

| Argument | Type | Required | Description |
|:--|:--|:--|:--|
| `propertyMap` | `Object<string, *>` | yes | Key/value update map |

```js
myDataCtx.multiPub({
  propertyName: 'new value',
  otherPropertyName: 'other new value',
});
```

### sub()

Subscribe to property changes.

| Argument | Type | Required | Description |
|:--|:--|:--|:--|
| `propertyName` | `String` | yes | Property name |
| `handler` | `(newValue) => void` | yes | Update handler |

```js
myDataCtx.sub('propertyName', (newValue) => {
  console.log(newValue);
});
```

### read()

Read a property value.

```js
myDataCtx.read('propertyName');
```

### has()

Check whether a property exists.

```js
myDataCtx.has('propertyName'); // true / false
```

### add()

Add a new property.

| Argument | Type | Required | Description |
|:--|:--|:--|:--|
| `propertyName` | `String` | yes | Property name |
| `initValue` | `*` | yes | Initial value |

```js
myDataCtx.add('propertyName', 'init value');
```

### notify()

Manually invoke all subscription handlers for a property.

```js
myDataCtx.notify('propertyName');
```

## Dev mode

Enable `PubSub.devMode` for verbose warnings (type mismatches, missing properties):
```js
Symbiote.devMode = true; // also sets PubSub.devMode
```

See [Dev Mode](./dev-mode.md) for details.

---

Next: [Styling →](./styling.md)
