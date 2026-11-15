import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { fetchSource, parseResponseJSON, sourceURL } from '../../html-app/fetch-source.js';
import { parseAction } from '../../html-app/action-data.js';
import PubSub from '../../core/PubSub.js';

test('request actions address providers and source URLs stay within HTTP(S)', () => {
  assert.equal(parseAction('[load]APP').operation, 'load');
  assert.equal(parseAction('[sync]APP').operation, 'sync');
  for (let action of [
    '[sync]APP/tasks',
    '[load]^APP',
    '[sync-200]APP',
    '[load]',
  ]) {
    assert.throws(() => parseAction(action), TypeError);
  }
  assert.equal(sourceURL('./data.json#fragment', 'https://example.test/app/'), 'https://example.test/app/data.json');
  for (let value of [
    '',
    'file:///tmp/data.json',
    'data:application/json,{}',
    'javascript:alert(1)',
    'https://name:secret@example.test/',
  ]) {
    assert.throws(() => sourceURL(value, 'https://example.test/'));
  }
});

test('bounded fetch handles real HTTP, request bodies, streaming limits and cancellation', async () => {
  let writes = [];
  let server = createServer(async (request, response) => {
    let path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/slow') {
      return;
    }
    if (path === '/fail') {
      response.writeHead(503).end('Unavailable');
      return;
    }
    if (path === '/large') {
      response.writeHead(200, {
        'Content-Type': 'application/json',
      });
      response.write('{"text":"');
      response.end('x'.repeat(200) + '"}');
      return;
    }
    if (request.method !== 'GET') {
      let chunks = [];
      for await (let chunk of request) {
        chunks.push(chunk);
      }
      writes.push({
        method: request.method,
        contentType: request.headers['content-type'],
        body: JSON.parse(Buffer.concat(chunks).toString()),
      });
      response.writeHead(204).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
    }).end('{"label":"Loaded"}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  let base = 'http://127.0.0.1:' + server.address().port;
  let options = {
    signal: new AbortController().signal,
    timeout: 1000,
    maxBytes: 1024,
  };
  try {
    assert.deepEqual(parseResponseJSON(await fetchSource(base, options)), {
      label: 'Loaded',
    });
    let saved = await fetchSource(base, {
      ...options,
      method: 'PATCH',
      body: '{"name":"Snapshot"}',
    });
    assert.equal(saved.status, 204);
    assert.deepEqual(writes, [
      {
        method: 'PATCH',
        contentType: 'application/json',
        body: {
          name: 'Snapshot',
        },
      },
    ]);
    await assert.rejects(fetchSource(base + '/fail', options), {
      code: 'HTTP_ERROR',
      status: 503,
    });
    await assert.rejects(fetchSource(base + '/large', {
      ...options,
      maxBytes: 30,
    }), {
      code: 'TOO_LARGE',
    });
    await assert.rejects(fetchSource(base, {
      ...options,
      method: 'PUT',
      body: 'x'.repeat(2000),
    }), {
      code: 'TOO_LARGE',
    });
    await assert.rejects(fetchSource(base + '/slow', {
      ...options,
      timeout: 20,
    }), {
      code: 'TIMEOUT',
    });
    let controller = new AbortController();
    let pending = fetchSource(base + '/slow', {
      ...options,
      signal: controller.signal,
    });
    controller.abort();
    await assert.rejects(pending, {
      name: 'AbortError',
    });
  } finally {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
});

test('waiting PubSub subscriptions receive newly registered keys and remove idempotently', () => {
  let context = new PubSub({});
  let values = [];
  let subscription = context.sub('late', (value) => values.push(value), true, true);
  assert.deepEqual(values, []);
  assert.equal(context.has('late'), false);
  context.add('late', 'Ready');
  context.pub('late', 'Changed');
  assert.deepEqual(values, [
    'Ready',
    'Changed',
  ]);
  subscription.remove();
  subscription.remove();
  context.pub('late', 'Ignored');
  assert.equal(values.length, 2);
});

test('computed dependencies subscribe when an existing named context has no fields yet', () => {
  let name = 'late-' + crypto.randomUUID();
  let source = PubSub.registerCtx({}, name);
  let derived = new PubSub({
    '+label': {
      deps: [
        name + '/label',
      ],
      fn: () => source.has('label') ? source.read('label') : '',
    },
  });
  try {
    assert.equal(derived.read('+label'), '');
    source.add('label', 'Arrived');
    assert.equal(derived.read('+label'), 'Arrived');
  } finally {
    PubSub.deleteCtx(name);
  }
});

test('waiting computed subscriptions receive values instead of function definitions', () => {
  let context = new PubSub({});
  let values = [];
  let subscription = context.sub('+late', (value) => values.push(value), true, true);
  context.add('+late', () => 'Ready');
  assert.deepEqual(values, [
    'Ready',
  ]);
  subscription.remove();
});

test('deleting a computed field releases its existing and pending external dependencies', () => {
  let existingName = 'existing-' + crypto.randomUUID();
  let waitingName = 'waiting-' + crypto.randomUUID();
  let source = PubSub.registerCtx({
    value: 1,
  }, existingName);
  let derived = new PubSub({
    '+existing': {
      deps: [
        existingName + '/value',
      ],
      fn: () => source.read('value'),
    },
    '+waiting': {
      deps: [
        waitingName + '/value',
      ],
      fn: () => '',
    },
  });
  try {
    derived.read('+existing');
    derived.read('+waiting');
    derived.delete('+existing');
    derived.delete('+waiting');
    assert.equal(source.callbackMap.value, undefined);
    assert.equal(PubSub.pendingDeps.has(waitingName), false);
    assert.equal(Object.hasOwn(derived.__computedMap, '+waiting'), false);
  } finally {
    PubSub.deleteCtx(existingName);
  }
});

test('waiting-field support preserves initial notifications for proxy-backed contexts', () => {
  let schema = new Proxy({}, {
    get: (target, key) => key === 'constructor' ? undefined : target[key],
  });
  let context = new PubSub(schema);
  let values = [];
  let subscription = context.sub('missing', (value) => values.push(value));
  assert.deepEqual(values, [
    undefined,
  ]);
  subscription.remove();
});
