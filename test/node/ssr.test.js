import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

describe('SSR Engine', async () => {
  let SSR;

  before(async () => {
    ({ SSR } = await import('../../node/SSR.js'));
    await SSR.init();
  });

  after(() => {
    SSR.destroy();
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

    let result = SSR.renderToString('ssr-basic');
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

    let result = SSR.renderToString('ssr-shadow');
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

    let result = SSR.renderToString('ssr-attrs', { id: 'test', 'data-val': '42' });
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

    let result = SSR.renderToString('ssr-list');
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

    let result = SSR.renderToString('ssr-parent');
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(!result.includes('[object Object]'), `Unexpected "[object Object]" in output: ${result}`);
    assert.ok(result.includes('I am parent'), `Expected "I am parent" in output: ${result}`);
    assert.ok(result.includes('I am child'), `Expected "I am child" in output: ${result}`);
    assert.ok(result.includes('bind="textContent:childLabel;"'), 'Child should have own binding, not parent');
    assert.ok(result.includes('bind="textContent:parentTitle;"'), 'Parent should have own binding');
  });

  it('should stream same output as renderToString', async () => {
    let chunks = [];
    for await (let chunk of SSR.renderToStream('ssr-basic')) {
      chunks.push(chunk);
    }
    let streamed = chunks.join('');
    let stringed = SSR.renderToString('ssr-basic');
    assert.equal(streamed, stringed, `Stream output should match renderToString.\nStreamed: ${streamed}\nString:  ${stringed}`);
  });

  it('should yield multiple chunks when streaming', async () => {
    let chunks = [];
    for await (let chunk of SSR.renderToStream('ssr-parent')) {
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
    for await (let chunk of SSR.renderToStream('ssr-shadow')) {
      chunks.push(chunk);
    }
    let result = chunks.join('');
    assert.ok(result.includes('<template shadowrootmode="open">'), 'Should contain DSD');
    assert.ok(result.includes('<style>'), 'Should contain inlined styles');
    assert.ok(result.includes('Shadow Title'), 'Should contain content');
  });

  it('should render rootStyles as inline <style> tag', async () => {
    const { default: Symbiote, html, css } = await import('../../core/Symbiote.js');

    class SsrStyled extends Symbiote {
      init$ = {
        label: 'styled text',
      };
    }
    SsrStyled.template = html`<span ${{textContent: 'label'}}></span>`;
    SsrStyled.rootStyles = css`ssr-styled { display: block; color: crimson; }`;
    SsrStyled.reg('ssr-styled');

    let result = SSR.renderToString('ssr-styled');
    assert.ok(result.includes('<style>'), 'Should contain <style> tag');
    assert.ok(result.includes('display: block'), 'Should contain CSS rule');
    assert.ok(result.includes('crimson'), 'Should contain color value');
    assert.ok(result.includes('styled text'), 'Should contain rendered content');
    // rootStyles should NOT use DSD:
    assert.ok(!result.includes('shadowrootmode'), 'Should not use DSD for rootStyles');
  });

  it('should add nonce to rootStyles <style> tags via renderToString', async () => {
    let result = SSR.renderToString('ssr-styled', {}, { nonce: 'test123' });
    assert.ok(result.includes('nonce="test123"'), `Expected nonce attribute in output: ${result}`);
    assert.ok(result.includes('<style nonce="test123">'), 'Should add nonce to style tag');
  });

  it('should add nonce to shadow <style> tags via renderToString', async () => {
    let result = SSR.renderToString('ssr-shadow', {}, { nonce: 'shadow-n' });
    assert.ok(result.includes('<style nonce="shadow-n">'), `Expected nonce on shadow style: ${result}`);
  });

  it('should not add nonce attribute when nonce is not provided', async () => {
    let result = SSR.renderToString('ssr-styled');
    assert.ok(!result.includes('nonce='), 'Should not contain nonce when not provided');
  });

  it('should add nonce to <style> tags via renderToStream', async () => {
    let chunks = [];
    for await (let chunk of SSR.renderToStream('ssr-styled', {}, { nonce: 'stream-n' })) {
      chunks.push(chunk);
    }
    let result = chunks.join('');
    assert.ok(result.includes('<style nonce="stream-n">'), `Expected nonce in streamed output: ${result}`);
  });

  it('should render {{prop}} text-node bindings with class field fallback', async () => {
    const { default: Symbiote, html } = await import('../../core/Symbiote.js');

    class SsrTxtNode extends Symbiote {
      init$ = { fromInit: 'InitValue' };
      fromField = 'FieldValue';
    }
    SsrTxtNode.template = html`<div>{{fromInit}} and {{fromField}}</div>`;
    SsrTxtNode.reg('ssr-txt-node');

    let result = SSR.renderToString('ssr-txt-node');
    assert.ok(result.includes('InitValue'), `Expected "InitValue" in output: ${result}`);
    assert.ok(result.includes('FieldValue'), `Expected "FieldValue" in output: ${result}`);
    assert.ok(!result.includes('{{'), `Unexpected raw token in output: ${result}`);
  });


  it('should render component with shared ctx props (*prop) and ctx attribute', async () => {
    const { default: Symbiote, html } = await import('../../core/Symbiote.js');

    class SsrShared extends Symbiote {
      init$ = {
        '*sharedVal': 'hello from shared',
      };
    }
    SsrShared.template = html`<span ${{textContent: '*sharedVal'}}></span>`;
    SsrShared.reg('ssr-shared');

    class SsrSharedReader extends Symbiote {
      init$ = {
        '*sharedVal': '',
      };
    }
    SsrSharedReader.template = html`<em ${{textContent: '*sharedVal'}}></em>`;
    SsrSharedReader.reg('ssr-shared-reader');

    let result = await SSR.processHtml(
      '<ssr-shared ctx="test-ctx"></ssr-shared><ssr-shared-reader ctx="test-ctx"></ssr-shared-reader>'
    );
    assert.ok(!result.includes('undefined'), `Unexpected "undefined" in output: ${result}`);
    assert.ok(result.includes('ctx="test-ctx"'), `Expected ctx attribute in output: ${result}`);
    // Both components should read the shared value:
    assert.ok(result.includes('<span'), 'Should contain first component content');
    assert.ok(result.includes('<em'), 'Should contain second component content');
    assert.ok(
      (result.match(/hello from shared/g) || []).length === 2,
      `Expected shared value in both components: ${result}`
    );
  });

  it('should render isVirtual component without wrapping tag', async () => {
    const { default: Symbiote, html } = await import('../../core/Symbiote.js');

    class SsrVirtual extends Symbiote {
      isVirtual = true;
      init$ = {
        label: 'virtual content',
      };
    }
    SsrVirtual.template = html`<span ${{textContent: 'label'}}></span>`;
    SsrVirtual.reg('ssr-virtual');

    let result = SSR.renderToString('ssr-virtual');
    assert.ok(result.includes('virtual content'), `Expected "virtual content" in output: ${result}`);
    assert.ok(result.includes('<span'), 'Should contain template content');
    assert.ok(!result.includes('<ssr-virtual'), `Should NOT contain wrapping tag: ${result}`);
    assert.ok(!result.includes('</ssr-virtual>'), `Should NOT contain closing tag: ${result}`);
  });

  it('should render allowCustomTemplate with use-template attribute', async () => {
    const { default: Symbiote, html } = await import('../../core/Symbiote.js');

    class SsrCustomTpl extends Symbiote {
      allowCustomTemplate = true;
      init$ = {
        msg: 'custom tpl content',
      };
    }
    SsrCustomTpl.template = html`<span>default</span>`;
    SsrCustomTpl.reg('ssr-custom-tpl');

    // Place a <template> in the document for the component to find:
    let tpl = document.createElement('template');
    tpl.setAttribute('id', 'my-tpl');
    tpl.innerHTML = '<div bind="textContent: msg;"></div>';
    document.body.appendChild(tpl);

    let result = SSR.renderToString('ssr-custom-tpl', { 'use-template': 'template#my-tpl' });
    assert.ok(result.includes('custom tpl content'), `Expected "custom tpl content" in output: ${result}`);
    assert.ok(result.includes('<div'), 'Should contain custom template element');
    assert.ok(!result.includes('default'), `Should NOT contain default template: ${result}`);

    tpl.remove();
  });

  it('should throw if init was not called', async () => {
    SSR.destroy();
    assert.throws(() => {
      SSR.renderToString('ssr-basic');
    }, /init/);
    await SSR.init();
  });
});

describe('SSR.processHtml', async () => {
  let SSR;

  before(async () => {
    ({ SSR } = await import('../../node/SSR.js'));
    // Components need globals to register, so init first:
    await SSR.init();
    const { default: Symbiote, html } = await import('../../core/Symbiote.js');

    class ProcBasic extends Symbiote {
      init$ = { msg: 'processed' };
    }
    ProcBasic.template = html`<span ${{textContent: 'msg'}}></span>`;
    ProcBasic.reg('proc-basic');

    class ProcInner extends Symbiote {
      init$ = { inner: 'inside' };
    }
    ProcInner.template = html`<em ${{textContent: 'inner'}}></em>`;
    ProcInner.reg('proc-inner');

    class ProcOuter extends Symbiote {
      init$ = { outer: 'outside' };
    }
    ProcOuter.template = html`<strong ${{textContent: 'outer'}}></strong><proc-inner></proc-inner>`;
    ProcOuter.reg('proc-outer');
  });

  after(() => {
    SSR.destroy();
  });

  it('should process HTML with a single component', async () => {
    let result = await SSR.processHtml('<proc-basic></proc-basic>');
    assert.ok(result.includes('processed'), `Expected "processed" in output: ${result}`);
    assert.ok(result.includes('<proc-basic'), 'Should contain component tag');
    assert.ok(result.includes('bind='), 'Should preserve bind attributes');
  });

  it('should process HTML with mixed content and components', async () => {
    let result = await SSR.processHtml('<div><h1>Title</h1><proc-basic></proc-basic><footer>end</footer></div>');
    assert.ok(result.includes('<h1>Title</h1>'), 'Should preserve plain HTML');
    assert.ok(result.includes('processed'), 'Should render component');
    assert.ok(result.includes('<footer>end</footer>'), 'Should preserve trailing HTML');
  });

  it('should process HTML with nested components', async () => {
    let result = await SSR.processHtml('<proc-outer></proc-outer>');
    assert.ok(result.includes('outside'), 'Should render outer component');
    assert.ok(result.includes('inside'), 'Should render inner component');
  });

  it('should add nonce to <style> tags via processHtml', async () => {
    const { default: Symbiote, html, css } = await import('../../core/Symbiote.js');

    class ProcStyled extends Symbiote {
      init$ = { val: 'nonce-test' };
    }
    ProcStyled.template = html`<span ${{textContent: 'val'}}></span>`;
    ProcStyled.rootStyles = css`proc-styled { display: flex; }`;
    ProcStyled.reg('proc-styled');

    let result = await SSR.processHtml('<proc-styled></proc-styled>', { nonce: 'proc-n' });
    assert.ok(result.includes('<style nonce="proc-n">'), `Expected nonce in processHtml output: ${result}`);
  });
});

