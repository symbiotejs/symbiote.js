# Flags

Flags are settings that enable or disable specific features or behaviors.

## Complete list

| Flag | Default | Description |
|------|---------|-------------|
| `renderShadow` | `false` | Render template into Shadow DOM |
| `ssrMode` | `false` | Hydrate server-rendered HTML |
| `isVirtual` | `false` | Replace element with its template fragment |
| `allowCustomTemplate` | `false` | Allow `use-template` attribute |
| `pauseRender` | `false` | Skip automatic rendering |
| `processInnerHtml` | `false` | Process existing inner HTML |
| `readyToDestroy` | `true` | Allow cleanup on disconnect |
| `allowTemplateInits` | `true` | Auto-add props found in template |

## renderShadow

Enables Shadow DOM mode. When enabled, you can use standard slots and `:host` selectors:
```js
class MyComponent extends Symbiote {

  renderShadow = true;

}
```

## ssrMode

Enables the hydration workflow — the component uses its own nested markup as a template (provided by the server as regular HTML).

Text and attribute bindings are activated on first update, not at state initialization:
```js
class MyComponent extends Symbiote {

  ssrMode = true;

}
```

In 3.x, `ssrMode` supports both light DOM and Declarative Shadow DOM hydration. Template injection is skipped; bindings attach to existing DOM.

> **Note**: `ssrMode` is a client-side flag. It is separate from `__SYMBIOTE_SSR` (server-side global). See [SSR](./ssr.md) for details.

## isVirtual

The component renders its template only, without the wrapping Custom Element. The Custom Element is used as a placeholder and disappears after initial rendering. Data bindings continue to work in memory:
```js
class MyComponent extends Symbiote {

  isVirtual = true;

}
```

## allowCustomTemplate

The component's template is taken from an accessible part of the document by the provided selector:
```js
class MyComponent extends Symbiote {

  allowCustomTemplate = true;

}
```

Then use the `use-template` attribute:
```html
<template id="my-tpl">
  <h1>{{someHeading}}</h1>
</template>

<my-component use-template="template#my-tpl"></my-component>
```

## pauseRender

Disables the default render stage to allow additional logic before rendering. Call `render()` manually:
```js
class MyComponent extends Symbiote {

  pauseRender = true;

  initCallback() {
    fetch('../my-data.json').then((response) => {
      response.json().then((data) => {
        this.set$(data);
        this.render();
      });
    });
  }

}
```

## processInnerHtml

Similar to `ssrMode`, but all initiated data is rendered immediately. You can use standard template binding syntax for text nodes:
```js
class MyComponent extends Symbiote {

  processInnerHtml = true;

}
```

```html
<my-component>
  <h1>{{someHeading}}</h1>
</my-component>
```

## readyToDestroy

Controls whether the component is destroyed when removed from DOM. Set to `false` to **disable** destruction:
```js
class MyComponent extends Symbiote {

  readyToDestroy = false;

}
```

See also: `destructionDelay` in [Lifecycle](./lifecycle.md).

## allowTemplateInits

Controls automated property initialization from template mentions. Disable to require explicit `init$` declarations:
```js
class MyComponent extends Symbiote {

  allowTemplateInits = false;

}

// The 'heading' property won't be auto-initialized:
MyComponent.template = html`
  <h1>{{heading}}</h1>
`;
```

---

Next: [Attributes →](./attributes.md)
