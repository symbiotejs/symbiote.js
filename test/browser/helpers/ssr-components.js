/**
 * Shared SSR test components.
 * Same code runs in Node (SSR) and Browser (hydration).
 * ssrMode = true — browser skips template injection, hydrates existing DOM.
 */
import Symbiote, { html, css } from '../../../core/Symbiote.js';

export class SsrLeaf extends Symbiote {
  ssrMode = true;
  init$ = {
    leafText: 'leaf content',
  };
}
SsrLeaf.template = html`<span ${{textContent: 'leafText'}}></span>`;
SsrLeaf.reg('ssr-leaf');

export class SsrMiddle extends Symbiote {
  ssrMode = true;
  init$ = {
    middleLabel: 'middle section',
  };
}
SsrMiddle.template = html`
  <h3 ${{textContent: 'middleLabel'}}></h3>
  <ssr-leaf></ssr-leaf>
`;
SsrMiddle.reg('ssr-middle');

export class SsrRoot extends Symbiote {
  ssrMode = true;
  init$ = {
    rootTitle: 'SSR Root',
  };
}
SsrRoot.template = html`
  <h1 ${{textContent: 'rootTitle'}}></h1>
  <ssr-middle></ssr-middle>
`;
SsrRoot.reg('ssr-root');
