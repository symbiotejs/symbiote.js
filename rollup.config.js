import { terser } from 'rollup-plugin-terser';

export default [
  {
    input: 'core/BaseComponent.js',
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
];
