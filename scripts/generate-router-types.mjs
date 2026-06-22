/**
 * @module scripts/generate-router-types
 * Expo Router の typed routes 型 (.expo/types/router.d.ts) を非対話で生成する。
 * .expo/ は .gitignore 済みで CI の `npm ci` 直後には存在しないため、
 * `tsc --noEmit` の前にこのスクリプトで生成しないと Href 型エラーで型チェックが落ちる。
 *
 * 専用の typegen コマンドは公開されていないため、CI モードで dev server を起動し、
 * 起動時に書き出される型ファイルを検知したらサーバーを終了する。
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
const TYPES_FILE = resolve(projectRoot, '.expo', 'types', 'router.d.ts');

const TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 1_000;

function killTree(child) {
  if (child.killed || child.pid === undefined) return Promise.resolve();
  if (process.platform === 'win32') {
    return new Promise((done) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.on('exit', () => done());
      killer.on('error', () => done());
    });
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
  return Promise.resolve();
}

async function main() {
  const server = spawn('npx expo start --no-dev --port 8123', {
    cwd: projectRoot,
    env: { ...process.env, CI: '1' },
    stdio: 'ignore',
    shell: true,
    detached: process.platform !== 'win32',
  });

  let failure = null;
  server.on('error', (err) => {
    failure = err;
  });

  const deadline = Date.now() + TIMEOUT_MS;
  try {
    while (Date.now() < deadline) {
      if (failure) throw failure;
      if (existsSync(TYPES_FILE)) {
        console.log(`Expo Router types generated: ${TYPES_FILE}`);
        return;
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    throw new Error(`Expo Router types were not generated within ${TIMEOUT_MS} ms`);
  } finally {
    await killTree(server);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
