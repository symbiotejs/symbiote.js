import { UilibComponent } from '../../component/UilibComponent.js';
import { ButtonUi } from './ButtonUi.js';
import { ICON_SET } from '../../icons/ICON_SET.js';

ButtonUi.defineTag('uc-button-ui');

// Custom constructor and tag name example (to avoid tag name collisions):
class Btn extends ButtonUi {}
Btn.defineTag('ui-btn');

class TestApp extends UilibComponent {
  constructor() {
    super();
    this.state = {
      'on.click': (e) => {
        console.log(e.currentTarget);
      },
    };
  }
}
TestApp.styles = {
  outer: {
    padding: '20px',
    display: 'inline-block',
    minWidth: '31vw',
    boxSizing: 'border-box',
    border: '1px solid #ccc',
  },
  styled_outer: {
    '--rgb-1': '100, 0, 100',
    '--border-radius': '0',
  },
  styled_outer_1: {
    '--rgb-2': '40, 40, 40',
    '--rgb-1': '255, 255, 255',
    '--border-radius': '6px',
    backgroundColor: 'rgb(var(--rgb-2))',
  },
  styled_outer_2: {
    '--rgb-2': '40, 40, 60',
    '--rgb-1': '40, 250, 250',
    '--tap-size': '3em',
    '--font-size': '20px',
    '--border-radius': '20px',
    display: 'block',
    backgroundColor: 'rgb(var(--rgb-2))',
    color: 'rgb(var(--rgb-1))',
  },
};
let buttonRefs = /*html*/ `
<uc-button-ui text="Default button" icon="${ICON_SET.star}" set="ariaClick: on.click"></uc-button-ui>
<div>&nbsp;</div>
<uc-button-ui outline text="Outline button" set="ariaClick: on.click"></uc-button-ui>
<div>&nbsp;</div>
<uc-button-ui shade text="Shade button" set="ariaClick: on.click"></uc-button-ui>
<div>&nbsp;</div>
<uc-button-ui outline shade  text="Combined styles" set="ariaClick: on.click"></uc-button-ui>
<div>&nbsp;</div>
<uc-button-ui light text="Light button" set="ariaClick: on.click"></uc-button-ui>
<div>&nbsp;</div>
<ui-btn text="Custom class" set="ariaClick: on.click"></ui-btn>
<div>&nbsp;</div>
<ui-btn reversed text="Reversed flow" icon="${ICON_SET.menu_drop}" set="ariaClick: on.click"></ui-btn>
<div>&nbsp;</div>
<ui-btn rounded icon="${ICON_SET.close}" text="Custom class" set="ariaClick: on.click"></ui-btn>
<ui-btn rounded shade icon="${ICON_SET.close}" text="Custom class" set="ariaClick: on.click"></ui-btn>
<ui-btn rounded outline icon="${ICON_SET.close}" text="Custom class" set="ariaClick: on.click"></ui-btn>
<div>&nbsp;</div>
<ui-btn square icon="${ICON_SET.close}" text="Custom class" set="ariaClick: on.click"></ui-btn>
<ui-btn square shade icon="${ICON_SET.close}" text="Custom class" set="ariaClick: on.click"></ui-btn>
<ui-btn square outline icon="${ICON_SET.close}" text="Custom class" set="ariaClick: on.click"></ui-btn>
`;
TestApp.template = /*html*/ `
<div css="outer">
  ${buttonRefs}
</div>
<div css="outer styled_outer">
  ${buttonRefs}
</div>
<div css="outer styled_outer_1">
  ${buttonRefs}
</div>
<div css="outer styled_outer_2">
  ${buttonRefs}
</div>
`;
TestApp.defineTag('test-app');
