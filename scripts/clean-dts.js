#!/usr/bin/env node

/**
 * Post-process generated .d.ts files:
 * - Remove mangled static private members (__#private@#...)
 *   including their multi-line type bodies
 * - Clean up orphaned code fragments
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';

const TYPES_DIR = new URL('../types', import.meta.url).pathname;

/**
 * Remove a line and any following orphaned type body.
 * Handles cases like:
 *   static "__#private@#guards": ((to: {
 *       route: string;
 *       ...
 *   }) => void)[];
 */
function stripPrivateDeclarations(content) {
  let lines = content.split('\n');
  let result = [];
  let skipDepth = 0;
  let skipping = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.includes('"__#') && line.includes('@#')) {
      // Check if declaration ends on this line
      let opens = (line.match(/[{(]/g) || []).length;
      let closes = (line.match(/[})]/g) || []).length;
      skipDepth = opens - closes;
      skipping = skipDepth > 0;
      continue;
    }

    if (skipping) {
      let opens = (line.match(/[{(]/g) || []).length;
      let closes = (line.match(/[})]/g) || []).length;
      skipDepth += opens - closes;
      if (skipDepth <= 0) {
        skipping = false;
        skipDepth = 0;
      }
      continue;
    }

    // Remove leftover @internal JSDoc comments
    if (/^\s*\/\*\*\s*@internal\b/.test(line)) {
      // Skip until closing */
      while (i < lines.length && !lines[i].includes('*/')) {
        i++;
      }
      continue;
    }

    result.push(line);
  }

  // Clean up triple+ blank lines
  return result.join('\n').replace(/\n{3,}/g, '\n\n');
}

async function processDir(dir) {
  let entries = await readdir(dir, { withFileTypes: true });
  for (let entry of entries) {
    let fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await processDir(fullPath);
    } else if (extname(entry.name) === '.ts' && entry.name.endsWith('.d.ts')) {
      let content = await readFile(fullPath, 'utf-8');
      let cleaned = stripPrivateDeclarations(content);
      if (cleaned !== content) {
        await writeFile(fullPath, cleaned);
      }
    }
  }
}

processDir(TYPES_DIR);
