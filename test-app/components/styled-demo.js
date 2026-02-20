import Symbiote, { html, css } from '../../core/index.js';

class StyledDemo extends Symbiote {
  init$ = {
    hue: 220,
    onChangeHue: () => {
      this.$.hue = (this.$.hue + 30) % 360;
    },
  };

  renderCallback() {
    this.sub('hue', (h) => {
      this.style.setProperty('--demo-hue', h);
    });
  }
}

StyledDemo.template = html`
  <div class="demo-box">
    <div class="demo-gradient"></div>
    <div class="demo-text">Hue: {{hue}}°</div>
    <button ${{onclick: 'onChangeHue'}}>Rotate Hue</button>
  </div>
`;

StyledDemo.rootStyles = css`
  styled-demo {
    display: block;

    & .demo-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    & .demo-gradient {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(
        135deg,
        hsl(var(--demo-hue, 220) 80% 60%),
        hsl(calc(var(--demo-hue, 220) + 60) 80% 50%)
      );
      transition: background 0.3s;
    }

    & .demo-text {
      font-family: var(--font-mono);
      font-size: 14px;
      color: var(--accent);
    }
  }
`;

StyledDemo.reg('styled-demo');
