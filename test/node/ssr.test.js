import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

describe('SSR Engine', async () => {
  let ssr;

  before(async () => {
    ssr = await import('../../core/ssr.js');
    await ssr.initSSR();
  });

  after(() => {
    ssr.destroySSR();
  });

  it('should render a basic component to HTML', async () => {
    const { default: Symbiote, html } = await import('../../core/Symbiote.js');

    class SsrBasic extends Symbiote {
      init$ = {
        greeting: 'Hello SSR',
      };
    }
    SsrBasic.template = html`<span ${{textContent: 'greeting'}}></span>`;
    SsrBasic.reg('ssr-basic');

    let result = ssr.renderToString('ssr-basic');
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(!result.includes('[object Object]'), `Unexpected "[object Object]" in output: ${result}`);
    assert.ok(result.includes('Hello SSR'), `Expected "Hello SSR" in output: ${result}`);
    assert.ok(result.includes('<ssr-basic'), 'Should contain opening tag');
    assert.ok(result.includes('</ssr-basic>'), 'Should contain closing tag');
    assert.ok(result.includes('bind='), 'Should preserve bind attributes for hydration');
  });

  it('should render a shadow DOM component with DSD', async () => {
    const { default: Symbiote, html, css } = await import('../../core/Symbiote.js');

    class SsrShadow extends Symbiote {
      init$ = {
        title: 'Shadow Title',
      };
    }
    SsrShadow.template = html`<h1 ${{textContent: 'title'}}></h1>`;
    SsrShadow.shadowStyles = css`:host { display: block; color: red; }`;
    SsrShadow.reg('ssr-shadow');

    let result = ssr.renderToString('ssr-shadow');
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(!result.includes('[object Object]'), `Unexpected "[object Object]" in output: ${result}`);
    assert.ok(result.includes('<template shadowrootmode="open">'), 'Should contain DSD template');
    assert.ok(result.includes('<style>'), 'Should contain inlined styles');
    assert.ok(result.includes('display: block'), 'Should contain CSS text');
    assert.ok(result.includes('Shadow Title'), `Expected "Shadow Title" in output: ${result}`);
  });

  it('should set attributes from attrs argument', async () => {
    const { default: Symbiote } = await import('../../core/Symbiote.js');

    class SsrAttrs extends Symbiote {}
    SsrAttrs.template = '<div>content</div>';
    SsrAttrs.reg('ssr-attrs');

    let result = ssr.renderToString('ssr-attrs', { id: 'test', 'data-val': '42' });
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(!result.includes('[object Object]'), `Unexpected "[object Object]" in output: ${result}`);
    assert.ok(result.includes('id="test"'), 'Should have id attribute');
    assert.ok(result.includes('data-val="42"'), 'Should have data attribute');
  });
  it('should render itemize list', async () => {
    const { default: Symbiote, html } = await import('../../core/Symbiote.js');

    class SsrList extends Symbiote {
      init$ = {
        items: [
          { name: 'Alpha' },
          { name: 'Beta' },
          { name: 'Charlie' },
        ],
      };
    }
    SsrList.template = html`
      <ul itemize="items">
        <template>
          <li ${{textContent: 'name'}}></li>
        </template>
      </ul>
    `;
    SsrList.reg('ssr-list');

    let result = ssr.renderToString('ssr-list');
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(!result.includes('[object Object]'), `Unexpected "[object Object]" in output: ${result}`);
    assert.ok(result.includes('Alpha'), `Expected "Alpha" in output: ${result}`);
    assert.ok(result.includes('Beta'), `Expected "Beta" in output: ${result}`);
    assert.ok(result.includes('Charlie'), `Expected "Charlie" in output: ${result}`);
  });

  it('should render nested components with own state', async () => {
    const { default: Symbiote, html } = await import('../../core/Symbiote.js');

    class SsrChild extends Symbiote {
      init$ = {
        childLabel: 'I am child',
      };
    }
    SsrChild.template = html`<span ${{textContent: 'childLabel'}}></span>`;
    SsrChild.reg('ssr-child');

    class SsrParent extends Symbiote {
      init$ = {
        parentTitle: 'I am parent',
      };
    }
    SsrParent.template = html`
      <h2 ${{textContent: 'parentTitle'}}></h2>
      <ssr-child></ssr-child>
    `;
    SsrParent.reg('ssr-parent');

    let result = ssr.renderToString('ssr-parent');
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(!result.includes('[object Object]'), `Unexpected "[object Object]" in output: ${result}`);
    assert.ok(result.includes('I am parent'), `Expected "I am parent" in output: ${result}`);
    assert.ok(result.includes('I am child'), `Expected "I am child" in output: ${result}`);
    assert.ok(result.includes('bind="textContent:childLabel;"'), 'Child should have own binding, not parent');
    assert.ok(result.includes('bind="textContent:parentTitle;"'), 'Parent should have own binding');
  });

  it('should stream same output as renderToString', async () => {
    let chunks = [];
    for await (let chunk of ssr.renderToStream('ssr-basic')) {
      chunks.push(chunk);
    }
    let streamed = chunks.join('');
    let stringed = ssr.renderToString('ssr-basic');
    assert.equal(streamed, stringed, `Stream output should match renderToString.\nStreamed: ${streamed}\nString:  ${stringed}`);
  });

  it('should yield multiple chunks when streaming', async () => {
    let chunks = [];
    for await (let chunk of ssr.renderToStream('ssr-parent')) {
      chunks.push(chunk);
    }
    assert.ok(chunks.length > 1, `Expected multiple chunks, got ${chunks.length}: ${JSON.stringify(chunks)}`);
    let result = chunks.join('');
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(!result.includes('[object Object]'), `Unexpected "[object Object]" in output: ${result}`);
    assert.ok(result.includes('I am parent'), 'Should contain parent text');
    assert.ok(result.includes('I am child'), 'Should contain child text');
    assert.ok(result.includes('bind='), 'Should preserve bind attributes');
  });

  it('should stream shadow DOM component with DSD', async () => {
    let chunks = [];
    for await (let chunk of ssr.renderToStream('ssr-shadow')) {
      chunks.push(chunk);
    }
    let result = chunks.join('');
    assert.ok(result.includes('<template shadowrootmode="open">'), 'Should contain DSD');
    assert.ok(result.includes('<style>'), 'Should contain inlined styles');
    assert.ok(result.includes('Shadow Title'), 'Should contain content');
  });

  // Keep error test last — it destroys/reinits SSR, wiping customElements registry
  it('should throw if initSSR was not called', async () => {
    ssr.destroySSR();
    assert.throws(() => {
      ssr.renderToString('ssr-basic');
    }, /initSSR/);
    await ssr.initSSR();
  });
});
