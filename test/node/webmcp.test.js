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
  registerWebMCPTool,
  syncWebMCPTools,
  unregisterWebMCPTools,
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

  it('ToolDescriptor constructor applies defaults', () => {
    let td = new ToolDescriptor({});
    assert.equal(td.description, 'Symbiote WebMCP tool.');
    assert.deepEqual(td.inputSchema, { type: 'object', properties: {}, additionalProperties: false });
    assert.equal(td.name, undefined);
    assert.deepEqual(td.deps, []);
    assert.equal(td.when, undefined);
    assert.equal(td.exposedTo, undefined);
    assert.equal(td.annotations, undefined);
  });

  it('ToolDescriptor execute throws when no fn provided', () => {
    let td = new ToolDescriptor({});
    assert.throws(() => td.execute(), /requires an execute function/);
  });

  it('ToolDescriptor execute calls fn with correct args, owner binding, and event', () => {
    let captured = {};
    let td = new ToolDescriptor({
      execute(args, owner, event) {
        captured = { args, owner, event, self: this };
      },
    });
    let owner = { id: 'owner' };
    let event = { type: 'webmcp' };
    td.execute({ x: 1 }, owner, event);
    assert.deepEqual(captured.args, { x: 1 });
    assert.equal(captured.owner, owner);
    assert.equal(captured.event, event);
    assert.equal(captured.self, owner);
  });

  it('registerWebMCPTool registers a single tool imperatively on a context', () => {
    let ctxName = `manual-reg-${Date.now()}`;
    let ctx = PubSub.registerCtx({ count: 0 }, ctxName);
    let descriptor = new ToolDescriptor({
      description: 'Imperatively registered.',
      execute: () => 'imperative',
    });

    let result = registerWebMCPTool(ctx, 'imperative_op', descriptor);
    assert.ok(result && !(result instanceof Promise));
    assert.equal(registered.has('imperative_op'), true);
    assert.equal(registered.get('imperative_op').execute({}), 'imperative');
    assert.equal(webMCPRegistry.store.tools.has('imperative_op'), true);

    PubSub.deleteCtx(ctxName);
    assert.equal(registered.has('imperative_op'), false);
  });

  it('unregisterWebMCPTools removes all owner tools without deleting the context', () => {
    let ctxName = `unreg-${Date.now()}`;
    let ctx = PubSub.registerCtx({
      unreg_a: new ToolDescriptor({ execute: () => 'a' }),
      unreg_b: new ToolDescriptor({ execute: () => 'b' }),
    }, ctxName);

    assert.equal(registered.has('unreg_a'), true);
    assert.equal(registered.has('unreg_b'), true);

    unregisterWebMCPTools(ctx);

    assert.equal(registered.has('unreg_a'), false);
    assert.equal(registered.has('unreg_b'), false);
    assert.equal(webMCPRegistry.store.tools.has('unreg_a'), false);
    assert.equal(webMCPRegistry.store.tools.has('unreg_b'), false);

    PubSub.deleteCtx(ctxName);
  });

  it('getActiveWebMCPTools returns serialized entries without internal controller field', () => {
    let ctxName = `shape-${Date.now()}`;
    PubSub.registerCtx({
      shape_tool: new ToolDescriptor({ description: 'Shape test.', execute: () => 'ok' }),
    }, ctxName);

    let tools = getActiveWebMCPTools();
    let entry = tools.find((t) => t.name === 'shape_tool');
    assert.ok(entry);
    assert.equal(typeof entry.name, 'string');
    assert.equal(typeof entry.description, 'string');
    assert.equal(typeof entry.inputSchema, 'object');
    assert.equal(typeof entry.ownerId, 'string');
    assert.equal(entry.ownerType, 'context');
    assert.equal(typeof entry.ownerName, 'string');
    assert.equal(entry.active, true);
    assert.equal('controller' in entry, false);

    PubSub.deleteCtx(ctxName);
  });

  it('resolves name collision with -N suffix when two owners use the same explicit tool name', () => {
    let ctx1 = `col1-${Date.now()}`;
    let ctx2 = `col2-${Date.now()}`;
    PubSub.registerCtx({
      op: new ToolDescriptor({ execute: () => 'first', name: 'collision_name' }),
    }, ctx1);
    PubSub.registerCtx({
      op: new ToolDescriptor({ execute: () => 'second', name: 'collision_name' }),
    }, ctx2);

    let names = getActiveWebMCPTools().map((t) => t.name);
    assert.ok(names.includes('collision_name'));
    assert.ok(names.includes('collision_name-2'));

    PubSub.deleteCtx(ctx1);
    PubSub.deleteCtx(ctx2);
  });

  it('registers tools synchronously when componentDescription is a plain string', () => {
    class SyncDescComponent extends HTMLElement {
      static is = 'sync-desc';
      constructor() {
        super();
        this.localCtx = new PubSub({
          sync_tool: new ToolDescriptor({ description: 'Sync.', execute: () => 'ok' }),
        });
        this.isConnected = true;
        this.componentDescription = 'Sync description string.';
      }
    }

    let component = new SyncDescComponent();
    syncWebMCPTools(component);

    assert.equal(registered.has('sync_tool_in_sync-desc'), true);
    assert.match(registered.get('sync_tool_in_sync-desc').description, /Sync description string\./);
  });

  it('calls async componentDescription exactly once per sync regardless of tool count', async () => {
    let callCount = 0;

    class MultiToolComponent extends HTMLElement {
      static is = 'multi-tool-desc';
      constructor() {
        super();
        this.localCtx = new PubSub({
          tool_one: new ToolDescriptor({ execute: () => '1' }),
          tool_two: new ToolDescriptor({ execute: () => '2' }),
          tool_three: new ToolDescriptor({ execute: () => '3' }),
        });
        this.isConnected = true;
      }
      async componentDescription() {
        callCount++;
        await Promise.resolve();
        return 'Shared context.';
      }
    }

    let component = new MultiToolComponent();
    syncWebMCPTools(component);
    assert.equal(callCount, 1);

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(callCount, 1);
    assert.equal(registered.has('tool_one_in_multi-tool-desc'), true);
    assert.equal(registered.has('tool_two_in_multi-tool-desc'), true);
    assert.equal(registered.has('tool_three_in_multi-tool-desc'), true);
  });

  it('when() receives the owner as first argument', () => {
    let receivedArg;
    let ctxName = `when-arg-${Date.now()}`;
    let ctx = PubSub.registerCtx({
      gated: new ToolDescriptor({
        when(owner) {
          receivedArg = owner;
          return true;
        },
        execute: () => 'ok',
      }),
    }, ctxName);
    assert.equal(receivedArg, ctx);
    PubSub.deleteCtx(ctxName);
  });

  it('does not register tools when element disconnects before async componentDescription resolves', async () => {
    class LateDisconnectComponent extends HTMLElement {
      static is = 'late-disconnect';
      constructor() {
        super();
        this.localCtx = new PubSub({
          ghost_tool: new ToolDescriptor({ execute: () => 'ghost' }),
        });
        this.isConnected = true;
      }
      async componentDescription() {
        await Promise.resolve();
        return 'Will be disconnected.';
      }
    }

    let component = new LateDisconnectComponent();
    syncWebMCPTools(component);
    component.isConnected = false;

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(registered.has('ghost_tool_in_late-disconnect'), false);
  });

  it('diagnostics.apiAvailable reflects modelContext presence', () => {
    assert.equal(webMCPRegistry.store.diagnostics.read('apiAvailable'), true);
  });
});
