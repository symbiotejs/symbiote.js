import { DICT } from "../core/dictionary.js";

/**
 * @param {Partial<import('../core/dictionary.js').DICT>} dict
 */
export function reassignDictionary(dict) {
  // Here is the tricky workaround to avoid code removal for the side-effect free modules.
  // Returned value should be accessed by the client-code to prevent tree-shaking,
  // otherwise the module will be removed by the bundler.
  Object.assign(DICT, dict);
  return DICT;
}
