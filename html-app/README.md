# Symbiote HTML-app foundation

Use HTML-owned state and native Symbiote bindings without defining an application component class. The optional entry registers `sym-component` and `sym-context` and leaves the core entry independent.

## Load the foundation

Serve the package's ES modules over HTTP and load its optional entry:

```html
<script type="module" src="/vendor/symbiote/html-app/index.js"></script>

<sym-context ctx="APP">
  <script type="application/json">
    {
      "title": "Contacts",
      "contact": {"name": "Alex", "role": "Editor"}
    }
  </script>
  <h1>{{title}}</h1>
  <sym-context bind="$: APP/contact" pub-to="APP/contact"
    use-template="#contact-template"></sym-context>
</sym-context>

<template id="contact-template">
  <h2>{{name}}</h2>
  <p>{{role}}</p>
</template>
```

For a bundler or an existing module, import `@symbiotejs/symbiote/html-app`. No application build step is required for directly served modules.

## State and templates

- Put one strict JSON object in a direct `<script type="application/json">` child of an owner. Each instance parses its own defaults before its children bind. Referenced templates and Itemize templates can also provide defaults; incoming item data takes precedence. Nested owners read their own data scripts.
- Declare a child property before addressing it with `bind="$.property: APP/value"`. Use `bind="$: APP/object"` to merge and register a whole object instead.
- `sym-component` owns local state and processes authored HTML. It supports native `use-template` lookup and Itemize. Native generated item scopes also use the foundation base class.
- `sym-context` without `ctx` owns local state. With `ctx="APP"`, its local data and `APP/property` refer to the same native PubSub context. Named contexts need unique owners; an existing store is never overwritten.
- `bind="$: APP/contact"` uses native shallow merging: supplied fields update, missing fields are registered, and omitted fields remain. It does not replace the local state proxy or publish changes back automatically.
- Optional `pub-to="APP/contact"` publishes a fresh data object after an owned field changes. Incoming merges do not echo. The target must already exist in another context. Use native bindings for incoming state and explicit outgoing publication for edits.
- `process-inner-html="false"` disables an owner's inner binding parsing. Nested foundation elements still own and process their contents. The default is `true`.
- Removal releases subscriptions and owned named contexts after the native destruction delay. A move retains state; reconnecting a destroyed instance restores its authored markup and latest data.
- JSON keys are data-only local properties. Context prefixes and prototype-related keys are rejected. Only trusted templates and binding declarations belong in authored HTML.

See Symbiote's [templates](../docs/templates.md), [context](../docs/context.md), [state](../docs/properties.md) and [lists](../docs/list-rendering.md) references for the underlying APIs.
