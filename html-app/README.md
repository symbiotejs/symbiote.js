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

## Declarative actions

Use action descriptors on native event bindings. Ordinary named handlers and ToolDescriptor bindings keep their native behavior.

```html
<sym-context ctx="UI">
  <script type="application/json">
    {
      "open": false,
      "note": "",
      "section": "home"
    }
  </script>
  <button type="button" bind="onclick: [toggle]UI/open">Toggle</button>
  <button type="button" value="settings" bind="onclick: [set]UI/section">Settings</button>
  <label>Note
    <input bind="value: UI/note; oninput: [pub-to-200]UI/note">
  </label>
</sym-context>
```

- `[toggle]REF` requires an existing boolean. `[set]REF` publishes the control's native value; `action-data="APP/value"` instead reads typed data through a native context reference. Literal button values `true` and `false` are converted when the target is boolean.
- `[pub-to]REF` reads text inputs and single selects as strings, checkboxes as booleans, checked radios as their string value, multiple selects as string arrays, and number/range inputs as finite numbers. An empty numeric input publishes null. Text such as `0012` stays text.
- An optional millisecond suffix, such as `[pub-to-200]`, debounces publication. Values are captured during input handling. Composition remains a draft until completion; incoming target updates, rebinds, removal and item reuse cancel stale publications.
- References use native local, named, shared and pop-up contexts. Targets must exist and be writable data properties. Non-null target types must match the supplied data. Invalid descriptors and incompatible values fail explicitly; there is no expression evaluation or action-chain syntax.
- Native disabled fieldsets, read-only controls and inert content block actions. A binding uses its own control, including when an inner icon receives the click.
- A configured form action validates the form and flushes pending field publications before reading data. A submit button can supply `action-data` or its native value. Only configured form actions prevent navigation; ordinary form submission and named handlers retain their behavior.
- Framework-generated handler keys are reserved implementation details. Optional WebMCP uses the native event discovery path; loading the foundation does not enable WebMCP globally.

## Publish several properties

```html
<sym-component pub-map="APP/section: section; APP/heading: heading">
  <script type="application/json">
    {
      "section": "settings",
      "heading": "Settings"
    }
  </script>
</sym-component>
```

Declare the destination fields in their owning context first. `pub-map` publishes local data, including initialization and computed sources, through native context resolution. It coalesces synchronous source changes into one microtask, skips unchanged values, and releases subscriptions when remapped or disconnected. Its writes remain sequential; it is not a transaction across contexts.
