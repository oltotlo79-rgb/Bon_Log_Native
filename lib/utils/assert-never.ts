/**
 * @module lib/utils/assert-never
 * 網羅チェック用ヘルパー。switch/if で全ケースを処理したことを型レベルで保証する。
 */

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
