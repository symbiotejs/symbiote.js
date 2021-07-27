### Component basic example
```javascript
import { BaseComponent } from '<relative path>/core/BaseComponent.js';

class MyComponent extends BaseComponent {
  constructor() {
    this.initLocalState({
      firstName: 'Unknown',
      secondName: 'Unknonw',

      'on.firstClicked': () => {
        this.state.firstName = 'John';
      },
      'on.secondClicked': () => {
        this.state.secondName = 'Snow';
      },
    });
  }
}

MyComponent.template = /*html*/ `
<div class="first common" loc="textContent: firstName; onclick: on.firstClicked"></div>
<div class="second common" loc="textContent: secondName; onclick: on.secondClicked"></div>
`;

MyComponent.reg('my-component');
```