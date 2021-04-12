import { UilibComponent } from '../../component/UilibComponent.js';

export class IconUi extends UilibComponent {
  constructor() {
    super();
    this.state = {
      path: '',
    };
  }

  readyCallback() {
    super.readyCallback();
    this.defineAccessor('path', (d) => {
      if (!d) {
        return;
      }
      this.state.path = d;
    });
  }
}
IconUi.observeAttributes(['path']);
IconUi.styles = {
  host: {
    display: 'inline-flex',
    '--size': '1.2em',
    height: 'var(--size)',
    width: 'var(--size)',
    minWidth: 'var(--size)',
  },
  svg: {
    height: '100%',
    width: '100%',
  },
  path: {
    fill: 'currentColor',
  },
};
IconUi.template = /*html*/ `
<svg
  css="svg"
  viewBox="0 0 24 24"
  xmlns="http://www.w3.org/2000/svg">
  <path css="path" set="@d: path"></path>
</svg>
`;
