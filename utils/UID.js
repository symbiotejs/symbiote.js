export class UID {
  static generate() {
    let allSymbolsStr = '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm';
    return 'XXXXXXXXX-XXX'.replace(/[X]/g, () => {
      let rnd = Math.floor(Math.random() * (allSymbolsStr.length - 1));
      let symbol = allSymbolsStr.substring(rnd, rnd + 1);
      return symbol;
    });
  }
}
