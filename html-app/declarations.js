import { resolveTemplate } from '../core/resolveTemplate.js';

/** @type {Map<string, { template: string, type: typeof import('./BaseClass.js').BaseClass }>} */
let definitions = new Map();

/**
 * Register a static declaration without rendering it or processing its actions.
 * @param {Element} element
 * @param {typeof import('./BaseClass.js').BaseClass} Base
 */
export function registerDeclaration(element, Base) {
  let name = element.getAttribute('reg')?.trim();
  if (!name) {
    throw new TypeError('A component declaration requires a custom element name.');
  }
  let selector = element.getAttribute('use-template');
  let templates = [
    ...element.children,
  ].filter((child) => child.localName === 'template');
  let source = selector ? resolveTemplate(element, selector) : templates[0];
  if (!(source instanceof HTMLTemplateElement) || (!selector && templates.length !== 1)) {
    throw new TypeError('A component declaration requires one template or a valid use-template reference.');
  }
  let template = source.innerHTML;
  let existing = window.customElements.get(name);
  let definition = definitions.get(name);
  if (existing) {
    if (definition?.type !== existing || definition.template !== template) {
      throw new TypeError('A different component is already registered: ' + name);
    }
    element.setAttribute('hidden', '');
    return definition.type;
  }
  class Feature extends Base {}
  Feature.template = template;
  // Native registration validates custom element names and reserved names.
  Feature.reg(name);
  definitions.set(name, {
    template,
    type: Feature,
  });
  element.setAttribute('hidden', '');
  return Feature;
}

/**
 * Register declarations in a cloned template before native Itemize consumes it.
 * @param {Element | DocumentFragment} root
 * @param {import('./BaseClass.js').BaseClass} owner
 */
export function declarationProcessor(root, owner) {
  for (let declaration of root.querySelectorAll('sym-component[reg]')) {
    registerDeclaration(declaration, owner.Symbiote);
  }
}
