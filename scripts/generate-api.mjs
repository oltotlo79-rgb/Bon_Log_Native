/**
 * @module scripts/generate-api
 * OpenAPI スペックから lib/api/generated/schema.d.ts を生成するスクリプト。
 * 優先順: OPENAPI_SPEC_PATH 環境変数 → cfw 正本 → スナップショット(fallback)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

const PRIMARY_SPEC = resolve(projectRoot, '..', 'Bon_Log_cfw', 'openapi', 'openapi.json');
const FALLBACK_SPEC = resolve(projectRoot, 'docs', 'plans', 'openapi-v1.2.0-snapshot.json');
const OUTPUT = join(projectRoot, 'lib', 'api', 'generated', 'schema.d.ts');

function resolveSpecPath() {
  if (process.env.OPENAPI_SPEC_PATH) {
    const envPath = resolve(process.env.OPENAPI_SPEC_PATH);
    if (!existsSync(envPath)) {
      console.error(`OPENAPI_SPEC_PATH が指定されましたが存在しません: ${envPath}`);
      process.exit(1);
    }
    return envPath;
  }
  if (existsSync(PRIMARY_SPEC)) {
    return PRIMARY_SPEC;
  }
  console.warn(`cfw 正本が見つかりません (${PRIMARY_SPEC})。スナップショットにフォールバックします。`);
  if (!existsSync(FALLBACK_SPEC)) {
    console.error(`フォールバックスペックも見つかりません: ${FALLBACK_SPEC}`);
    process.exit(1);
  }
  return FALLBACK_SPEC;
}

const specPath = resolveSpecPath();
console.log(`スペック: ${specPath}`);
console.log(`出力: ${OUTPUT}`);

execSync(`npx openapi-typescript "${specPath}" -o "${OUTPUT}"`, {
  stdio: 'inherit',
  cwd: projectRoot,
});

console.log('生成完了: lib/api/generated/schema.d.ts');
