/**
 * @module lib/constants/regions
 * 日本の地方ブロック名の定数配列と型。
 * as const で型を固定し、RegionName はユニオン型として参照できる。
 * サーバー API /api/v1/shops の region パラメータと一致させる（prefectures.ts と同じ慣習）。
 */

export const REGIONS = [
  '北海道',
  '東北',
  '関東',
  '中部',
  '近畿',
  '中国',
  '四国',
  '九州・沖縄',
] as const;

/** 8地方ブロック名のユニオン型 */
export type RegionName = (typeof REGIONS)[number];
