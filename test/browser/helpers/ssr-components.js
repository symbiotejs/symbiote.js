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
  <ssr-inner-html></ssr-inner-html>
  <ssr-list></ssr-list>
  <ssr-nested-list></ssr-nested-list>
`;
SsrRoot.reg('ssr-root');

export class SsrInnerHtml extends Symbiote {
  ssrMode = true;
  init$ = {
    richContent: '<em>server rendered</em>',
  };
}
SsrInnerHtml.template = html`<div ${{innerHTML: 'richContent'}}></div>`;
SsrInnerHtml.reg('ssr-inner-html');

export class SsrList extends Symbiote {
  ssrMode = true;
  init$ = {
    items: [
      { label: 'Item A' },
      { label: 'Item B' },
      { label: 'Item C' },
    ],
  };
}
SsrList.template = html`
  <ul itemize="items">
    <template>
      <li ${{textContent: 'label'}}></li>
    </template>
  </ul>
`;
SsrList.reg('ssr-list');

export class SsrNestedList extends Symbiote {
  ssrMode = true;
  init$ = {
    entries: [
      { label: 'Entry 1' },
      { label: 'Entry 2' },
    ],
  };
}
SsrNestedList.template = html`
  <div itemize="entries">
    <template>
      <div class="entry">
        <span ${{textContent: 'label'}}></span>
        <ssr-leaf></ssr-leaf>
      </div>
    </template>
  </div>
`;
SsrNestedList.reg('ssr-nested-list');
