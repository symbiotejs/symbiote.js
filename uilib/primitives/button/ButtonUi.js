import { UilibComponent } from '../../component/UilibComponent.js';
import { applyElementStyles } from '../../../core/css_utils.js';
import { CSS_DEFAULTS } from '../../common-mdl/CSS_DEFAULTS.js';
import { IconUi } from '../icon/IconUi.js';

export class ButtonUi extends UilibComponent {
  constructor() {
    super();
    this.state = {
      text: '',
      icon: '',
      'css.icon': 'icon hide_icon',
    };
  }

  readyCallback() {
    super.readyCallback();
    this.setAttribute('role', 'button');
    if (this.tabIndex === -1) {
      this.tabIndex = 0;
    }
    this._onClick = () => {
      this.blur();
    };
    this.addEventListener('click', this._onClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) {
      return;
    }
    let logicParams = {
      text: (txt) => {
        this.state.text = txt;
      },
      icon: (icon) => {
        if (icon) {
          this.state.icon = icon;
          this.state['css.icon'] = 'icon show_icon';
        } else {
          this.state['css.icon'] = 'icon show_icon';
        }
      },
    };
    if (logicParams[name]) {
      logicParams[name](newVal);
    } else if (this.hasAttribute(name) && (this.getAttribute(name) === '' || this.getAttribute(name) === 'true')) {
      applyElementStyles(this, ButtonUi.styles[name]);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
  }
}

ButtonUi.observeAttributes(['disabled', 'outline', 'shade', 'light', 'rounded', 'square', 'text', 'icon', 'reversed', 'color-code']);
ButtonUi.styles = {
  ':host': {
    '--color-1': `rgb(var(--rgb-1, ${CSS_DEFAULTS.RGB_1}))`,
    '--color-1-opacity': `rgba(var(--rgb-1, ${CSS_DEFAULTS.RGB_1}), ${CSS_DEFAULTS.OPACITY_1})`,
    '--color-1-opacity-2': `rgba(var(--rgb-1, ${CSS_DEFAULTS.RGB_1}), ${CSS_DEFAULTS.OPACITY_2})`,
    '--color-2': `rgb(var(--rgb-2, ${CSS_DEFAULTS.RGB_2}))`,
    '-webkit-tap-highlight-color': 'transparent',
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'var(--color-1, currentColor)',
    color: 'var(--color-2, #fff)',
    height: `var(--tap-size, ${CSS_DEFAULTS.TAP_SIZE}px)`,
    minHeight: `var(--tap-size, ${CSS_DEFAULTS.TAP_SIZE}px)`,
    minWidth: `var(--tap-size, ${CSS_DEFAULTS.TAP_SIZE}px)`,
    padding: CSS_DEFAULTS.SIDE_GAP,
    fontSize: `var(--font-size, ${CSS_DEFAULTS.FONT_SIZE}px)`,
    borderRadius: `var(--border-radius, ${CSS_DEFAULTS.RADIUS}px)`,
    boxSizing: 'border-box',
    cursor: 'pointer',
    outline: 'none',
    'focus:blur': {
      outline: '2px solid var(--color-1-opacity)',
      outlineOffset: '1px',
    },
  },
  text_el: {
    display: 'var(--display-text)',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  outline: {
    border: '1px solid var(--color-1-opacity)',
    backgroundColor: 'var(--color-2)',
    color: 'var(--color-1)',
    transition: 'border 0.2s',
    'mouseover:mouseout': {
      border: '1px solid var(--color-1)',
    },
  },
  shade: {
    backgroundColor: 'var(--color-1-opacity-2)',
    color: 'var(--color-1)',
  },
  light: {
    backgroundColor: 'rgba(0, 0, 0, 0)',
    color: 'var(--color-1)',
    transition: 'opacity 0.2s',
    opacity: '0.8',
    'mouseover:mouseout': {
      opacity: '1',
    },
  },
  reversed: {
    flexFlow: 'row-reverse',
    paddingRight: '0',
    '--icon-left-margin': '0.5em',
  },
  rounded: {
    '--display-text': 'none',
    '--icon-right-margin': '0',
    padding: '0',
    borderRadius: '100%',
    justifyContent: 'center',
  },
  square: {
    '--display-text': 'none',
    '--icon-right-margin': '0',
    padding: '0',
    justifyContent: 'center',
  },
  icon: IconUi.styles.host,
  show_icon: {
    display: 'inline-flex',
    marginRight: 'var(--icon-right-margin, 0.5em)',
    marginLeft: 'var(--icon-left-margin, 0)',
  },
  hide_icon: {
    display: 'none',
  },
};

ButtonUi.template = /*html*/ `
<${IconUi.is} css="icon" set="path: icon; css: css.icon"></${IconUi.is}>
<span css="text_el" set="textContent: text"></span>
`;
