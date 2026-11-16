import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

let server;
let baseURL;
let browser;

function serve() {
  return new Promise((resolveServer) => {
    server = createServer((req, res) => {
      let url = new URL(req.url || '/', 'http://localhost');
      let pathname = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, '');
      let filePath = join(root, pathname);
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      try {
        if (statSync(filePath).isDirectory()) {
          filePath = join(filePath, 'index.html');
        }
        res.writeHead(200, {
          'Content-Type': mime[extname(filePath)] || 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        createReadStream(filePath).pipe(res);
      } catch (e) {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      let address = server.address();
      baseURL = `http://127.0.0.1:${address.port}`;
      resolveServer();
    });
  });
}

async function openFixture() {
  let page = await browser.newPage();
  await page.goto(`${baseURL}/test/browser/fixtures/webmcp.html`);
  await page.waitForFunction(() => window.__WEBMCP_FIXTURE_READY === true);
  assert.ok(page.webmcp, 'Puppeteer page.webmcp is unavailable; Chrome WebMCP flags/browser support are required.');
  await waitForTool(page, 'incrementCount_in_webmcp-counter');
  return page;
}

async function toolNames(page) {
  return (await page.webmcp.tools()).map((tool) => tool.name).sort();
}

async function getTool(page, name) {
  return (await page.webmcp.tools()).find((tool) => tool.name === name);
}

async function waitForTool(page, name) {
  let deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if ((await toolNames(page)).includes(name)) {
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  assert.fail(`Timed out waiting for WebMCP tool: ${name}`);
}

async function waitForNoTool(page, name) {
  let deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (!(await toolNames(page)).includes(name)) {
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  assert.fail(`Timed out waiting for WebMCP tool removal: ${name}`);
}

async function executeTool(page, name, input = {}) {
  let tool = await getTool(page, name);
  assert.ok(tool, `Tool not found: ${name}`);
  return await tool.execute(input);
}

function outputOf(result) {
  return result?.status === 'Completed' ? result.output : result;
}

describe('native WebMCP integration', () => {
  before(async () => {
    await serve();
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--enable-features=WebMCP',
      ],
    });
  });

  after(async () => {
    await browser?.close();
    await new Promise((resolveClose) => server?.close(resolveClose));
  });

  it('registers and invokes HTML-app actions through the script attribute opt-in', async (t) => {
    let page = await browser.newPage();
    t.after(() => page.close());
    await page.goto(`${baseURL}/test/browser/fixtures/html-app-webmcp.html`);
    await page.waitForFunction(async () => {
      let {
        getActiveWebMCPTools,
      } = await import('/core/webmcp.js');
      return getActiveWebMCPTools().some((tool) => tool.ownerName === 'sym-context' && tool.nativeActive);
    });
    let name = await page.evaluate(async () => {
      let {
        getActiveWebMCPTools,
      } = await import('/core/webmcp.js');
      let {
        WEBMCP_DICT: MCP,
      } = await import('/core/webmcp-dictionary.js');
      let owner = document.querySelector('sym-context[ctx="HTML_ACTIONS"]');
      let tool = getActiveWebMCPTools().find((item) => item.ownerId === owner[MCP.OWNER_ID_KEY]
        && item.key.startsWith('auto:'));
      return tool?.name;
    });
    assert.ok(name);
    await waitForTool(page, name);
    await executeTool(page, name);
    assert.equal(await page.$eval('sym-context[ctx="HTML_ACTIONS"]', (owner) => owner.$.flag), true);
    await page.$eval('sym-context[ctx="HTML_ACTIONS"]', (owner) => owner.remove());
    await waitForNoTool(page, name);
  });

  it('exposes insertion schemas and publishes inserted values through native tools', async (t) => {
    let page = await browser.newPage();
    t.after(() => page.close());
    await page.goto(`${baseURL}/test/browser/fixtures/html-app-webmcp.html`);
    await waitForTool(page, 'insert_title');
    let direct = await page.evaluate(async () => (await import('/core/webmcp.js')).getActiveWebMCPTools().find((tool) => tool.name === 'insert_title'));
    let native = await getTool(page, 'insert_title');
    assert.equal(native.description, direct.description);
    assert.deepEqual(native.inputSchema, direct.inputSchema);
    assert.match(native.description, /ID: input-title/);
    await executeTool(page, 'insert_title', { value: 'Native insertion' });
    await executeTool(page, 'set_checked', { checked: true });
    await executeTool(page, 'set_choices', { value: ['beta'] });
    let state = await page.$eval('sym-context', (owner) => ({ title: owner.$.title, checked: owner.$.checked, choices: owner.$.choices }));
    assert.deepEqual(state, { title: 'Native insertion', checked: true, choices: ['beta'] });
  });

  for (let mode of ['declarative', 'imperative', 'absent']) {
    it(`avoids duplicate native form submissions with ${mode} support`, async (t) => {
      let targetBrowser = mode === 'declarative' ? browser : await puppeteer.launch({
        headless: true,
        args: mode === 'imperative' ? ['--enable-features=WebMCP', '--disable-features=DeclarativeWebMCP'] : [],
      });
      let page = await targetBrowser.newPage();
      t.after(async () => {
        await page.close();
        if (targetBrowser !== browser) await targetBrowser.close();
      });
      await page.goto(`${baseURL}/test/browser/fixtures/webmcp-forms.html`);
      await page.waitForFunction(() => window.__WEBMCP_FORMS_READY);
      let discovery = await page.evaluate(async () => ({
        imperative: !!document.modelContext?.registerTool,
        declarative: 'agentInvoked' in SubmitEvent.prototype && typeof SubmitEvent.prototype.respondWith === 'function',
        tools: (await import('/core/webmcp.js')).getActiveWebMCPTools(),
      }));
      assert.equal(discovery.imperative, mode !== 'absent');
      assert.equal(discovery.declarative, mode === 'declarative');
      assert.ok(discovery.tools.some((tool) => tool.name === 'independent_action'));
      assert.ok(discovery.tools.some((tool) => tool.key === 'auto:submitPlain'));
      assert.equal(discovery.tools.some((tool) => tool.key.includes('submitReview')), false);
      if (mode === 'declarative') {
        assert.equal(discovery.tools.some((tool) => tool.key === 'auto:submitForm'), false);
        await waitForTool(page, 'native_submit');
        assert.equal((await toolNames(page)).filter((name) => name === 'native_submit').length, 1);
        await executeTool(page, 'native_submit', { query: 'Browser form input' });
        assert.equal(await page.$eval('#native-form input', (el) => el.value), 'Browser form input');
      } else {
        let submissions = discovery.tools.filter((tool) => tool.key === 'auto:submitForm');
        assert.equal(submissions.length, 1);
        assert.equal(submissions[0].name, 'native_submit');
        assert.equal(submissions[0].nativeActive, mode === 'imperative');
        let result = await page.evaluate(async () => (await import('/core/webmcp.js')).executeWebMCPTool('native_submit'));
        assert.equal(!!result.isError, false);
      }
      assert.equal(await page.$eval('webmcp-form-controls', (owner) => owner.$.submissions), 1);
      let independent = await page.evaluate(async () => (await import('/core/webmcp.js')).executeWebMCPTool('independent_action'));
      assert.equal(!!independent.isError, false);
      assert.equal(await page.$eval('webmcp-form-controls', (owner) => owner.$.independent), 1);
      await page.click('#review-form button');
      assert.equal(await page.$eval('webmcp-form-controls', (owner) => owner.$.reviews), 1);
    });
  }

  for (let nativeAvailable of [true, false]) {
    it(`invokes public tools with native WebMCP ${nativeAvailable ? 'enabled' : 'unavailable'}`, async (t) => {
      let page = await browser.newPage();
      t.after(() => page.close());
      if (!nativeAvailable) {
        await page.evaluateOnNewDocument(() => {
          for (let target of [document, navigator]) {
            Object.defineProperty(target, 'modelContext', { configurable: true, value: undefined });
          }
        });
      }
      await page.goto(`${baseURL}/test/browser/fixtures/webmcp.html`);
      await page.waitForFunction(async () => {
        let { getActiveWebMCPTools } = await import('/core/webmcp.js');
        return getActiveWebMCPTools().some((tool) => tool.name === 'async_tool_in_webmcp-descriptor');
      });
      let result = await page.evaluate(async () => {
        let { getActiveWebMCPTools, executeWebMCPTool } = await import('/core/webmcp.js');
        let tools = getActiveWebMCPTools();
        return {
          nativeActive: tools.find((tool) => tool.name === 'incrementCount_in_webmcp-counter').nativeActive,
          increment: await executeWebMCPTool('incrementCount_in_webmcp-counter'),
          asyncResult: await executeWebMCPTool('async_tool_in_webmcp-descriptor', { amount: 4 }),
          named: await executeWebMCPTool('named_descriptor', { value: 'direct' }),
          shared: await executeWebMCPTool('sharedDescriptor', { value: 'direct' }),
          hidden: await executeWebMCPTool('run_tool_in_webmcp-descriptor'),
          selected: await executeWebMCPTool('selectItem_in_list-item-obj_alpha'),
          removed: await executeWebMCPTool('onListItemRemove_in_webmcp-counter_list-item-obj_alpha'),
          staleItem: await executeWebMCPTool('selectItem_in_list-item-obj_alpha'),
        };
      });
      assert.equal(result.nativeActive, nativeAvailable);
      assert.match(JSON.stringify(result.increment), /Response status - ok/);
      assert.deepEqual(result.asyncResult, { runs: 4 });
      assert.equal(result.named, 'named:direct');
      assert.equal(result.shared, 'shared:direct');
      assert.equal(result.hidden.isError, true);
      assert.match(JSON.stringify(result.selected), /Alpha/);
      assert.match(JSON.stringify(result.removed), /Response status - ok/);
      assert.equal(result.staleItem.isError, true);
      assert.equal(await page.$eval('webmcp-counter h2', (el) => el.textContent), '1');
      await page.evaluate(async () => {
        let { executeWebMCPTool } = await import('/core/webmcp.js');
        await executeWebMCPTool('delete_in_webmcp-counter');
      });
      await page.waitForFunction(async () => {
        let { getActiveWebMCPTools } = await import('/core/webmcp.js');
        return !getActiveWebMCPTools().some((tool) => tool.name === 'incrementCount_in_webmcp-counter');
      });
    });
  }

  it('registers meaningful component, context, and item tools without overview tools', async () => {
    let page = await openFixture();
    await waitForTool(page, 'selectItem_in_list-item-obj_alpha');
    await waitForTool(page, 'selectItem_in_list-item-obj_beta');
    await waitForTool(page, 'onListItemRemove_in_webmcp-counter_list-item-obj_alpha');
    await waitForTool(page, 'localProp_in_webmcp-binding-child');
    await waitForTool(page, 'named_descriptor');
    await waitForTool(page, 'sharedDescriptor');
    let names = await toolNames(page);

    assert.ok(names.includes('incrementCount_in_webmcp-counter'));
    assert.ok(names.includes('delete_in_webmcp-counter'));
    assert.ok(names.includes('selectItem_in_list-item-obj_alpha'));
    assert.ok(names.includes('selectItem_in_list-item-obj_beta'));
    assert.ok(names.includes('onListItemRemove_in_webmcp-counter_list-item-obj_alpha'));
    assert.ok(names.includes('localProp_in_webmcp-binding-child'));
    assert.ok(names.includes('named_descriptor'));
    assert.ok(names.includes('sharedDescriptor'));
    assert.equal(names.some((name) => name.startsWith('get-tools-for-')), false);
    assert.equal(names.some((name) => name.includes('^onListItem')), false);
    assert.equal(names.some((name) => name.includes('NAMED_CTX/namedProp')), false);
    assert.equal(names.some((name) => name.includes('*sharedProp')), false);

    await waitForTool(page, 'async_tool_in_webmcp-descriptor');
    let asyncTool = await getTool(page, 'async_tool_in_webmcp-descriptor');
    assert.ok(asyncTool);
    assert.match(asyncTool.description, /Component context:\nDescriptor component can run: false\./);

    await page.close();
  });

  it('executes popup-bound list item tools on the ancestor component', async () => {
    let page = await openFixture();
    let toolName = 'onListItemRemove_in_webmcp-counter_list-item-obj_alpha';
    await waitForTool(page, toolName);

    let removeResult = outputOf(await executeTool(page, toolName));
    assert.match(JSON.stringify(removeResult), /Response status - ok/);
    await waitForNoTool(page, 'selectItem_in_list-item-obj_alpha');
    await waitForNoTool(page, toolName);
    assert.equal(await page.$eval('webmcp-counter', (el) => el.textContent.includes('Alpha')), false);

    await page.close();
  });

  it('executes regular, async, and error tools through native WebMCP', async () => {
    let page = await openFixture();

    let incrementResult = outputOf(await executeTool(page, 'incrementCount_in_webmcp-counter'));
    assert.match(JSON.stringify(incrementResult), /Response status - ok/);
    assert.equal(await page.$eval('webmcp-counter h2', (el) => el.textContent), '1');

    let asyncResult = outputOf(await executeTool(page, 'async_tool_in_webmcp-descriptor', { amount: 2 }));
    assert.deepEqual(asyncResult, { runs: 2 });
    assert.equal(await page.$eval('webmcp-descriptor h2', (el) => el.textContent), '2');

    let errorResult = outputOf(await executeTool(page, 'error_tool_in_webmcp-descriptor'));
    assert.match(JSON.stringify(errorResult), /fixture error/);

    await page.close();
  });

  it('gates descriptor tools with deps and when()', async () => {
    let page = await openFixture();

    assert.equal((await toolNames(page)).includes('run_tool_in_webmcp-descriptor'), false);
    await page.click('webmcp-descriptor input');
    await waitForTool(page, 'run_tool_in_webmcp-descriptor');

    let runResult = outputOf(await executeTool(page, 'run_tool_in_webmcp-descriptor', { amount: 3 }));
    assert.equal(runResult, 3);
    assert.equal(await page.$eval('webmcp-descriptor h2', (el) => el.textContent), '3');

    await page.click('webmcp-descriptor input');
    await waitForNoTool(page, 'run_tool_in_webmcp-descriptor');
    await page.click('webmcp-descriptor input');
    await waitForTool(page, 'run_tool_in_webmcp-descriptor');

    await page.close();
  });

  it('unregisters component tools after component removal', async () => {
    let page = await openFixture();

    await executeTool(page, 'delete_in_webmcp-counter');
    await waitForNoTool(page, 'incrementCount_in_webmcp-counter');
    await waitForNoTool(page, 'delete_in_webmcp-counter');
    await waitForNoTool(page, 'selectItem_in_list-item-obj_alpha');
    await waitForNoTool(page, 'onListItemRemove_in_webmcp-counter_list-item-obj_alpha');

    await page.close();
  });

  it('executes named and shared context descriptor tools with input', async () => {
    let page = await openFixture();
    await waitForTool(page, 'named_descriptor');
    await waitForTool(page, 'sharedDescriptor');

    let namedResult = outputOf(await executeTool(page, 'named_descriptor', { value: 'hello' }));
    assert.equal(namedResult, 'named:hello');

    let namedDefault = outputOf(await executeTool(page, 'named_descriptor'));
    assert.equal(namedDefault, 'named:named');

    let sharedResult = outputOf(await executeTool(page, 'sharedDescriptor', { value: 'world' }));
    assert.equal(sharedResult, 'shared:world');

    let sharedDefault = outputOf(await executeTool(page, 'sharedDescriptor'));
    assert.equal(sharedDefault, 'shared:shared');

    await page.close();
  });
});
