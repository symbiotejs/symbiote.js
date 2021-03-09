import { BaseComponent } from '../../core/BaseComponent.js';
import { tagManageExt } from '../../extensions/tagManageExt.js';

const Component = tagManageExt(BaseComponent);

class E$l$ extends Component {}
E$l$.template = /*html*/ `
<div>AUTO ELEMENT</div> 
`;

class TestApp extends Component {
  connectedCallback() {
    super.connectedCallback();
    console.log(this.constructor.name);
  }
}
TestApp.template = /*html*/ `
<div>TAG MANAGE TEST</div>
<${E$l$.is}>TAG MANAGE TEST</${E$l$.is}>
`;

TestApp.defineTag('test-app');
