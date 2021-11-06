const CHARS = '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm';
const CHLENGTH = CHARS.length - 1;

export class UID {
  
  /**
   * 
   * @param {String} [pattern] any symbols sequence with dashes. Default dash is used for human readability
   * @returns {String} output example: v6xYaSk7C-kzZ
   */
  static generate(pattern = 'XXXXXXXXX-XXX') {
    let uid = '';
  	for (let i = 0; i < pattern.length; i++) {
  		uid += pattern[i] === '-' ? pattern[i] : CHARS.charAt(Math.random() * CHLENGTH);
  	}
  	return uid;
  }
};
