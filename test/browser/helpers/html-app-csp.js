import Symbiote from '../../../core/Symbiote.js';

window.cspViolations = [];
document.addEventListener('securitypolicyviolation', (event) => {
  window.cspViolations.push(event.effectiveDirective);
});
class PlainCounter extends Symbiote {
  init$ = {
    count: 0,
  };
  increment() {
    this.$.count++;
  }
}
PlainCounter.template = '<button bind="onclick: increment">Ordinary counter</button><output>{{count}}</output>';
PlainCounter.reg('plain-counter');
await import('/html-app/webmcp/index.js');
