import Symbiote, { html } from '../../core/index.js';

class SsrChild extends Symbiote {
  ssrMode = true;

  init$ = {
    childLabel: 'I am child',
  };
}

SsrChild.template = html`<span ${{textContent: 'childLabel'}}></span>`;

SsrChild.reg('ssr-child');


class SsrParent extends Symbiote {
  ssrMode = true;

  init$ = {
    parentTitle: 'I am parent',
  };
}

SsrParent.template = html`
  <h2 ${{textContent: 'parentTitle'}}></h2>
  <ssr-child></ssr-child>
`;

SsrParent.reg('ssr-parent');
