import esbuild from 'esbuild';

const buildSequence = [
  {
    in: './core/symbiote.js',
    out: './build/symbiote.min.js',
  },
  {
    in: './core/BaseComponent.js',
    out: './build/symbiote.base.min.js',
  },
];

function build(buildItem) {
  esbuild.build({
    entryPoints: [buildItem.in],
    format: 'esm',
    bundle: true,
    minify: true,
    sourcemap: false,
    outfile: buildItem.out,
    target: 'es2019',
  });
}

buildSequence.forEach((buildItem) => {
  build(buildItem);
});
