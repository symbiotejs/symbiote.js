export class TokenList {
  static _voidFn() {}

  constructor() {
    this._set = new Set();
    this._updCallback = TokenList._voidFn;
  }

  /** @param {() => any} cb */
  set updateCallback(cb) {
    this._updCallback = cb;
  }

  get updateCallback() {
    return this._updCallback;
  }

  get value() {
    return [...this._set].join(' ');
  }

  /** @param {String} val */
  set value(val) {
    this._set = new Set(val.split(' '));
    this._updCallback();
  }

  /** @param {String} tokensStr */
  add(tokensStr) {
    let tArr = tokensStr.split(' ');
    tArr.forEach((t) => {
      this._set.add(t);
    });
    this._updCallback();
  }

  /** @param {String} tokensStr */
  remove(tokensStr) {
    let tArr = tokensStr.split(' ');
    tArr.forEach((t) => {
      this._set.delete(t);
    });
    this._updCallback();
  }

  /**
   * @param {String} oldToken
   * @param {String} newToken
   */
  replace(oldToken, newToken) {
    this._set.delete(oldToken);
    this._set.add(newToken);
    this._updCallback();
  }

  /** @param {String} token */
  toggle(token) {
    if (this._set.has(token)) {
      this._set.delete(token);
    } else {
      this._set.add(token);
    }
    this._updCallback();
  }

  /** @param {String} token */
  contains(token) {
    return this._set.has(token);
  }

  /** @param {(token: string) => any} callback */
  forEach(callback) {
    return this._set.forEach(callback);
  }
}
