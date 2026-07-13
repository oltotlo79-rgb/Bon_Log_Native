/**
 * @module lib/constants/bonsai-care-type
 * 盆栽手入れログの種別 (BonsaiCareType) の型ガード。
 * 値集合は生成スキーマの enum を単一の正とする（lib/api/errors.ts の isMobileApiErrorCode と同じ方式）。
 * lib/queries/bonsai-care-logs.ts の BONSAI_CARE_TYPE と同じ 8 値を指すが、
 * Foundation 層は Server State 層 (lib/queries/) に依存できないため生成スキーマから独立して定義する。
 */

import type { components } from '@/lib/api/generated/schema.d.ts';

type BonsaiCareType = components['schemas']['BonsaiCareType'];

const BONSAI_CARE_TYPES = [
  'pesticide',
  'solid_fertilizer',
  'liquid_fertilizer',
  'rotate',
  'shading',
  'muro_in',
  'muro_out',
  'other',
] as const satisfies readonly BonsaiCareType[];

/** 値が BonsaiCareType の許容値かを判定する型ガード。 */
export function isBonsaiCareType(value: unknown): value is BonsaiCareType {
  return typeof value === 'string' && BONSAI_CARE_TYPES.some((careType) => careType === value);
}
