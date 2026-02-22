import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

describe('SSR Engine', async () => {
  let ssr;

  before(async () => {
    ssr = await import('../core/ssr.js');
    await ssr.initSSR();
  });

  after(() => {
    ssr.destroySSR();
  });

  it('should render a basic component to HTML', async () => {
    const { default: Symbiote, html } = await import('../core/Symbiote.js');

    class SsrBasic extends Symbiote {
      init$ = {
        greeting: 'Hello SSR',
      };
    }
    SsrBasic.template = html`<span ${{textContent: 'greeting'}}></span>`;
    SsrBasic.reg('ssr-basic');

    let result = ssr.renderToString('ssr-basic');
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(result.includes('Hello SSR'), `Expected "Hello SSR" in output: ${result}`);
    assert.ok(result.includes('<ssr-basic'), 'Should contain opening tag');
    assert.ok(result.includes('</ssr-basic>'), 'Should contain closing tag');
  });

  it('should render a shadow DOM component with DSD', async () => {
    const { default: Symbiote, html, css } = await import('../core/Symbiote.js');

    class SsrShadow extends Symbiote {
      init$ = {
        title: 'Shadow Title',
      };
    }
    SsrShadow.template = html`<h1 ${{textContent: 'title'}}></h1>`;
    SsrShadow.shadowStyles = css`:host { display: block; color: red; }`;
    SsrShadow.reg('ssr-shadow');

    let result = ssr.renderToString('ssr-shadow');
    console.log(result);
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(result.includes('<template shadowrootmode="open">'), 'Should contain DSD template');
    assert.ok(result.includes('<style>'), 'Should contain inlined styles');
    assert.ok(result.includes('display: block'), 'Should contain CSS text');
    assert.ok(result.includes('Shadow Title'), `Expected "Shadow Title" in output: ${result}`);
  });

  it('should set attributes from attrs argument', async () => {
    const { default: Symbiote } = await import('../core/Symbiote.js');

    class SsrAttrs extends Symbiote {}
    SsrAttrs.template = '<div>content</div>';
    SsrAttrs.reg('ssr-attrs');

    let result = ssr.renderToString('ssr-attrs', { id: 'test', 'data-val': '42' });
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(result.includes('id="test"'), 'Should have id attribute');
    assert.ok(result.includes('data-val="42"'), 'Should have data attribute');
  });

  it('should throw if initSSR was not called', async () => {
    ssr.destroySSR();
    assert.throws(() => {
      ssr.renderToString('ssr-basic');
    }, /initSSR/);
    // Re-init for any following tests:
    await ssr.initSSR();
  });
});
