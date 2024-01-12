/**
 * This method of UID generation was selected according to multiple benchmarks. 
 * It has an optimal performance and human readability.
 * Standard crypto.randomUUID() - is much slower.
 * 
 * Note, that for the global uniqueness you should consider the other format and generation methods.
 */

const CHARS = '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm';
const LENGTH = CHARS.length - 1;

export class UID {
  /**
   * @param {String} [pattern] Any symbols sequence with dashes. Default dash is used for human readability
   * @returns {String} Output example: v6xYaSk7C-kzZ
   */
  static generate(pattern = 'XXXXXXXXX-XXX') {
    let uid = '';
    for (let i = 0; i < pattern.length; i++) {
      uid += pattern[i] === '-' ? pattern[i] : CHARS.charAt(Math.random() * LENGTH);
    }
    return uid;
  }
}
