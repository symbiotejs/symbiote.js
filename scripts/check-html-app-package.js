import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import puppeteer from 'puppeteer';

let root = fileURLToPath(new URL('../', import.meta.url));
let temporary = await mkdtemp(join(tmpdir(), 'symbiote-package-'));
let run = promisify(execFile);
let browser;
let server;
try {
  let packed = await run('npm', [
    'pack', '--ignore-scripts', '--json', '--pack-destination', temporary, '--cache', join(temporary, 'cache'),
  ], {
    cwd: root,
  });
  let metadata = JSON.parse(packed.stdout);
  let pack = Array.isArray(metadata) ? metadata[0] : metadata.files ? metadata : Object.values(metadata)[0];
  let paths = new Set(pack.files.map((file) => file.path));
  for (let module of await readdir(join(root, 'html-app'), { recursive: true })) {
    module = module.split(sep).join('/');
    if (module.endsWith('.js')) {
      assert.ok(paths.has('html-app/' + module), 'Missing runtime module: ' + module);
      assert.ok(paths.has('types/html-app/' + module.replace(/\.js$/, '.d.ts')), 'Missing declaration: ' + module);
    }
  }
  let consumer = join(temporary, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), '{"private":true,"type":"module"}');
  await run('npm', [
    'install', '--offline', '--ignore-scripts', '--omit=optional', '--legacy-peer-deps',
    '--no-audit', '--no-fund', '--cache', join(temporary, 'cache'), join(temporary, pack.filename),
  ], {
    cwd: consumer,
  });
  let installed = join(consumer, 'node_modules/@symbiotejs/symbiote');
  let manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  for (let entry of ['./html-app', './html-app/webmcp']) {
    await readFile(resolve(installed, manifest.exports[entry].default));
    await readFile(resolve(installed, manifest.exports[entry].types));
  }
  let routes = JSON.parse(await readFile(join(installed, 'html-app/examples/assets/routes.json'), 'utf8'));
  for (let route of Object.values(routes.routes)) {
    await readFile(resolve(installed, 'html-app/examples', route.src));
  }
  await writeFile(join(consumer, 'smoke.ts'),
    "import { SymContext, SymCollection, SymRouter } from '@symbiotejs/symbiote/html-app';\n"
    + "import { SymContext as WebMCPContext, getActiveWebMCPTools, executeWebMCPTool } from '@symbiotejs/symbiote/html-app/webmcp';\n"
    + 'let context: SymContext = new SymContext();\n'
    + 'let collection: SymCollection = new SymCollection();\n'
    + 'let router: SymRouter = new SymRouter();\n'
    + 'let webmcpContext: WebMCPContext = new WebMCPContext();\n'
    + 'void [context, collection, router, webmcpContext, getActiveWebMCPTools(), executeWebMCPTool("smoke")];\n');
  await run(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--module', 'nodenext', '--target', 'es2022',
    '--lib', 'es2022,dom', 'smoke.ts',
  ], {
    cwd: consumer,
  });
  let mime = {
    '.js': 'text/javascript',
    '.html': 'text/html',
    '.json': 'application/json',
  };
  server = createServer(async (request, response) => {
    let pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/') {
      response.writeHead(200, {
        'Content-Type': 'text/html',
      }).end('<!doctype html><html><body></body></html>');
      return;
    }
    let path = resolve(installed, '.' + decodeURIComponent(pathname));
    if (!path.startsWith(installed + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      let content = await readFile(path);
      response.writeHead(200, {
        'Content-Type': mime[extname(path)] ?? 'text/plain',
      }).end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  let origin = 'http://127.0.0.1:' + server.address().port;
  browser = await puppeteer.launch();
  let page = await browser.newPage();
  let errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin);
  assert.equal(await page.evaluate(async () => {
    await import('/core/index.js');
    return !customElements.get('sym-context');
  }), true);
  await page.goto(origin + '/html-app/examples/todo-ref.html');
  await page.locator('form input').fill('Installed task');
  await page.locator('form button').click();
  await page.waitForFunction(() => document.querySelector('li input:not([type="checkbox"])')?.value === 'Installed task');
  await page.locator('li input[type="checkbox"]').click();
  assert.equal(await page.$eval('li input[type="checkbox"]', (input) => input.checked), true);
  await page.locator('li button').click();
  await page.waitForFunction(() => !document.querySelector('li'));
  await page.goto(origin);
  assert.deepEqual(await page.evaluate(async () => {
    let { BaseClass, Symbiote } = await import('/html-app/webmcp/index.js');
    let context = document.createElement('sym-context');
    context.innerHTML = '<script type="application/json">{"flag":false}</script>'
      + '<button toolname="package_toggle" bind="onclick: [toggle]flag">Toggle</button><output>{{flag}}</output>';
    document.body.append(context);
    return { foundation: BaseClass.mcpToolMode, global: Symbiote.mcpToolMode };
  }), { foundation: true, global: false });
  await page.waitForFunction(async () => (await import('/html-app/webmcp/index.js'))
    .getActiveWebMCPTools().some((tool) => tool.name === 'package_toggle'));
  assert.equal(await page.evaluate(async () => !!(await (await import('/html-app/webmcp/index.js'))
    .executeWebMCPTool('package_toggle')).isError), false);
  assert.equal(await page.$eval('output', (output) => output.textContent), 'true');
  assert.deepEqual(errors, []);
  console.log('HTML-app packed exports, declarations, example assets, installed Todo and WebMCP entry passed.');
} finally {
  await browser?.close();
  if (server) {
    await new Promise((done) => server.close(done));
  }
  await rm(temporary, {
    recursive: true,
    force: true,
  });
}
