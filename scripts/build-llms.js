#!/usr/bin/env node
// Generates llms.txt (index) and llms-full.txt (merged docs) from docs/*.md

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Files in docs/ to exclude from the merged output
const EXCLUDE_DOCS = new Set([
  'README.md',             // index only, no content
  'ecosystem.md',          // IDE/tooling setup, not API
  'llms-index.md',         // llms.txt template — not merged into llms-full.txt
]);

function getDocFiles() {
  const docsDir = resolve(ROOT, 'docs');
  const docFiles = readdirSync(docsDir)
    .filter((f) => f.endsWith('.md') && !EXCLUDE_DOCS.has(f))
    .sort()
    .map((f) => `docs/${f}`);
  return ['README.md', ...docFiles];
}

// Strip trailing navigation footer added by docs (--- \n\n Next: ...)
function stripNavFooter(content) {
  return content.replace(/\n---\n\nNext:.*$/s, '').trimEnd();
}

// Strip README badge lines (shield.io image badges at the top)
function stripBadges(content) {
  return content.replace(/^(\[?!\[.*?\]\(.*?\)\]?(?:\(.*?\))?\n)+/, '').trimStart();
}

function buildFull() {
  const parts = [];
  for (const rel of getDocFiles()) {
    let content = readFileSync(resolve(ROOT, rel), 'utf8');
    content = stripNavFooter(content);
    if (rel === 'README.md') content = stripBadges(content);
    parts.push(content);
  }
  return parts.join('\n\n---\n\n');
}

const full = buildFull();
const llmsIndex = readFileSync(resolve(ROOT, 'docs/llms-index.md'), 'utf8');

writeFileSync(resolve(ROOT, 'llms-full.txt'), full, 'utf8');
writeFileSync(resolve(ROOT, 'llms.txt'), llmsIndex, 'utf8');

const lines = full.split('\n').length;
const kb = (Buffer.byteLength(full, 'utf8') / 1024).toFixed(1);
console.log(`✅ llms-full.txt  ${lines} lines, ${kb} KB`);
console.log(`🥳 llms.txt ready`);
