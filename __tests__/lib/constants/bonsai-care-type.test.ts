/**
 * @module __tests__/lib/constants/bonsai-care-type
 * isBonsaiCareType 型ガードのユニットテスト。
 * lib/queries/bonsai-care-logs.ts の BONSAI_CARE_TYPE 8 値すべてで true、
 * スペック外の値・非文字列値で false を返すことを検証する。
 */

import { isBonsaiCareType } from '@/lib/constants/bonsai-care-type';
import { BONSAI_CARE_TYPE } from '@/lib/queries/bonsai-care-logs';

describe('isBonsaiCareType', () => {
  it('BONSAI_CARE_TYPE の 8 値すべてで true を返す', () => {
    const values = Object.values(BONSAI_CARE_TYPE);
    expect(values).toHaveLength(8);
    values.forEach((value) => {
      expect(isBonsaiCareType(value)).toBe(true);
    });
  });

  it('個別の値でも true を返す（pesticide / solid_fertilizer / liquid_fertilizer / rotate / shading / muro_in / muro_out / other）', () => {
    expect(isBonsaiCareType('pesticide')).toBe(true);
    expect(isBonsaiCareType('solid_fertilizer')).toBe(true);
    expect(isBonsaiCareType('liquid_fertilizer')).toBe(true);
    expect(isBonsaiCareType('rotate')).toBe(true);
    expect(isBonsaiCareType('shading')).toBe(true);
    expect(isBonsaiCareType('muro_in')).toBe(true);
    expect(isBonsaiCareType('muro_out')).toBe(true);
    expect(isBonsaiCareType('other')).toBe(true);
  });

  it('スペック外の文字列で false を返す', () => {
    expect(isBonsaiCareType('unknown_type')).toBe(false);
    expect(isBonsaiCareType('')).toBe(false);
    expect(isBonsaiCareType('PESTICIDE')).toBe(false);
  });

  it('文字列以外の値で false を返す', () => {
    expect(isBonsaiCareType(undefined)).toBe(false);
    expect(isBonsaiCareType(null)).toBe(false);
    expect(isBonsaiCareType(123)).toBe(false);
    expect(isBonsaiCareType({})).toBe(false);
    expect(isBonsaiCareType(['pesticide'])).toBe(false);
  });
});
