import { Symbiote, html, css } from '../core/Symbiote.js';
import { BaseClass } from './BaseClass.js';
import { SymComponent } from './sym-component.js';
import { SymContext } from './sym-context.js';
import { SymCollection } from './sym-collection.js';
import { SymConditional } from './sym-conditional.js';
import { SymImport } from './sym-import.js';
import { SymRouter } from './sym-router.js';

if (typeof document !== 'undefined' && !globalThis.__SYMBIOTE_SSR) {
  // Capture the loader before awaiting; module/CDN wrappers use the marked script.
  let script = document.currentScript ??
    document.querySelector('script[type="module"][src][webmcp-mode="true"]');
  if (script?.getAttribute('webmcp-mode') === 'true') {
    await import('../core/webmcp.js');
    BaseClass.mcpToolMode = true;
  }
}

SymComponent.reg('sym-component');
SymContext.reg('sym-context');
SymCollection.reg('sym-collection');
SymConditional.reg('sym-conditional');
SymImport.reg('sym-import');
SymRouter.reg('sym-router');

export {
  Symbiote, html, css,
  BaseClass,
  SymComponent,
  SymContext,
  SymCollection,
  SymConditional,
  SymImport,
  SymRouter,
};
