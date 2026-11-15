import { BaseClass } from './BaseClass.js';
import { SymComponent } from './sym-component.js';
import { SymContext } from './sym-context.js';
import { SymCollection } from './sym-collection.js';
import { SymConditional } from './sym-conditional.js';
import { SymImport } from './sym-import.js';

SymComponent.reg('sym-component');
SymContext.reg('sym-context');
SymCollection.reg('sym-collection');
SymConditional.reg('sym-conditional');
SymImport.reg('sym-import');

export {
  BaseClass,
  SymComponent,
  SymContext,
  SymCollection,
  SymConditional,
  SymImport,
};
