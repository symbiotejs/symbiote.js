import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

let { document, HTMLElement } = parseHTML('<!doctype html><html><body></body></html>');
globalThis.HTMLElement = HTMLElement;
Object.defineProperty(globalThis, 'document', { configurable: true, value: document });

let registered = new Map();
document.modelContext = {
  registerTool(tool, { signal }) {
    registered.set(tool.name, tool);
    signal.addEventListener('abort', () => registered.delete(tool.name));
  },
};

const { PubSub } = await import('../../core/PubSub.js');
const { DICT } = await import('../../core/dictionary.js');
const { WEBMCP_DICT: MCP } = await import('../../core/webmcp-dictionary.js');
const { ToolDescriptor, getActiveWebMCPTools, executeWebMCPTool, syncWebMCPTools, unregisterWebMCPTools } = await import('../../core/webmcp.js');

let owners = [];
function ownerWith(markup, state, bindings) {
  let owner = document.createElement('auto-owner');
  owner.innerHTML = markup;
  owner.$ = state;
  owner.localCtx = new PubSub(state);
  owner.mcpToolMode = true;
  owner[MCP.EVENTS_KEY] = bindings.map(([selector, prop, key]) => ({ el: owner.querySelector(selector), prop, key }));
  document.body.append(owner);
  owners.push(owner);
  syncWebMCPTools(owner);
  return owner;
}

afterEach(() => {
  for (let owner of owners) {
    unregisterWebMCPTools(owner);
    owner.remove();
  }
  owners = [];
});

