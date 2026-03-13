import { registerMessages } from './warn.js';

globalThis.__SYMBIOTE_DEV_MODE = true;

registerMessages(new Map([
  // PubSub
  [1, (uid, action, prop) =>
    `[Symbiote] PubSub (${uid}): cannot ${action}. Property: "${prop}"`],
  [2, (uid, prop, prevType, newType, prev, next) =>
    `[Symbiote] PubSub (${uid}): type change for "${prop}" [${prevType} → ${newType}].\n`
    + `Previous: ${prev}\nNew: ${next}`],
  [3, (uid) =>
    `[Symbiote] PubSub: context "${uid}" is already registered. Returning existing instance.`],
  [4, (uid, keys) =>
    `[Symbiote] PubSub: context "${uid}" not found.\n`
    + `Available contexts: [${keys}]`],

  // Symbiote
  [5, (localName, selector) =>
    `[Symbiote] <${localName}>: custom template "${selector}" not found.`],
  [6, (localName, sharedName) =>
    `[Symbiote] "${localName}" uses *${sharedName} without ctx attribute or --ctx CSS variable. `
    + 'Set ctx="name" or --ctx to share state.'],
  [7, (sharedName) =>
    `[Symbiote] Shared prop "${sharedName}" already has value. Keeping existing.`],
  [8, (tagName, existingClass, newClass) =>
    `[Symbiote] <${tagName}> is already registered (class: ${existingClass}).\n`
    + `Attempted re-registration with class "${newClass}" — skipped.`],
  [9, (localName, propName) =>
    `[Symbiote] <${localName}>: CSS data parse error for "${propName}". Check that the CSS custom property is defined.`],
  [10, (localName, propName) =>
    `[Symbiote dev] <${localName}>: CSS data binding "${propName}" will not read computed styles during SSR. `
    + 'The init value will be used instead.'],

  // tpl-processors
  [11, (localName, valKey, knownKeys) =>
    `[Symbiote dev] <${localName}>: binding key "${valKey}" not found in init$ (auto-initialized to null).\n`
    + `Known keys: [${knownKeys}]`],
  [12, (localName, prop) =>
    `[Symbiote dev] <${localName}>: text-node binding "{{${prop}}}" has no hydration attribute. `
    + 'In ssrMode/isoMode it will be rendered by the server but won\'t update on the client. '
    + 'Use property binding (${{textContent: \'' + prop + '\'}}) for hydratable text.'],

  // AppRouter
  [13, (msg) =>
    `[Symbiote > AppRouter] ${msg}`],
  [14, () =>
    '[Symbiote > AppRouter] History API is not available.'],

  // html
  [15, (val) =>
    `[Symbiote > html] \`this\` used in template interpolation (value: ${val}).\n`
    + 'Templates are context-free — use ${{ prop: \'stateKey\' }} binding syntax instead.'],

  // itemizeProcessor
  [16, (localName, dataType, data) =>
    `[Symbiote] <${localName}>: itemize data must be Array or Object, got ${dataType}: ${data}`],
]));
