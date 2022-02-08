import { UID } from '../utils/UID.js';
import { Data } from './Data.js';

const MSG_NAME = '[Typed State] Wrong property name: ';
const MSG_TYPE = '[Typed State] Wrong property type: ';

export class TypedData {
  /**
   * @param {Object<string, { type: any; value: any }>} typedSchema
   * @param {String} [ctxName]
   */
  constructor(typedSchema, ctxName) {
    /** @private */
    this.__typedSchema = typedSchema;
    /** @private */
    this.__ctxId = ctxName || UID.generate();
    /** @private */
    this.__schema = Object.keys(typedSchema).reduce((acc, key) => {
      acc[key] = typedSchema[key].value;
      return acc;
    }, {});
    /**
     * @private
     * @type {Data}
     */
    this.__data = Data.registerNamedCtx(this.__ctxId, this.__schema);
  }

  /** @returns {String} */
  get uid() {
    return this.__ctxId;
  }

  /**
   * @param {String} prop
   * @param {any} value
   */
  setValue(prop, value) {
    if (!this.__typedSchema.hasOwnProperty(prop)) {
      console.warn(MSG_NAME + prop);
      return;
    }
    if (value?.constructor !== this.__typedSchema[prop].type) {
      console.warn(MSG_TYPE + prop);
      return;
    }
    this.__data.pub(prop, value);
  }

  /** @param {Object<string, any>} updObj */
  setMultipleValues(updObj) {
    for (let prop in updObj) {
      this.setValue(prop, updObj[prop]);
    }
  }

  /** @param {String} prop */
  getValue(prop) {
    if (!this.__typedSchema.hasOwnProperty(prop)) {
      console.warn(MSG_NAME + prop);
      return undefined;
    }
    return this.__data.read(prop);
  }

  /**
   * @param {String} prop
   * @param {(newVal: any) => void} handler
   */
  subscribe(prop, handler) {
    return this.__data.sub(prop, handler);
  }

  remove() {
    this.__data.remove();
  }
}
