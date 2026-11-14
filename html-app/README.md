# Symbiote HTML-app foundation

Use HTML-owned state and native Symbiote bindings without defining an application component class. The optional entry registers `sym-component`, `sym-context`, `sym-collection` and `sym-conditional` and leaves the core entry independent.

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

## Collections and immutable record actions

[Open the HTML-only Todo example](./todo-ref.html) through your HTTP server. Its external module script loads the foundation; application behavior is entirely in HTML attributes and JSON.

`sym-collection data="APP/tasks"` owns a derived view of an existing array. Records must be JSON objects with unique nonempty string `id` values. IDs remain stable; Itemize metadata stays outside application records and DOM attributes.

```html
<sym-collection data="APP/tasks" filter="APP/filter"
  search="APP/query" search-fields="title,notes" sort="APP/sort"
  pub-map="APP/shown: count; APP/total: totalCount">
  <ul itemize="items">
    <template>
      <li>
        <label><input type="checkbox" bind="checked: done; onchange: [item-pub]done">Done</label>
        <label>Title<input required bind="value: title; oninput: [item-pub]title"></label>
        <button type="button" bind="onclick: [item-remove]">Delete</button>
      </li>
    </template>
  </ul>
  <p bind="hidden: !empty">No matching records.</p>
</sym-collection>
```

- Declare the referenced properties in an owning context. `data` is a writable array reference, not a URL. The derived view properties are `items`, `count`, `totalCount` and `empty`.
- Optional `filter` references a record of scalar field/value pairs, matched with typed AND equality. Optional `search` references a string and requires comma-separated `search-fields`. Optional `sort` references `{"field":"title","direction":"asc"}` or `desc`. Filtering, search and sorting never replace the source array.
- Render `items` with native Itemize and an authored template or registered foundation item component. Keyed reconciliation preserves each record's element and focus. No item controls, wrappers or styles are imposed.
- `[append]REF` clones the record referenced by `action-data` and appends it, generating a missing ID. A form applies native validation and flushes pending field publications first. Optional `action-reset="APP/draft"` restores that property's authored JSON default only after success; invalid or failed operations retain the draft.
- `[item-pub]FIELD` publishes the control's typed value to an existing field of the current source record. `[item-toggle]FIELD` toggles a boolean. `[item-remove]` removes the record. Fields are local record keys; IDs cannot be edited. Invalid native controls keep their draft without publishing or announcing errors on every keystroke.
- `[item-pub-200]FIELD` supports the same debounce and composition handling as `[pub-to-200]`. Source changes, retargeting, disposal and item reuse cancel stale work.
- `[patch-matching]REF` requires explicit `action-match` and `action-data` record references. An empty match patches every record. `[remove-matching]REF` requires a nonempty `action-match`; an empty match cannot clear the array. Matching uses typed AND equality, without expressions.
- Updates validate before publishing one fresh array and preserve untouched records and fields. JSON-only values, immutable IDs and compatible field types are enforced. The collection releases source subscriptions on removal and rebinds when its reference attributes change.

## Reusable component declarations

Register an autonomous custom element from a direct template or a native `use-template` reference:

```html
<sym-component reg="status-note">
  <template>
    <script type="application/json">{"message":"Ready"}</script>
    <p>{{message}}</p>
  </template>
</sym-component>

<status-note></status-note>

<template id="task-item">
  <label><input type="checkbox" bind="checked: done; onchange: [item-pub]done">Done</label>
  <label>Title<input required bind="value: title; oninput: [item-pub]title"></label>
  <button type="button" bind="onclick: [item-remove]">Delete</button>
</template>
<sym-component reg="task-item" use-template="#task-item"></sym-component>
```

- A declaration stays hidden and does not render an instance or process its template actions. Registration upgrades existing instances too. Declarations in a rendered template are registered before Itemize consumes that template.
- Each instance has its own native context and JSON defaults. Instance JSON, incoming data and native `use-template` overrides retain precedence over declaration defaults.
- Template lookup checks the containing root before the document. A declaration's `use-template` takes precedence over a direct template. Names are validated by the Custom Elements registry. Identical declarations are idempotent; conflicting declarations or unrelated registered tags fail explicitly. Definitions are static for the page lifetime.
- Use `item-tag="task-item"` on an Itemize container to use the registered item. Generated items can instead reuse an extracted template directly: `<ul itemize="items" use-template="#task-item"></ul>`. A registered `item-tag` supplies its own template.

## Conditional content

```html
<sym-conditional when="APP/showDetails" is="true">
  <label>Notes<textarea bind="value: APP/notes; oninput: [pub-to]APP/notes"></textarea></label>
</sym-conditional>
<sym-conditional when="APP/section" is="settings" behavior="dom-add">
  <settings-panel></settings-panel>
</sym-conditional>
```

- `when` references a declared native data property, including computed sources. Without `is`, matching uses truthiness. With `is`, matching is strict: `true` and `false` become booleans; other literals remain strings. Use `is-type="string"` to match the literal strings `true` or `false`.
- `behavior="show"` (the default) shows content when matched. `hide` hides it when matched. Both keep the same mounted content and unpublished control drafts.
- `dom-add` mounts when matched; `dom-remove` removes when matched. Both dispose inactive content immediately, including its actions, pending edits, subscriptions and owned contexts. A later mount creates fresh content from the authored template.
- Inactive content is hidden and inert. Local bindings retain the conditional owner's context. Nested components keep their own contexts. Attribute changes rebind the condition without retaining old subscriptions.
- Native `use-template` and `process-inner-html="false"` remain available. No expression evaluation, additional styling or action-chain syntax is introduced.
