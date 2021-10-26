## Custom element naming

One of the weak parts of Custom Elements standard - is a common namespace for all custom tags registered in current runtime. So, if you developing something like widget or library, there is some danger of names collisions in a host application. Let's concider what to do in that case.

The simplest way - is conventional naming. Use library-specific prefix or postfix for element names:
```html
<mylib-button>
  <mylib-icon></mylib-icon>
</mylib-button>
```

You can use automatic tag names for Symbiote templates:
```javascript
class Com1 extends BaseComponent {}
Com1.template = /*html*/ `<button>Component 1</button>`;

class Com2 extends BaseComponent {}
Com2.template = /*html*/ `<button>Component 2</button>`;

class MyApp extends BaseComponent {}
MyApp.template = /*html*/ `
  <${Com1.is}></${Com1.is}>
  <${Com2.is}></${Com2.is}>
`;

MyApp.reg('my-app');
```
