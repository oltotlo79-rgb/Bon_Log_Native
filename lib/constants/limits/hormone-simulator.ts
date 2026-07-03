/**
 * @module lib/constants/limits/hormone-simulator
 * ホルモンバランスシミュレーターの計算定数。
 * Web 版 HormoneBalanceSimulator.tsx と同一の定義を維持する。
 * 値の正は Web 版の同名定数。モバイル側でのマジックナンバー化を防ぐために集約する。
 */

/**
 * シミュレーターのホルモンレベル最大値。
 * バーグラフの flex 比率の分母にも使用する。
 * Web 版 SIMULATOR_MAX_LEVEL と同値。
 */
export const SIMULATOR_MAX_LEVEL = 4;

/**
 * シミュレーターのホルモンレベル最小値。
 * calcPredicted でのクランプ下限。
 * Web 版 SIMULATOR_MIN_LEVEL と同値。
 */
export const SIMULATOR_MIN_LEVEL = 0;

/**
 * 技法の強度 → レベル変化量の対応表。
 * Web 版 SIMULATOR_MAGNITUDE_DELTA と同値。
 */
export const SIMULATOR_MAGNITUDE_DELTA: Readonly<Record<string, number>> = {
  strong: 2,
  moderate: 1,
  mild: 0.5,
} as const;

/**
 * 数値レベル → 活性レベルキーへの変換しきい値配列。
 * min 以上であれば対応するレベルを返す（降順でチェック）。
 * Web 版 SIMULATOR_LEVEL_THRESHOLDS と同値。
 */
export const SIMULATOR_LEVEL_THRESHOLDS: readonly {
  min: number;
  level: 'high' | 'moderate' | 'low' | 'minimal';
}[] = [
  { min: 2.5, level: 'high' },
  { min: 1.5, level: 'moderate' },
  { min: 0.5, level: 'low' },
  { min: 0, level: 'minimal' },
] as const;

/**
 * 活性レベルの数値対応（バッジの numericValue として使用）。
 * Web 版 HORMONE_LEVEL_CONFIG の numericValue と同値。
 */
export const SIMULATOR_LEVEL_NUMERIC: Readonly<Record<'high' | 'moderate' | 'low' | 'minimal', number>> = {
  high: 3,
  moderate: 2,
  low: 1,
  minimal: 0,
} as const;
