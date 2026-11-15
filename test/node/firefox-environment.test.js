import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createFirefoxEnvironment } from '../helpers/firefox-environment.js';

test('macOS Firefox uses distinct temporary app-data directories and cleans only its own files', () => {
  let inherited = {
    EXISTING_SETTING: 'preserved',
  };
  let first = createFirefoxEnvironment('darwin', inherited);
  let second = createFirefoxEnvironment('darwin', inherited);
  let paths = [
    first.env.MOZ_APP_DATA,
    first.env.MOZ_LOCAL_APP_DATA,
    second.env.MOZ_APP_DATA,
    second.env.MOZ_LOCAL_APP_DATA,
  ];
  try {
    assert.equal(new Set(paths).size, paths.length);
    assert.ok(paths.every(existsSync));
    assert.equal(first.env.EXISTING_SETTING, 'preserved');
    assert.deepEqual(inherited, {
      EXISTING_SETTING: 'preserved',
    });
  } finally {
    first.dispose();
    second.dispose();
  }
  assert.ok(paths.every((path) => !existsSync(path)));
  first.dispose();
});

test('explicit Firefox app-data overrides remain intact while missing directories are isolated', () => {
  let override = mkdtempSync(join(tmpdir(), 'symbiote-firefox-override-'));
  let environment = createFirefoxEnvironment('darwin', {
    MOZ_APP_DATA: override,
  });
  try {
    assert.equal(environment.env.MOZ_APP_DATA, override);
    assert.notEqual(environment.env.MOZ_LOCAL_APP_DATA, override);
    environment.dispose();
    assert.ok(existsSync(override));
    assert.ok(!existsSync(environment.env.MOZ_LOCAL_APP_DATA));
    let explicit = createFirefoxEnvironment('darwin', {
      MOZ_APP_DATA: override,
      MOZ_LOCAL_APP_DATA: override,
    });
    explicit.dispose();
    assert.ok(existsSync(override));
  } finally {
    environment.dispose();
    rmSync(override, {
      recursive: true,
      force: true,
    });
  }
});

test('other platforms keep the browser environment unchanged', () => {
  for (let platform of [
    'linux',
    'win32',
  ]) {
    let environment = createFirefoxEnvironment(platform);
    assert.equal(environment.env, undefined);
    environment.dispose();
  }
});
