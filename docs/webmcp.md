# WebMCP

Symbiote.js can expose the current browser UI state as native WebMCP tools.

## Activation

WebMCP is optional. Import the extension before WebMCP-enabled components render:

```js
import Symbiote, { html } from '@symbiotejs/symbiote';
import '@symbiotejs/symbiote/webmcp';
```

The operation dictionary and WebMCP binding processors load with this extension. The core entry does not import them; its generic extension hooks also handle component and context lifecycle notifications.

For [HTML-app](../html-app/README.md#webmcp), import `@symbiotejs/symbiote/html-app/webmcp` to load the foundation with automatic tools enabled. This entry re-exports both the HTML-app components and WebMCP APIs. It enables tools for foundation components before registration and works with direct modules, bundlers and CDN bundles.

## Automatic Tools

Enable `mcpToolMode` globally or per component to generate tools from bound event handlers:

```js
Symbiote.mcpToolMode = true;

class WebmcpCounter extends Symbiote {
  count = 0;

  incrementCount() {
    this.$.count++;
    return this.$.count;
  }
}

WebmcpCounter.template = html`
  <h2>{{count}}</h2>
  <button ${{onclick: 'incrementCount'}}>Increment</button>
`;

WebmcpCounter.reg('webmcp-counter');
```

Automatic discovery uses an operation dictionary:

| Binding | Operation |
| --- | --- |
| `onclick` | Activate a control |
| `onsubmit` | Submit a form |
| `onchange` | Commit a control value or selection |
| `oninput` | Insert data into a control |

Mouseup, pointer movement, hover, focus, blur, scroll, and individual keyboard events do not create automatic tools. These events continue to work as ordinary UI bindings. Use an explicit `ToolDescriptor` for additional authored operations.

The generated tool name keeps the handler key and custom element tag:

```text
incrementCount_in_webmcp-counter
```

Generated list item tools include item identity when available. For keyed `itemize` data, `_KEY_` is used:

```text
selectItem_in_list-item_alpha
```

Popup bindings such as `^removeItem` are registered on the ancestor component that owns the handler, with source item context included in the tool name:

```text
removeItem_in_task-list_task-item_alpha
```

### Action metadata

Use the [WebMCP declarative API proposal's](https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md#form-attributes) `toolname` and `tooldescription` attributes on an eligible event-bound element:

```html
<button id="details-toggle"
  bind="onclick: toggleDetails"
  toolname="toggle_details"
  tooldescription="Expand or collapse the details panel.">
  Details
</button>
```

The proposal defines these attributes for forms; Symbiote also reads them on other controls for its automatic event tools. HTML attributes do not enable excluded event types. Explicit `ToolDescriptor` names and descriptions remain authoritative.

Description resolution uses `tooldescription`, then the control label, then an authored `toolname`, then an authored handler key. Labels use `aria-labelledby`, `aria-label`, associated labels, button/link text, or `title`; fallback label text is limited to 200 characters. Unlabeled framework-generated handlers are skipped when neither description nor tool name is supplied.

The description includes the event, control tag and label, existing element ID when non-empty, and component/list-item identity. For example:

```text
Expand or collapse the details panel.
Event: click. Control: <button> "Details". ID: details-toggle. Component: <details-panel>.
```

Bindings sharing a handler and source component produce one tool. An explicit description takes priority when choosing its binding; metadata and invocation target always come from that same binding. Call `component.syncWebMCPTools()` after changing labels or attributes to refresh descriptions, names, and eligibility. Name collisions use the existing `-N` suffix.

### Data insertion

Input tools update the selected DOM control before calling its bound handler, so that handler can publish the new data through normal state bindings:

```js
class QueryEditor extends Symbiote {
  query = '';
  updateQuery(event) {
    this.$.query = event.target.value;
  }
}
QueryEditor.template = html`
  <label>Query
    <input toolname="edit_query" bind="value: query; oninput: updateQuery">
  </label>
`;
QueryEditor.reg('query-editor');
```

After mounting the component, invoke `executeWebMCPTool('edit_query', { value: 'New query' })` or its native WebMCP counterpart.

| Control | Tool input |
| --- | --- |
| Text input or textarea | `{ value: string }` |
| Number or range input | `{ value: string \| number }` |
| Checkbox or radio | `{ checked: boolean }` |
| Single select | `{ value: string }` from enabled options |
| Multiple select | `{ value: string[] }` from enabled options |

`oninput` requires a value. `onchange` also accepts an empty object to invoke the handler against the current control state. Invalid input, unsupported select options, and disabled/read-only/inert controls cannot insert data. File inputs and controls without a supported value interface need explicit tools. Automatic handlers retain the synthetic event with `type: 'webmcp'` and the selected control as `target` and `currentTarget`.

### Native forms

Annotated forms with both `toolname` and `tooldescription` use the browser's declarative WebMCP implementation when available. Symbiote checks the document's imperative API and the declarative `SubmitEvent.agentInvoked` / `respondWith()` extensions. Imperative support alone does not cause forms to be skipped.

Symbiote omits a duplicate automatic submission tool for the form, including an associated submit control bound to the same handler. Independent control actions remain eligible. The browser owns form schemas, `toolparamdescription`, submission responses, and the user-review behavior controlled by `toolautosubmit`.

Without native declarative support, an annotated form can use the bound-handler fallback when `toolautosubmit` is present. Otherwise the fallback submission tool is omitted because it cannot represent the browser's user-review flow. Ordinary UI submission continues to work. Unannotated forms retain normal automatic handler discovery.

Browser-owned forms appear in native WebMCP discovery. `getActiveWebMCPTools()` and `executeWebMCPTool()` cover Symbiote-created tools; they do not mirror browser-owned form tools.

## Explicit Tool Descriptors

Use `ToolDescriptor` for descriptions, input schemas, execution logic, and dynamic visibility:

```js
import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';

class WebmcpPanel extends Symbiote {
  componentDescription = async () => {
    return 'Visible order editor with selected item state.';
  };

  init$ = {
    canSubmit: false,
    submit_order: new ToolDescriptor({
      description: 'Submit the currently visible order.',
      deps: ['canSubmit'],
      when: () => this.$.canSubmit,
      inputSchema: {
        type: 'object',
        properties: {
          note: { type: 'string' },
        },
      },
      execute: ({ note = '' }) => {
        return this.submitOrder(note);
      },
    }),
  };
}
```

`when()` is not auto-tracked. Add `deps` for every state key that should re-check tool visibility.

If a `ToolDescriptor` does not provide a custom `name`, component-owned tools use:

```text
<stateKey>_in_<custom-element-name>
```

Context-owned descriptors keep the raw state key as the default name.

## Context Tools

`ToolDescriptor` values inside named or shared `PubSub` contexts are registered once per context:

```js
import { PubSub } from '@symbiotejs/symbiote';
import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';

PubSub.registerCtx({
  search_docs: new ToolDescriptor({
    description: 'Search the current documentation context.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
    execute: ({ query }) => {
      return searchDocs(query);
    },
  }),
}, 'DOCS');
```

Template bindings to external named contexts can trigger context tool registration without duplicating tools per component.

## Component Context

Use `componentDescription` to give agents extra page-specific context. It can be a string or an async function:

```js
class UserCard extends Symbiote {
  componentDescription = async () => {
    let data = await fetch('/api/current-user-context').then((res) => res.text());
    return data;
  };
}
```

The returned text is appended to each component-owned tool description.

## Direct Invocation

Applications can discover and invoke tools through public APIs without native browser WebMCP support:

```js
import { getActiveWebMCPTools, executeWebMCPTool } from '@symbiotejs/symbiote/webmcp';

let tools = getActiveWebMCPTools();
let result = await executeWebMCPTool('submit_order_in_webmcp-panel', { note: 'Ready' });
```

Use a currently registered name from discovery. `executeWebMCPTool(name, input = {})` invokes the same executor used by native WebMCP, preserving its owner and automatic event-binding context. Synchronous handlers return their result directly; asynchronous handlers return a promise. Automatic handler responses include the state snapshot after the handler finishes.

Thrown errors, rejected promises, and unavailable tools return `{ isError: true, content: [{ type: 'text', text: '...' }] }`. Hidden or removed tools cannot be invoked. Calls already running are not cancelled when a tool is removed. Rediscover tools after interface changes; names identify current registrations, not permanent instances.

Discovery returns metadata only. `nativeActive` indicates native browser registration; a value of `false` does not prevent direct invocation. Native registration failure also leaves direct invocation available.

Direct invocation is an application API and does not provide browser-mediated consent or enforce native `exposedTo` restrictions. An external transport adapter is responsible for authentication, authorization, target selection, input-schema validation, and result serialization. Symbiote supplies no MCP server or transport. Native browser registration options remain unchanged.

## Notes

- This is an experimental release. Names, metadata shape, and browser APIs may change.
- Import `@symbiotejs/symbiote/webmcp` before rendering participating components.
- The original `bind` attribute is preserved in `mcpToolMode` so agent tooling can inspect Symbiote-specific markup context.
- Browser-side tool registration follows component lifecycle: tools register when components render and unregister when components leave the DOM.

---

Next: [Routing →](./routing.md)
