import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

globalThis.HTMLElement ||= class {};

const registered = new Map();

Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    modelContext: {
      registerTool(tool, options = {}) {
        registered.set(tool.name, tool);
        options.signal?.addEventListener('abort', () => {
          registered.delete(tool.name);
        });
      },
    },
  },
});

const { PubSub } = await import('../../core/PubSub.js');
const {
  ToolDescriptor,
  webMCPRegistry,
  getActiveWebMCPTools,
  syncWebMCPTools,
} = await import('../../core/webmcp.js');

function clearRegistry() {
  registered.clear();
  let tools = webMCPRegistry.store.tools;
  for (let name of Object.keys(tools.store)) {
    tools.delete(name);
  }
  let owners = webMCPRegistry.store.owners;
  for (let id of Object.keys(owners.store)) {
    owners.delete(id);
  }
}

describe('WebMCP registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('uses nested PubSub contexts keyed by registered tool name', () => {
    assert.ok(webMCPRegistry.store.tools instanceof PubSub);
    assert.ok(webMCPRegistry.store.owners instanceof PubSub);
    assert.ok(webMCPRegistry.store.diagnostics instanceof PubSub);
  });

  it('registers and unregisters PubSub-owned ToolDescriptor values', () => {
    let ctxName = `webmcp-test-${Date.now()}`;
    let ctx = PubSub.registerCtx({
      count: 0,
      add_item: new ToolDescriptor({
        description: 'Add item from test context.',
        inputSchema: {
          type: 'object',
          properties: { amount: { type: 'number' } },
          required: ['amount'],
        },
        execute({ amount }) {
          ctx.pub('count', ctx.read('count') + amount);
          return ctx.read('count');
        },
      }),
    }, ctxName);

    assert.equal(webMCPRegistry.store.tools.has('add_item'), true);
    assert.equal(registered.has('add_item'), true);
    assert.deepEqual(getActiveWebMCPTools().map((tool) => tool.name), ['add_item']);
    assert.equal(registered.get('add_item').execute({ amount: 2 }), 2);
    assert.equal(ctx.read('count'), 2);

    PubSub.deleteCtx(ctxName);
    assert.equal(webMCPRegistry.store.tools.has('add_item'), false);
    assert.equal(registered.has('add_item'), false);
  });

  it('resyncs when explicit deps change and does not infer when() dependencies', async () => {
    let ctxName = `webmcp-when-${Date.now()}`;
    let ctx = PubSub.registerCtx({
      canRun: false,
      gated_tool: new ToolDescriptor({
        description: 'Gated tool.',
        deps: ['canRun'],
        when: () => ctx.read('canRun'),
        execute: () => 'ok',
      }),
    }, ctxName);

    assert.equal(registered.has('gated_tool'), false);
    ctx.pub('canRun', true);
    await Promise.resolve();
    assert.equal(registered.has('gated_tool'), true);

    PubSub.deleteCtx(ctxName);
  });

  it('supports async componentDescription without owner argument', async () => {
    class AsyncDescriptionComponent extends HTMLElement {
      static is = 'async-description';

      constructor() {
        super();
        this.localCtx = new PubSub({
          async_context_tool: new ToolDescriptor({
            description: 'Tool with remote component context.',
            execute: () => 'ok',
          }),
        });
        this.isConnected = true;
        this.ownerArgument = 'not-called';
      }

      async componentDescription(arg) {
        this.ownerArgument = arg;
        await Promise.resolve();
        return 'Resolved component context.';
      }
    }

    let component = new AsyncDescriptionComponent();
    syncWebMCPTools(component);
    assert.equal(registered.has('async_context_tool_in_async-description'), false);

    await new Promise((resolve) => setImmediate(resolve));

    let tool = registered.get('async_context_tool_in_async-description');
    assert.ok(tool);
    assert.equal(component.ownerArgument, undefined);
    assert.match(tool.description, /Resolved component context/);
  });
});
