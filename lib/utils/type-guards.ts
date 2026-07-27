/**
 * @module lib/utils/type-guards
 * 汎用の型ガード関数。
 */

/** 値がプレーンオブジェクト（配列・null を除く object）かを判定する。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
