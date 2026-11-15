import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Keep macOS test launches outside the user's protected Firefox app-data folders.
 * https://bugzilla.mozilla.org/show_bug.cgi?id=2060476
 * @param {string} [platform]
 * @param {NodeJS.ProcessEnv} [inherited]
 */
export function createFirefoxEnvironment(platform = process.platform, inherited = process.env) {
  let directories = [];
  let env;
  if (platform === 'darwin') {
    env = {
      ...inherited,
    };
    for (let key of [
      'MOZ_APP_DATA',
      'MOZ_LOCAL_APP_DATA',
    ]) {
      if (!env[key]) {
        let directory = mkdtempSync(join(tmpdir(), 'symbiote-firefox-'));
        directories.push(directory);
        env[key] = directory;
      }
    }
  }
  return {
    env,
    dispose() {
      for (let directory of directories) {
        rmSync(directory, {
          recursive: true,
          force: true,
        });
      }
    },
  };
}
