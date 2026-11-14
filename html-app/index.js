import { BaseClass } from './BaseClass.js';
import { SymComponent } from './sym-component.js';
import { SymContext } from './sym-context.js';

SymComponent.reg('sym-component');
SymContext.reg('sym-context');

export {
  BaseClass,
  SymComponent,
  SymContext,
};
