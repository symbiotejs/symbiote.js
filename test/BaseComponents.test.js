import { expect } from '@esm-bundle/chai';
import { BaseComponent } from '../core/BaseComponent.js';
import { stub } from 'sinon';

describe('BaseComponent', () => {
  describe('#reg', () => {
    it('should register custom element with provided tag name', () => {
      class Test1 extends BaseComponent {}
      Test1.reg('test-reg-1');
      expect(window.customElements.get('test-reg-1')).to.equal(Test1);
    });

    it('should print warning when trying to re-register tag name with another class', () => {
      const warn = stub(console, 'warn');

      class Test1 extends BaseComponent {}
      Test1.reg('test-reg-2');
      class Test2 extends BaseComponent {}
      Test2.reg('test-reg-2');
      expect(window.customElements.get('test-reg-2')).to.equal(Test1);
      expect(warn.calledOnce).to.be.true;
      expect(warn.args[0][0]).to.match(/already registered/);

      warn.restore();
    });

    it('should not print warning when trying to re-register tag name with same class', () => {
      const warn = stub(console, 'warn');

      class Test1 extends BaseComponent {}
      Test1.reg('test-reg-3');
      Test1.reg('test-reg-3');
      expect(window.customElements.get('test-reg-3')).to.equal(Test1);
      expect(warn.called).to.be.false;

      warn.restore();
    });

    it('should be able to register alias', () => {
      class Test1 extends BaseComponent {
        static id = 'Test1';
      }
      Test1.reg('test-reg-4');
      Test1.reg('test-reg-5', true);
      expect(window.customElements.get('test-reg-4')).to.equal(Test1);
      expect(window.customElements.get('test-reg-5')).to.not.equal(Test1);
      expect(window.customElements.get('test-reg-4').id).to.equal(window.customElements.get('test-reg-5').id);
    });
  });
});
