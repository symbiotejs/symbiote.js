# Flags

Flags are settings that enable or disable specific features or behaviors.

## Complete list

| Flag | Default | Description |
|------|---------|-------------|
| `renderShadow` | `false` | Render template into Shadow DOM |
| `ssrMode` | `false` | Hydrate server-rendered HTML |
| `isoMode` | `false` | Isomorphic mode: hydrate if children exist, render template otherwise |
| `isVirtual` | `false` | Replace element with its template fragment |
| `allowCustomTemplate` | `false` | Allow `use-template` attribute |
| `pauseRender` | `false` | Skip automatic rendering |
| `processInnerHtml` | `false` | Process existing inner HTML |
| `readyToDestroy` | `true` | Allow cleanup on disconnect |
| `allowTemplateInits` | `true` | Auto-add props found in template |
| `lazyMode` | `false` | Defer initialization until component enters the viewport |
| `mcpToolMode` | `false` | Generate experimental WebMCP tools from bound event handlers |

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

## isoMode

Isomorphic rendering flag. If the component has children when it connects on the client (server-rendered content), it behaves like `ssrMode = true` — hydrates existing DOM. If the component has **no children**, it renders the template normally:
```js
class MyComponent extends Symbiote {

  isoMode = true;

}
```

This is useful for components that may or may not be server-rendered — the same component code works in both scenarios without conditional logic.

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

## lazyMode

Defers component initialization until it enters the viewport using a global \`IntersectionObserver\`. When the component scrolls out of view, its internal DOM is cleared to save memory, and its dimensions (\`min-height\` and \`min-width\`) are preserved to prevent scrollbar jumping. State updates are preserved while hidden and applied when the component re-enters the viewport.

```js
class MyComponent extends Symbiote {

  lazyMode = true;

}
```

This is most commonly used by adding the \`lazy\` attribute to an \`itemize\` container to optimize rendering of massive lists:

```html
<div itemize="myItems" lazy>
  <template>
    <h3>{{title}}</h3>
    <div>{{description}}</div>
  <template>
</div>
```

## mcpToolMode

Enables experimental WebMCP auto-tool generation for bound event handlers. WebMCP is an optional extension, so import it before WebMCP-enabled components render:

```js
import Symbiote, { html } from '@symbiotejs/symbiote';
import '@symbiotejs/symbiote/webmcp';

Symbiote.mcpToolMode = true; // global opt-in
```

You can also enable it per component:

```js
class MyComponent extends Symbiote {
  mcpToolMode = true;
}
```

See [WebMCP Experimental](./webmcp.md) for tool descriptors, naming, and browser requirements.

---

Next: [Attributes →](./attributes.md)
