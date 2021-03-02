import { BaseComponent } from '../../core/BaseComponent.js';
import { tagManageExt } from '../../core/extensions/tagManageExt.js';

const Component = tagManageExt(BaseComponent);

class El extends Component {}
El.template = /*html*/ `
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
<${El.is}>TAG MANAGE TEST</${El.is}>
`;

TestApp.defineTag('test-app');
