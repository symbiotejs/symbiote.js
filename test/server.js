import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectionData } from '../html-app/collection-data.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};
let tasks = JSON.parse(await readFile(resolve(root, 'html-app/examples/assets/tasks.json'), 'utf8')).tasks;

const server = createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  // The full example uses a real HTTP round trip without a database dependency.
  if (pathname === '/api/tasks') {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
      }).end(JSON.stringify({
        tasks,
      }));
    } else if ([
      'PUT',
      'POST',
      'PATCH',
    ].includes(req.method)) {
      try {
        let chunks = [];
        let size = 0;
        for await (let chunk of req) {
          size += chunk.length;
          if (size > 1048576) {
            res.writeHead(413).end('Request too large');
            return;
          }
          chunks.push(chunk);
        }
        let data = JSON.parse(Buffer.concat(chunks).toString());
        if (Object.keys(data).length !== 1 || !Object.hasOwn(data, 'tasks')) {
          throw new TypeError('Expected a tasks document.');
        }
        tasks = collectionData(data.tasks);
        res.writeHead(204).end();
      } catch {
        res.writeHead(400).end('Invalid tasks document');
      }
    } else {
      res.writeHead(405, {
        Allow: 'GET, PUT, POST, PATCH',
      }).end();
    }
    return;
  }

  const filePath = resolve(root, `.${pathname}`);
  const relativePath = relative(root, filePath);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mime[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(0, '127.0.0.1', () => {
  console.log(`Symbiote test server ready at http://127.0.0.1:${server.address().port}`);
  console.log(`Basic Todo: http://127.0.0.1:${server.address().port}/html-app/examples/todo-ref.html`);
  console.log(`Full app: http://127.0.0.1:${server.address().port}/html-app/examples/full-app.html`);
});
