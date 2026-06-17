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
      args: ['--enable-features=WebMCPTesting,DevToolsWebMCPSupport'],
    });
  });

  after(async () => {
    await browser?.close();
    await new Promise((resolveClose) => server?.close(resolveClose));
  });

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