describe('automatic WebMCP operations', () => {
  it('filters incidental events even when they have explicit tool attributes', () => {
    let calls = [];
    let owner = ownerWith('<button id="activate">Open</button><button id="incidental" toolname="ignore_me" tooldescription="Ignore this event"></button>', {
      activate: () => calls.push('click'),
      incidental: () => calls.push('mouseup'),
    }, [['#incidental', 'onmouseup', 'incidental'], ['#activate', 'onclick', 'activate']]);
    assert.deepEqual(getActiveWebMCPTools().map((tool) => tool.name), ['activate_in_auto-owner']);
    executeWebMCPTool('activate_in_auto-owner');
    assert.deepEqual(calls, ['click']);
    assert.equal(owner.$.incidental(), 2);
  });

  it('uses authored metadata and keeps direct and native descriptions identical', () => {
    let target;
    let owner = ownerWith('<button id="details-toggle" toolname="toggle_details" tooldescription="  Expand\n or collapse the details.  "><b>Details</b></button>', {
      toggle(event) { target = event.target; },
    }, [['button', 'onclick', 'toggle']]);
    let [tool] = getActiveWebMCPTools();
    assert.equal(tool.name, 'toggle_details');
    assert.equal(tool.description, 'Expand or collapse the details.\nEvent: click. Control: <button> "Details". ID: details-toggle. Component: <auto-owner>.');
    assert.equal(registered.get(tool.name).description, tool.description);
    executeWebMCPTool(tool.name);
    assert.equal(target, owner.querySelector('button'));
  });

  it('falls back through referenced labels, aria-label, button text, title, name, and authored handler', () => {
    let generated = () => {};
    generated[DICT.GENERATED_HANDLER_KEY] = true;
    for (let [markup, expected] of [
      ['<span id="label">  Open\n details </span><button aria-labelledby="label" aria-label="Wrong">Wrong</button>', 'Open details'],
      ['<button aria-labelledby="missing" aria-label="Open details">Wrong</button>', 'Open details'],
      ['<button tooldescription="  ">Open details</button>', 'Open details'],
      ['<input title="Open details">', 'Open details'],
      ['<button toolname="open_details"></button>', 'open_details'],
    ]) {
      let selector = markup.includes('<button') ? 'button' : 'input';
      let owner = ownerWith(markup, { generated }, [[selector, 'onclick', 'generated']]);
      let tool = getActiveWebMCPTools().find((tool) => tool.ownerId === owner[MCP.OWNER_ID_KEY]);
      assert.ok(tool.description.includes(expected));
      assert.equal(tool.description.includes(' ID:'), false);
    }
    let owner = ownerWith('<button></button>', { authoredAction() {} }, [['button', 'onclick', 'authoredAction']]);
    let tool = getActiveWebMCPTools().find((tool) => tool.ownerId === owner[MCP.OWNER_ID_KEY]);
    assert.match(tool.description, /Activate control: authoredAction/);
  });

  it('skips unlabeled generated handlers and bounds fallback label length', () => {
    let generated = () => {};
    generated[DICT.GENERATED_HANDLER_KEY] = true;
    let owner = ownerWith(`<button id="opaque"></button><button id="long">${'x'.repeat(1000)}</button>`, { generated }, [['#opaque', 'onclick', 'generated']]);
    assert.equal(getActiveWebMCPTools().length, 0);
    owner[MCP.EVENTS_KEY].push({ prop: 'onclick', key: 'generated', el: owner.querySelector('#long') });
    syncWebMCPTools(owner);
    let [tool] = getActiveWebMCPTools();
    assert.match(tool.description, /x{199}…/);
    assert.ok(tool.description.length < 600);
  });

  it('selects metadata and invocation target together and ignores incidental bindings in a shared handler group', () => {
    let target;
    let owner = ownerWith('<button id="incidental" tooldescription="Incidental"></button><button id="plain">Plain</button><button id="chosen" tooldescription="Chosen action"></button>', {
      shared(event) { target = event.target; },
    }, [['#incidental', 'onmouseup', 'shared'], ['#plain', 'onclick', 'shared'], ['#chosen', 'onclick', 'shared']]);
    let [tool] = getActiveWebMCPTools();
    assert.equal(getActiveWebMCPTools().length, 1);
    assert.match(tool.description, /^Chosen action/);
    assert.match(tool.description, /ID: chosen/);
    executeWebMCPTool(tool.name);
    assert.equal(target, owner.querySelector('#chosen'));
  });

  it('refreshes names, metadata, IDs, and selection on resync and resolves collisions', () => {
    let owner = ownerWith('<button id="original" toolname="named_action" tooldescription="Original action">Open</button>', { action() {} }, [['button', 'onclick', 'action']]);
    let other = ownerWith('<button toolname="named_action">Other</button>', { action() {} }, [['button', 'onclick', 'action']]);
    assert.deepEqual(getActiveWebMCPTools().map((tool) => tool.name).sort(), ['named_action', 'named_action-2']);
    let button = owner.querySelector('button');
    button.setAttribute('toolname', 'renamed_action');
    button.setAttribute('tooldescription', 'New action');
    button.removeAttribute('id');
    syncWebMCPTools(owner);
    let tool = getActiveWebMCPTools().find((tool) => tool.ownerId === owner[MCP.OWNER_ID_KEY]);
    assert.equal(tool.name, 'renamed_action');
    assert.match(tool.description, /^New action/);
    assert.equal(tool.description.includes(' ID:'), false);
    assert.equal(executeWebMCPTool('named_action').isError, true);
    syncWebMCPTools(other);
    assert.equal(getActiveWebMCPTools().find((tool) => tool.ownerId === other[MCP.OWNER_ID_KEY]).name, 'named_action-2');
    button.remove();
    syncWebMCPTools(owner);
    assert.equal(executeWebMCPTool('renamed_action').isError, true);
  });

  it('keeps explicit descriptors independent of automatic event filtering and HTML overrides', () => {
    let operation = new ToolDescriptor({ name: 'authored_operation', description: 'Authored description.', execute: () => 'authored' });
    ownerWith('<button toolname="ignored_name" tooldescription="Ignored description"></button>', { operation }, [['button', 'onmouseup', 'operation']]);
    let [tool] = getActiveWebMCPTools();
    assert.equal(tool.name, 'authored_operation');
    assert.equal(tool.description, 'Authored description.');
    assert.equal(executeWebMCPTool(tool.name), 'authored');
  });
});
