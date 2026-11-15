import { sourceURL, SourceError } from './fetch-source.js';
import { parseInitialData } from './initial-data.js';

/** @type {WeakMap<Node, { url: string, chain: string[] }>} */
export let fragmentSources = new WeakMap();

/** @param {Node} owner */
export function fragmentSource(owner) {
  let node = owner;
  while (node) {
    let source = fragmentSources.get(node);
    if (source) {
      return source;
    }
    node = node.parentNode || (node instanceof ShadowRoot ? node.host : null);
  }
  return {
    url: owner.baseURI,
    chain: [],
  };
}

let urlAttributes = new Set([
  'href',
  'xlink:href',
  'src',
  'action',
  'formaction',
  'poster',
  'cite',
  'background',
  'longdesc',
  'sync',
]);
let blockedElements = new Set([
  'base',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'meta',
  'foreignobject',
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
]);

/**
 * Resolve authored URL attributes without making executable schemes available.
 * @param {string} value
 * @param {string} base
 * @param {string} name
 */
function fragmentURL(value, base, name) {
  let url = new URL(value, base);
  let allowed = [
    'http:',
    'https:',
  ];
  if (name === 'href') {
    allowed.push('mailto:', 'tel:');
  }
  if (!allowed.includes(url.protocol) || url.username || url.password) {
    throw new SourceError('UNSAFE_TEMPLATE', 'Fragment URL attributes require non-executable URLs without credentials.');
  }
  // Fragment links, including SVG references, target the composed document.
  return value.trim().startsWith('#') ? value : url.href;
}

/**
 * Source sets use HTTP(S) candidates; descriptors are left to the browser.
 * URL tokens may contain commas, which are separators only after descriptors
 * or at the end of the URL token (the native source-set tokenization rule).
 * @param {string} value
 * @param {string} base
 */
function sourceSet(value, base) {
  let candidates = [];
  let rest = value;
  while (rest.trim()) {
    rest = rest.replace(/^[\s,]+/, '');
    let token = /^\S+/.exec(rest)?.[0];
    if (!token) {
      break;
    }
    rest = rest.slice(token.length);
    let descriptor = '';
    if (!token.endsWith(',')) {
      let end = rest.indexOf(',');
      descriptor = (end < 0 ? rest : rest.slice(0, end)).trim();
      rest = end < 0 ? '' : rest.slice(end + 1);
    }
    candidates.push(fragmentURL(token.replace(/,+$/, ''), base, 'src') + (descriptor ? ' ' + descriptor : ''));
  }
  return candidates.join(', ');
}

/**
 * Validate authored application templates, including otherwise inert templates.
 * This rejects common executable markup; it is not an untrusted-HTML sanitizer.
 * @param {DocumentFragment} root
 * @param {string} base
 */
function prepareElements(root, base) {
  for (let element of root.querySelectorAll('*')) {
    let name = element.localName.toLowerCase();
    if (blockedElements.has(name)) {
      throw new SourceError('UNSAFE_TEMPLATE', 'Fragments cannot embed browsing contexts, plugins or document metadata.');
    }
    if (name === 'script') {
      if (element.namespaceURI !== 'http://www.w3.org/1999/xhtml'
        || element.getAttribute('type') !== 'application/json' || element.hasAttribute('src')) {
        throw new SourceError('UNSAFE_TEMPLATE', 'Fragments accept inert JSON scripts only.');
      }
      parseInitialData(element.textContent || '');
    }
    for (let attribute of element.getAttributeNames()) {
      let lower = attribute.toLowerCase();
      if (lower.startsWith('on') || lower === 'srcdoc') {
        throw new SourceError('UNSAFE_TEMPLATE', 'Use declarative bindings instead of executable HTML attributes.');
      }
      let value = element.getAttribute(attribute);
      if (urlAttributes.has(lower) && value.trim()) {
        element.setAttribute(attribute, fragmentURL(value, base, lower));
      } else if (lower === 'srcset' || lower === 'imagesrcset') {
        element.setAttribute(attribute, sourceSet(value, base));
      } else if (lower === 'ping' && value.trim()) {
        element.setAttribute(attribute, value.trim().split(/\s+/).map((url) => fragmentURL(url, base, lower)).join(' '));
      }
    }
    if (element instanceof HTMLTemplateElement) {
      prepareElements(element.content, base);
    }
  }
}

/**
 * Parse inertly before constructing custom elements in the destination registry.
 * @param {Document} document
 * @param {string} text
 * @param {string} base
 */
export function fragmentTemplate(document, text, base) {
  let template = document.createElement('template');
  template.innerHTML = text;
  prepareElements(template.content, base);
  return template.content;
}

/**
 * @param {Element} owner
 * @param {string} source
 */
export function importSource(owner, source) {
  let parent = fragmentSource(owner);
  let url = sourceURL(source, parent.url);
  if (parent.chain.includes(url) || parent.chain.length >= 16) {
    throw new SourceError('IMPORT_CYCLE', 'HTML imports cannot cycle or exceed 16 nested fragments.');
  }
  return {
    url,
    chain: [
      ...parent.chain,
      url,
    ],
  };
}
