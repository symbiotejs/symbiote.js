import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SSR } from '../../node/SSR.js';

await SSR.init();
let nativeFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async () => {
  calls++;
  throw new Error('SSR must not access the network.');
};
try {
  let { BaseClass } = await import('../../html-app/index.js');
  let { PubSub } = await import('../../core/PubSub.js');
  let markup = await readFile(new URL('../browser/fixtures/html-app-ssr.html', import.meta.url), 'utf8');
  let first;
  for (let index = 0; index < 2; index++) {
    let result = await SSR.processHtml(markup, {
      nonce: 'fixture-style',
    });
    assert.match(result, /<h1[^>]*>Server tasks<\/h1>/);
    assert.match(result, /value="First task"/);
    assert.match(result, /\[item-remove\]/);
    assert.match(result, /Import fallback/);
    assert.ok(!result.includes('__htmlAppAction'));
    assert.equal(BaseClass.mcpToolMode, false);
    first ??= result;
    let owners = [...document.querySelectorAll('*')].filter((element) => element instanceof BaseClass);
    document.body.replaceChildren();
    for (let owner of owners.reverse()) {
      owner.destroy();
    }
    assert.equal(PubSub.getCtx('APP', false), null);
  }
  assert.equal(calls, 0);
  process.stdout.write(first);
} finally {
  globalThis.fetch = nativeFetch;
  SSR.destroy();
}
