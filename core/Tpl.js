export class Tpl {
  static get store() {
    if (!this._store) {
      this._store = Object.create(null);
    }
    return this._store;
  }

  /** @param {String | DocumentFragment} tpl */
  static create(tpl) {
    let template = document.createElement('template');
    if (tpl.constructor === String) {
      template.innerHTML = tpl;
    } else if (tpl.constructor === DocumentFragment) {
      template.content.appendChild(tpl);
    }
    return template;
  }

  /**
   * @param {String | DocumentFragment} tpl
   * @param {String} [uid]
   */
  constructor(tpl, uid) {
    this.uid = uid;
    if (!uid) {
      this._tplEl = Tpl.create(tpl);
    } else if (!Tpl.store[uid]) {
      Tpl.store[uid] = Tpl.create(tpl);
    }
  }

  /** @type {HTMLTemplateElement} */
  get tplEl() {
    return this._tplEl || Tpl.store[this.uid];
  }

  /**
   * @param {Tpl} inst
   * @param {(DocumentFragment) => any} processor
   */
  static processContent(inst, processor) {
    return processor(inst.tplEl.content);
  }

  /** @returns {DocumentFragment} */
  clone() {
    /*
    There is an important difference between "cloneNode" and "importNode" methods.
    In case of "cloneNode", all Custom Elements in template become HTMLElement instances,
    without any properties or methods defined for it's classes until they will be
    upgraded by browser. 
    With "importNode" - we get correct instances of Custom Element classes.
    This behavior needs to be deeply investigated. Also, performance check needed.
    */
    // return this.tplEl.content.cloneNode(true);
    return document.importNode(this.tplEl.content, true);
  }
}
