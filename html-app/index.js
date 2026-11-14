import { BaseClass } from './BaseClass.js';
import { SymComponent } from './sym-component.js';
import { SymContext } from './sym-context.js';
import { SymCollection } from './sym-collection.js';

SymComponent.reg('sym-component');
SymContext.reg('sym-context');
SymCollection.reg('sym-collection');

export {
  BaseClass,
  SymComponent,
  SymContext,
  SymCollection,
};
