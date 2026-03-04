/**
 * Shared isoMode test components.
 * Same code runs in Node (SSR) and Browser (hydration/render).
 * isoMode = true — hydrate if children exist, render template otherwise.
 */
import Symbiote, { html } from '../../../core/Symbiote.js';

export class IsoLeaf extends Symbiote {
  isoMode = true;
  init$ = {
    leafText: 'leaf content',
  };
}
IsoLeaf.template = html`<span ${{textContent: 'leafText'}}></span>`;
IsoLeaf.reg('iso-leaf');

export class IsoRoot extends Symbiote {
  isoMode = true;
  init$ = {
    rootTitle: 'ISO Root',
  };
}
IsoRoot.template = html`
  <h1 ${{textContent: 'rootTitle'}}></h1>
  <iso-leaf></iso-leaf>
`;
IsoRoot.reg('iso-root');
