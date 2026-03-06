# SSR and Your Server Setup

Practical recipes for serving Symbiote.js SSR with Node.js — static build or streaming, with Express, Fastify, or plain `http`.

> [!NOTE]
> These examples assume you've already read the [SSR basics](./ssr.md). Make sure `linkedom` is installed.

## Project structure

A typical isomorphic setup:

```
project/
├── app/              # shared state and config
├── components/       # Symbiote components (isoMode = true)
├── dist/             # build output and static assets
├── node/
│   ├── server.js     # dev server
│   ├── ssr.js        # static SSR build script
│   ├── imports.js    # server-side component imports
│   └── main-tpl.html # HTML shell template
└── package.json
```

**`node/imports.js`** — import all isomorphic modules for server rendering:
```js
import '../app/app.js';
import '../components/app-shell/app-shell.js';
import '../components/nav-menu/nav-menu.js';
// ... other isomorphic components
```

**`node/main-tpl.html`** — HTML shell with a content placeholder:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <script type="importmap">
    {
      "imports": {
        "@symbiotejs/symbiote": "https://cdn.jsdelivr.net/npm/@symbiotejs/symbiote@latest/core/full.js/+esm"
      }
    }
  </script>
  <script type="module" src="./browser-imports.js"></script>
  <link rel="stylesheet" href="./globals.css">
</head>
<body>{{CONTENT}}</body>
</html>
```

---

## Static SSR build

Generate a static HTML file at build time. This is ideal for static hosting:

```js
// node/ssr.js
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';
import fs from 'fs';

await SSR.init();
await import('./imports.js');

let html = await SSR.processHtml('<app-shell></app-shell>', {
  nonce: Date.now().toString(36),
});
SSR.destroy();

const template = fs.readFileSync('./node/main-tpl.html', 'utf-8');
html = template.replace('{{CONTENT}}', html);
fs.writeFileSync('./dist/index.html', html);
```

```json
// package.json
{
  "scripts": {
    "ssr": "node ./node/ssr.js"
  }
}
```

---

## Dev server with streaming SSR

A development server that serves SSR-streamed HTML on the root route and static assets from the project:

```js
// node/server.js
import http from 'http';
import fs from 'fs';
import path from 'path';
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';

const PORT = 3000;
const DIST_DIR = path.resolve('./dist');
const ROOT_DIR = path.resolve('.');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// Init SSR once at startup:
await SSR.init();
await import('./imports.js');

const tpl = fs.readFileSync('./node/main-tpl.html', 'utf-8');
const [head, tail] = tpl.split('{{CONTENT}}');

function serveFile(filePath, res) {
  try {
    let stat = fs.statSync(filePath);
    if (stat.isFile()) {
      let ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
      return true;
    }
  } catch {}
  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== '/') {
    // Try dist/ first, then project root (for ESM modules):
    if (serveFile(path.join(DIST_DIR, url.pathname), res)) return;
    if (serveFile(path.join(ROOT_DIR, url.pathname), res)) return;
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // SSR streaming for root:
  let nonce = Date.now().toString(36);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.write(head);
  for await (let chunk of SSR.renderToStream('app-shell', {}, { nonce })) {
    res.write(chunk);
  }
  res.end(tail);
});

server.listen(PORT, () => console.log(`\nSSR server: http://localhost:${PORT}\n`));
```

```json
// package.json
{
  "scripts": {
    "dev": "node ./node/server.js"
  }
}
```

---

## Express

### Streaming SSR

```js
import express from 'express';
import fs from 'fs';
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';

await SSR.init();
await import('./node/imports.js');

const tpl = fs.readFileSync('./node/main-tpl.html', 'utf-8');
const [head, tail] = tpl.split('{{CONTENT}}');

const app = express();
app.use(express.static('./dist', { index: false }));

app.get('/', async (req, res) => {
  let nonce = Date.now().toString(36);
  res.type('html');
  res.write(head);
  for await (let chunk of SSR.renderToStream('app-shell', {}, { nonce })) {
    res.write(chunk);
  }
  res.end(tail);
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

### String SSR

```js
app.get('/', async (req, res) => {
  let nonce = Date.now().toString(36);
  let content = SSR.renderToString('app-shell', {}, { nonce });
  res.type('html').send(tpl.replace('{{CONTENT}}', content));
});
```

---

## Fastify

### Streaming SSR

```js
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fs from 'fs';
import path from 'path';
import { SSR } from '@symbiotejs/symbiote/node/SSR.js';

await SSR.init();
await import('./node/imports.js');

const tpl = fs.readFileSync('./node/main-tpl.html', 'utf-8');
const [head, tail] = tpl.split('{{CONTENT}}');

const app = Fastify();

app.register(fastifyStatic, {
  root: path.resolve('./dist'),
  prefix: '/',
  wildcard: false,
});

app.get('/', async (req, reply) => {
  let nonce = Date.now().toString(36);
  reply.type('text/html');
  reply.raw.write(head);
  for await (let chunk of SSR.renderToStream('app-shell', {}, { nonce })) {
    reply.raw.write(chunk);
  }
  reply.raw.end(tail);
});

app.listen({ port: 3000 }, () => console.log('http://localhost:3000'));
```

### String SSR

```js
app.get('/', async (req, reply) => {
  let nonce = Date.now().toString(36);
  let content = SSR.renderToString('app-shell', {}, { nonce });
  reply.type('text/html').send(tpl.replace('{{CONTENT}}', content));
});
```

---

## Key points

- **Init once** — call `SSR.init()` and import components at server startup, not per-request
- **`SSR.destroy()` is for build scripts only** — don't call it in a running server
- **Streaming** (`renderToStream`) gives faster TTFB on large pages
- **String** (`renderToString`) is simpler and works well for small pages or build steps
- **CSP nonce** — pass `{ nonce }` to add `nonce` attributes to SSR-generated `<style>` tags

> [!IMPORTANT]
> SSR rendering is synchronous. Async subscription callbacks won't affect SSR output. Initialize any state that must appear in SSR via class properties or `init$`. See [SSR → Context detection](./ssr.md#ssr-context-detection).
