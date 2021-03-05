import { BaseComponent } from '../../core/BaseComponent.js';
import { channelsExt } from '../../extensions/channelsExt.js';

let ChannelComponent = channelsExt(BaseComponent);
class FirstChannel extends ChannelComponent {
  connectedCallback() {
    super.connectedCallback();
    this.contentEditable = 'true';
    this.oninput = () => {
      this.broadcast({
        html: this.innerHTML,
      });
    };
  }
}
window.customElements.define('first-ch', FirstChannel);

class SecondChannel extends ChannelComponent {
  constructor() {
    super();
    this.state = {
      html: '',
    };
  }
  readyCallback() {
    super.readyCallback();
    this.defineAccessor('html', (html) => {
      if (html === undefined) {
        return;
      }
      this.state.html = html;
    });
  }
}
SecondChannel.observeAttributes(['test']);
SecondChannel.template = /*html*/ `
<div set="innerHTML: html"></div>
`;
window.customElements.define('second-ch', SecondChannel);

window.addEventListener('subsribtion_test-channel', (/** @type {CustomEvent} */ e) => {
  console.log(e.detail);
});

window.setInterval(() => {
  window.dispatchEvent(
    new CustomEvent('broadcast_test-channel', {
      detail: {
        setProps: {
          html: '',
        },
      },
    })
  );
}, 3000);
