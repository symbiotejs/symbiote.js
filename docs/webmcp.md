# WebMCP

Symbiote.js can expose the current browser UI state as native WebMCP tools.

## Activation

WebMCP is optional. Import the extension before WebMCP-enabled components render:

```js
import Symbiote, { html } from '@symbiotejs/symbiote';
import '@symbiotejs/symbiote/webmcp';
```

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
