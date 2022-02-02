import esbuild from 'esbuild';

const buildSequence = [
  {
    in: './core/symbiote.js',
    out: './build/symbiote.min.js',
    minify: true,
  },
  {
    in: './core/symbiote.js',
    out: './build/symbiote.js',
    minify: false,
  },
  {
    in: './core/BaseComponent.js',
    out: './build/BaseComponent.min.js',
    minify: true,
  },
];

function build(buildItem) {
  esbuild.build({
    entryPoints: [buildItem.in],
    format: 'esm',
    bundle: true,
    minify: buildItem.minify,
    sourcemap: false,
    outfile: buildItem.out,
    target: 'es2019',
  });
}

buildSequence.forEach((buildItem) => {
  build(buildItem);
});
