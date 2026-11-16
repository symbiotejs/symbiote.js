import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

let root = fileURLToPath(new URL('../', import.meta.url));
let options = {
  absWorkingDir: root,
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  write: false,
  metafile: true,
};
let core = await build({
  ...options,
  entryPoints: [
    'core/index.js',
  ],
});
assert.ok(Object.keys(core.metafile.inputs).every((path) => !path.startsWith('html-app/')),
  'The core entry must not import HTML-app.');
assert.ok(Object.keys(core.metafile.inputs).every((path) => !path.startsWith('core/webmcp')),
  'The core entry must not import the optional WebMCP implementation or dictionary.');
let sharedCore = new Set(Object.keys(core.metafile.inputs).map((path) => resolve(root, path)));
/** @type {import('esbuild').Plugin} */
let sharedImports = {
  name: 'shared-host-core',
  setup(plugin) {
    plugin.onResolve({
      filter: /^\.\.?\//,
    }, (args) => {
      let path = resolve(args.resolveDir, args.path);
      if (sharedCore.has(path) || path === resolve(root, 'core/webmcp.js')) {
        return {
          path: args.path,
          external: true,
        };
      }
    });
  },
};
let incremental = await build({
  ...options,
  entryPoints: [
    'html-app/index.js',
  ],
  plugins: [
    sharedImports,
  ],
});
let foundation = await build({
  ...options,
  entryPoints: [
    'html-app/index.js',
  ],
  external: [
    '../core/*',
  ],
});
let router = await build({
  ...options,
  entryPoints: [
    'core/AppRouter.js',
  ],
  external: [
    './PubSub.js',
    './warn.js',
  ],
});
/** @param {{ outputFiles: import('esbuild').OutputFile[] }} result */
let measure = (result) => ({
  minified: result.outputFiles[0].contents.length,
  gzip: gzipSync(result.outputFiles[0].contents).length,
});
let bytes = measure(incremental);
console.log(JSON.stringify({
  incremental: bytes,
  foundationOnly: measure(foundation),
  sourceBytes: Object.values(incremental.metafile.inputs).reduce((total, input) => total + input.bytes, 0),
  nativeRouter: measure(router),
  coreIndependent: true,
  modules: Object.entries(incremental.metafile.inputs).map(([
    path,
    input,
  ]) => ({
    path,
    bytes: input.bytes,
    imports: input.imports.map((dependency) => dependency.path),
  })),
}, null, 2));
