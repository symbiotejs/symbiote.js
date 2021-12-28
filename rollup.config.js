export default [
  {
    input: 'core/symbiote.js',
    output: [
      {
        file: 'build/symbiote.jsdoc.js',
        format: 'esm',
      },
    ],
  },
  {
    input: 'core/BaseComponent.js',
    output: [
      {
        file: 'build/symbiote.base.jsdoc.js',
        format: 'esm',
      },
    ],
  },
];
