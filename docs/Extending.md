## Extending Simbiote component with template processor

```javascript
const l10nData = {
  'text-key': 'localized text',
};

function l10nProcessor(/** @type {DocumentFragment} */ fr) {
  [...fr.querySelectorAll('[l10n]')].forEach((el) => {
    let l10nKey = el.getAttribute('l10n');
    el.textContent = l10nData[l10nKey] || '';
    el.removeAttribute('l10n');
  });
}

class ExtendedComponent extends BaseComponent {
  constructor() {
    super();
    this.addTemplateProcessor(l10nProcessor);
  }
}

class MyComponent extends ExtendedComponent {}
MyComponent.template = /*html*/ `<span l10n="text-key"></span>`;
```