import { UilibComponent } from '../../component/UilibComponent.js';
import { applyElementStyles } from '../../../core/css_utils.js';
import { CSS_DEFAULTS } from '../../common-mdl/CSS_DEFAULTS.js';
import { ButtonUi } from '../../primitives/button/ButtonUi.js';

const ICONS = {
  close: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
};

export class ModalAl extends UilibComponent {
  constructor() {
    super();
    this.state = {
      caption: 'Window Caption',

      'on.close': () => {
        applyElementStyles(this, ModalAl.styles.host_not_active);
        window.setTimeout(() => {
          this.remove();
        }, 400);
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._contentEl = this.ref('content-el');
    this._winEl = this.ref('win-el');
    this.sub('*modalCaption', (val) => {
      this.state.caption = val;
    });
    applyElementStyles(this, ModalAl.styles.host_not_active);
    window.requestAnimationFrame(() => {
      applyElementStyles(this, ModalAl.styles.host_active);
    });
    this.onclick = (e) => {
      let path = e.composedPath();
      if (!path.includes(this._winEl)) {
        this.state['on.close']();
      }
    };
    this.addEventListener('scroll', (e) => {
      e.stopPropagation();
    });
  }

  /** @param {DocumentFragment | String} content */
  setContent(content) {
    if (content.constructor === DocumentFragment) {
      this._contentEl.innerHTML = '';
      this._contentEl.appendChild(content);
    } else if (content.constructor === String) {
      this._contentEl.innerHTML = content;
    } else {
      throw new Error('ModalAl: Wrong data type provided!');
    }
  }
}
ModalAl.styles = {
  ':host': {
    '--local-shade': `rgba(var(--rgb-1, ${CSS_DEFAULTS.RGB_1}), ${CSS_DEFAULTS.OPACITY_2})`,
    position: 'fixed',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--local-shade)',
    zIndex: 10000,
    transition: 'opacity .4s, transform .4s',
  },
  host_active: {
    opacity: 1,
    transform: 'translateY(0)',
  },
  host_not_active: {
    opacity: 0,
    transform: 'translateY(-10px)',
  },
  win: {
    backgroundColor: '#fff',
    color: '#000',
    minHeight: '100px',
    maxHeight: 'calc(100vh - 40px)',
    minWidth: '100px',
    maxWidth: 'calc(100vw - 40px)',
    borderRadius: `var(--border-radius, ${CSS_DEFAULTS.RADIUS}px)`,
    boxShadow: '0 2px 6px var(--local-shade)',
  },
  heading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    userSelect: 'none',
  },
  caption: {
    color: `rgb(var(--rgb-1, ${CSS_DEFAULTS.RGB_1}))`,
    paddingLeft: CSS_DEFAULTS.SIDE_GAP,
    paddingRight: CSS_DEFAULTS.SIDE_GAP,
    opacity: '0.6',
  },
};
ModalAl.template = /*html*/ `
<div ref="win-el" css="win">
  <div css="heading">
    <div css="caption" set="textContent: caption"></div>
    <${ButtonUi.is} rounded light icon="${ICONS.close}" set="ariaClick: on.close"></${ButtonUi.is}>
  </div>
  <div ref="content-el"><slot></slot></div>
</div>
`;
