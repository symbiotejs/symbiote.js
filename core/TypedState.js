import { UID } from '../../symbiote/utils/UID.js';
import { State } from '../../symbiote/core/State.js';

const MSG_NAME = '[Typed State] Wrong property name: ';
const MSG_TYPE = '[Typed State] Wrong property type: ';

export class TypedState {
  /**
   * 
   * @param {Object<string, {type: any, value: any}>} typedSchema 
   * @param {String} [ctxName] 
   */
  constructor(typedSchema, ctxName) {
    this.__typedSchema = typedSchema;
    this.__ctxId = ctxName || UID.generate();
    this.__schema = Object.keys(typedSchema).reduce((acc, key) => {
      acc[key] = typedSchema[key].value;
      return acc;
    }, {});
    this.__state = State.registerNamedCtx(this.__ctxId, this.__schema);
  }

  /**
   * 
   * @param {String} prop 
   * @param {*} value 
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
    this.__state.pub(prop, value);
  }

  /**
   * 
   * @param {String} prop 
   */
  getValue(prop) {
    if (!this.__typedSchema.hasOwnProperty(prop)) {
      console.warn(MSG_NAME + prop);
      return undefined;
    }
    return this.__state.read(prop);
  }

  /**
   * 
   * @param {String} prop 
   * @param {(newVal: any) => void} handler 
   */
  subscribe(prop, handler) {
    return this.__state.sub(prop, handler);
  }

  remove() {
    this.__state.remove();
  }
}