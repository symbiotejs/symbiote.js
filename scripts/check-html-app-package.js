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
  for (let module of await readdir(join(root, 'html-app'))) {
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
  await readFile(resolve(installed, manifest.exports['./html-app'].default));
  await readFile(resolve(installed, manifest.exports['./html-app'].types));
  let routes = JSON.parse(await readFile(join(installed, 'html-app/examples/assets/routes.json'), 'utf8'));
  for (let route of Object.values(routes.routes)) {
    await readFile(resolve(installed, 'html-app/examples', route.src));
  }
  await writeFile(join(consumer, 'smoke.ts'),
    "import { SymContext, SymCollection, SymRouter } from '@symbiotejs/symbiote/html-app';\n"
    + 'let context: SymContext = new SymContext();\n'
    + 'let collection: SymCollection = new SymCollection();\n'
    + 'let router: SymRouter = new SymRouter();\n'
    + 'void [context, collection, router];\n');
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
  assert.deepEqual(errors, []);
  console.log('HTML-app packed exports, declarations, example assets and installed Todo passed.');
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
