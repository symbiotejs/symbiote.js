import { DICT } from '../core/dictionary.js';

/** @param {typeof import('../core/BaseComponent').BaseComponent} classObj */
export function tagManageExt(classObj) {
  return class extends classObj {
    /** @param {String} name */
    static set is(name) {
      if (window.customElements.get(name)) {
        return;
      }
      this.__is = name;
      window.customElements.define(name, this);
    }

    static get is() {
      if (!this.__is) {
        this.defineTag();
      }
      return this.__is;
    }

    /** @param {String} prefix */
    static set tagPrefix(prefix) {
      this.__tagPrefix = prefix;
    }

    static get tagPrefix() {
      return this.__tagPrefix || DICT.PROJECT_PREFIX;
    }

    static get autoTagName() {
      let tag = this.name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      return `${this.tagPrefix}-${tag.replace(/\$/g, '_s_')}`; // "$" symbol cannot be in custom tag name
    }

    /** @param {String} [tagName] */
    static defineTag(tagName) {
      this.is = tagName || this.autoTagName;
    }

    /** @param {String} [aliasTagName] */
    static defineAliasTag(aliasTagName) {
      if (!this.aliasConstructors) {
        this.aliasConstructors = [];
      }
      let aliasClassName = this.name + this.aliasConstructors.length;
      let cls = {
        // Class should have a name to generate tag:
        [aliasClassName]: class extends this {},
      };
      let tagName = aliasTagName || cls[aliasClassName].autoTagName;
      cls[aliasClassName].is = tagName;
      this.aliasConstructors.push(cls[aliasClassName]);
      return tagName;
    }
  };
}
