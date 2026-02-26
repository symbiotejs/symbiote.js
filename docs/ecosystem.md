# Ecosystem

Here we provide a set of basic recommendations for the development environment setup. These are only recommendations — you can choose any approach that fits your experience or needs.

## Template syntax highlight

We use standard JavaScript template literals for component templates. To highlight HTML inside template literals, use IDE extensions that identify templates with tag functions or comments:
```js
let template = html`<div>MY_TEMPLATE</div>`;

let styles = css`
  div {
    color: #f00;
  }
`;
```

## Static analysis, type checking

We strongly recommend using TypeScript static analysis in all your projects.

We use JSDoc format and `*.d.ts` files for type declarations:
```js
/**
 * @param {Boolean} a
 * @param {Number} b
 * @param {String} c
 */
function myFunction(a, b, c) {
  ...
}
```

Check the details at [TypeScript JSDoc Supported Types](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html).

## Building and minification

[Esbuild](https://esbuild.github.io/) is our choice for code bundling and minification. Esbuild is a very performant and easy-to-configure solution that can prepare your JavaScript and CSS code for distribution.

### HTML and CSS template literals minification

Esbuild minifies JavaScript but doesn't touch the contents of template literals. Use [`esbuild-minify-templates`](https://github.com/ArnoldSmith86/esbuild-minify-templates) to minify `html` and `css` tagged templates at build time — it handles whitespace collapsing, comment removal, and preserves `<pre>` formatting:

```shell
npm install --save-dev esbuild-minify-templates
```

```js
import esbuild from 'esbuild';
import { minifyTemplates, writeFiles } from 'esbuild-minify-templates';

await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: 'dist/index.js',
  write: false, // required — writeFiles handles output
  plugins: [minifyTemplates({ taggedOnly: true }), writeFiles()],
});
```

The `taggedOnly: true` option ensures only tagged templates (`html\`...\``, `css\`...\``) are processed — plain untagged template literals are left untouched.

To exclude a specific template from minification:
```js
/*! minify-templates-ignore */
let preservedTemplate = html`
  <pre>  keep   this   spacing  </pre>
`;
```

## Code sharing

Network imports are a powerful platform feature that helps share common code parts across different functional endpoints in large applications. You don't need complex build workflows to share dependencies:
```js
import Symbiote, { html, css } from 'https://esm.run/@symbiotejs/symbiote';

export class MyAppComponent extends Symbiote {}

export { html, css }
```

## Local/dev server

Use any local server you like that can serve static files. Symbiote.js is agnostic and doesn't require any special tool for ESM module resolving or anything else.

You can use simple relative paths for your modules or [import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) for module path mapping. This feature is [supported in all modern browsers](https://caniuse.com/import-maps).

---

Next: [Migration 2.x → 3.x →](./migration-2x-to-3x.md)
