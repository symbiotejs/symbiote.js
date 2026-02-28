#!/usr/bin/env node

/**
 * Auto-generate the "exports" field in package.json
 * by scanning core/ and utils/ for .js files and matching types.
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname, basename } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['core', 'utils'];

async function getModules(dir) {
  let fullDir = join(ROOT, dir);
  let entries = await readdir(fullDir);
  return entries
    .filter((f) => extname(f) === '.js')
    .map((f) => `./${dir}/${f}`);
}

async function run() {
  let exports = {
    '.': {
      types: './types/core/index.d.ts',
      default: './core/index.js',
    },
    './utils': {
      default: './utils/index.js',
    },
  };

  for (let dir of DIRS) {
    let modules = await getModules(dir);
    for (let mod of modules) {
      if (mod === './core/index.js' || mod === './utils/index.js') continue;
      let dtsPath = `./types/${dir}/${basename(mod, '.js')}.d.ts`;
      if (!existsSync(join(ROOT, dtsPath))) continue;
      exports[mod] = {
        types: dtsPath,
        default: mod,
      };
    }
  }

  let pkgPath = join(ROOT, 'package.json');
  let pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
  pkg.exports = exports;
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated exports: ${Object.keys(exports).length} entries`);
}

run();
