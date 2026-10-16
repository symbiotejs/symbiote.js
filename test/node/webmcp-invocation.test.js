import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PubSub } from '../../core/PubSub.js';
import { DICT } from '../../core/dictionary.js';
import { devState } from '../../core/warn.js';

globalThis.HTMLElement ||= class {};
devState.devMode = false;

for (let mode of ['absent', 'native', 'rejected']) {
  describe(`direct WebMCP invocation with ${mode} browser API`, () => {
    let api;
    let registered = new Map();

    before(async () => {
      let modelContext = mode === 'absent' ? undefined : {
        registerTool(tool, options) {
          if (mode === 'rejected') { throw new Error('Native registration rejected.'); }
          registered.set(tool.name, tool);
          options.signal.addEventListener('abort', () => registered.delete(tool.name));
        },
      };
      Object.defineProperty(globalThis, 'document', { configurable: true, value: { modelContext } });
      api = await import(`../../core/webmcp.js?invocation=${mode}`);
    });

    it('exposes the API and executes context descriptors with owner binding and metadata only', (t) => {
      let ctx = PubSub.registerCtx({
        count: 0,
        add: new api.ToolDescriptor({
          execute({ amount = 1 }, owner) {
            assert.equal(this, owner);
            owner.pub('count', owner.read('count') + amount);
            return { count: owner.read('count') };
          },
        }),
      }, 'direct-context');
      t.after(() => PubSub.deleteCtx('direct-context'));
      assert.equal(api.default.executeWebMCPTool, api.executeWebMCPTool);
      assert.deepEqual(api.executeWebMCPTool('add', { amount: 3 }), { count: 3 });
      let [entry] = api.getActiveWebMCPTools();
      assert.equal(entry.nativeActive, mode === 'native');
      assert.equal(entry.active, true);
      assert.equal('execute' in entry, false);
      assert.equal('controller' in entry, false);
      assert.deepEqual(JSON.parse(JSON.stringify(entry)), entry);
      if (mode === 'native') {
        assert.deepEqual(registered.get('add').execute(), { count: 4 });
      }
      PubSub.deleteCtx('direct-context');
      assert.equal(api.executeWebMCPTool('add').isError, true);
      assert.equal(ctx.read('count'), mode === 'native' ? 4 : 3);
    });

    it('preserves async results and normalizes synchronous and asynchronous errors', async (t) => {
      PubSub.registerCtx({
        async_result: new api.ToolDescriptor({ execute: async () => ({ value: 42 }) }),
        sync_error: new api.ToolDescriptor({ execute: () => { throw new Error('expected failure'); } }),
        async_error: new api.ToolDescriptor({ execute: async () => { throw new Error('expected failure'); } }),
      }, 'direct-errors');
      t.after(() => PubSub.deleteCtx('direct-errors'));
      assert.deepEqual(await api.executeWebMCPTool('async_result'), { value: 42 });
      let failure = api.executeWebMCPTool('sync_error');
      assert.equal(failure.isError, true);
      assert.match(failure.content[0].text, /expected failure/);
      assert.deepEqual(await api.executeWebMCPTool('async_error'), failure);
      if (mode === 'native') {
        assert.deepEqual(await registered.get('async_error').execute(), failure);
      }
      assert.match(api.executeWebMCPTool('missing').content[0].text, /"missing" is not available/);
    });

    it('rejects hidden tools immediately and follows visibility and replacement lifecycle', async (t) => {
      let ctx = PubSub.registerCtx({
        visible: true,
        gated: new api.ToolDescriptor({
          deps: ['visible'],
          when: (owner) => owner.read('visible'),
          execute: () => 'original',
        }),
      }, 'direct-visibility');
      t.after(() => PubSub.deleteCtx('direct-visibility'));
      let oldNative = registered.get('gated');
      assert.equal(api.executeWebMCPTool('gated'), 'original');
      ctx.pub('visible', false);
      assert.equal(api.executeWebMCPTool('gated').isError, true);
      await Promise.resolve();
      assert.equal(api.getActiveWebMCPTools().some((entry) => entry.name === 'gated'), false);
      ctx.pub('visible', true);
      await Promise.resolve();
      assert.equal(api.executeWebMCPTool('gated'), 'original');
      ctx.pub('gated', new api.ToolDescriptor({ execute: () => 'replacement' }));
      assert.equal(api.executeWebMCPTool('gated'), 'replacement');
      if (oldNative) { assert.equal(oldNative.execute().isError, true); }
      api.unregisterWebMCPTools(ctx);
      assert.equal(api.executeWebMCPTool('gated').isError, true);
    });

    it('preserves automatic event context and waits for async handlers', async (t) => {
      let owner = new HTMLElement();
      owner.localName = 'direct-component';
      owner.isConnected = true;
      owner.mcpToolMode = true;
      owner.localCtx = new PubSub({ count: 0 });
      let target = {};
      owner.$ = {
        async increment(event) {
          assert.equal(this, owner);
          assert.equal(event.target, target);
          assert.equal(event.currentTarget, target);
          assert.equal(event.type, 'webmcp');
          await Promise.resolve();
          owner.localCtx.pub('count', 1);
          return 'finished';
        },
      };
      owner[DICT.MCP_EVENTS_KEY] = [{ key: 'increment', el: target }];
      api.syncWebMCPTools(owner);
      t.after(() => api.unregisterWebMCPTools(owner));
      let name = 'increment_in_direct-component';
      let result = await api.executeWebMCPTool(name);
      assert.match(result.content[0].text, /ok: finished/);
      assert.match(result.content[0].text, /"count":1/);
      owner.$.increment = async () => { throw new Error('async handler failed'); };
      assert.match((await api.executeWebMCPTool(name)).content[0].text, /async handler failed/);
      owner.isConnected = false;
      assert.equal(api.executeWebMCPTool(name).isError, true);
      api.syncWebMCPTools(owner);
      assert.equal(api.getActiveWebMCPTools().length, 0);
    });

    it('releases an imperative registration removed while its description resolves', async () => {
      let resolveDescription;
      let owner = new HTMLElement();
      owner.localName = 'late-direct';
      owner.isConnected = true;
      owner.componentDescription = () => new Promise((resolve) => { resolveDescription = resolve; });
      let pending = api.registerWebMCPTool(owner, 'late', new api.ToolDescriptor({ execute: () => 'stale' }));
      api.unregisterWebMCPTools(owner);
      owner.isConnected = false;
      resolveDescription('Late description');
      let entry = await pending;
      assert.equal(entry.active, false);
      assert.equal(entry.controller?.signal.aborted ?? true, true);
      assert.equal(registered.has(entry.name), false);
      assert.equal(api.executeWebMCPTool(entry.name).isError, true);
      assert.equal(api.getActiveWebMCPTools().length, 0);
    });
  });
}
