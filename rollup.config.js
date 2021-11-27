import { terser } from 'rollup-plugin-terser';

export default [
  {
    input: 'core/symbiote.js',
    output: [
      {
        file: 'build/symbiote.min.js',
        compact: true,
        format: 'esm',
        plugins: [terser()],
      },
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
        file: 'build/symbiote.base.min.js',
        compact: true,
        format: 'esm',
        plugins: [terser()],
      },
      {
        file: 'build/symbiote.base.jsdoc.js',
        format: 'esm',
      },
    ],
  },
];
