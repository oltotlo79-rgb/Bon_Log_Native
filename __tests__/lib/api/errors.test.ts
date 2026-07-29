/**
 * ApiError クラスと型ガードのユニットテスト。
 */

import {
  ApiError,
  isApiError,
  isMobileApiErrorCode,
  isReuseDetected,
  isTermsAcceptanceRequired,
  getCurrentTermsVersion,
} from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';

describe('ApiError', () => {
  it('フィールドが正しく設定される', () => {
    const err = new ApiError({
      code: 'AUTH_TOKEN_EXPIRED',
      status: 401,
      message: 'Token expired',
    });
    expect(err.code).toBe('AUTH_TOKEN_EXPIRED');
    expect(err.status).toBe(401);
    expect(err.message).toBe('Token expired');
    expect(err.retryAfter).toBeUndefined();
    expect(err.name).toBe('ApiError');
  });

  it('retryAfter が設定される（429）', () => {
    const err = new ApiError({
      code: 'RATE_LIMITED',
      status: 429,
      message: 'Rate limited',
      retryAfter: 30,
    });
    expect(err.retryAfter).toBe(30);
  });

  it('Error を継承している', () => {
    const err = new ApiError({ code: 'NOT_FOUND', status: 404, message: 'Not found' });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('全 MobileApiErrorCode 値を受け付ける', () => {
    const codes: MobileApiErrorCode[] = [
      'AUTH_REQUIRED',
      'AUTH_INVALID_TOKEN',
      'AUTH_TOKEN_EXPIRED',
      'AUTH_INVALID_CREDENTIALS',
      'AUTH_2FA_REQUIRED',
      'AUTH_2FA_INVALID_CODE',
      'AUTH_2FA_TICKET_EXPIRED',
      'AUTH_REFRESH_TOKEN_INVALID',
      'AUTH_REFRESH_TOKEN_REUSE_DETECTED',
      'ACCOUNT_SUSPENDED',
      'GUEST_NOT_ALLOWED',
      'EMAIL_NOT_VERIFIED',
      'VALIDATION_ERROR',
      'RATE_LIMITED',
      'NOT_FOUND',
      'CONFLICT',
      'INTERNAL_ERROR',
      'SERVER_MISCONFIGURED',
    ];
    expect(codes).toHaveLength(18);
    codes.forEach((code) => {
      const err = new ApiError({ code, status: 400, message: code });
      expect(err.code).toBe(code);
    });
  });
});

describe('isApiError', () => {
  it('ApiError インスタンスで true を返す', () => {
    const err = new ApiError({ code: 'NOT_FOUND', status: 404, message: 'Not found' });
    expect(isApiError(err)).toBe(true);
  });

  it('通常の Error で false を返す', () => {
    expect(isApiError(new Error('plain'))).toBe(false);
  });

  it('null / undefined で false を返す', () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });

  it('プリミティブで false を返す', () => {
    expect(isApiError('string')).toBe(false);
    expect(isApiError(42)).toBe(false);
  });

  it('status フィールドを持つ非 ApiError オブジェクトで false を返す', () => {
    expect(isApiError({ status: 404, message: 'Not found' })).toBe(false);
  });
});

describe('isMobileApiErrorCode', () => {
  it('18 値すべてで true を返す', () => {
    const codes: MobileApiErrorCode[] = [
      'AUTH_REQUIRED',
      'AUTH_INVALID_TOKEN',
      'AUTH_TOKEN_EXPIRED',
      'AUTH_INVALID_CREDENTIALS',
      'AUTH_2FA_REQUIRED',
      'AUTH_2FA_INVALID_CODE',
      'AUTH_2FA_TICKET_EXPIRED',
      'AUTH_REFRESH_TOKEN_INVALID',
      'AUTH_REFRESH_TOKEN_REUSE_DETECTED',
      'ACCOUNT_SUSPENDED',
      'GUEST_NOT_ALLOWED',
      'EMAIL_NOT_VERIFIED',
      'VALIDATION_ERROR',
      'RATE_LIMITED',
      'NOT_FOUND',
      'CONFLICT',
      'INTERNAL_ERROR',
      'SERVER_MISCONFIGURED',
    ];
    expect(codes).toHaveLength(18);
    codes.forEach((code) => {
      expect(isMobileApiErrorCode(code)).toBe(true);
    });
  });

  it('スペック外の文字列で false を返す', () => {
    expect(isMobileApiErrorCode('UNKNOWN_CODE')).toBe(false);
    expect(isMobileApiErrorCode('')).toBe(false);
    expect(isMobileApiErrorCode('internal_error')).toBe(false);
  });
});

describe('isReuseDetected', () => {
  it('AUTH_REFRESH_TOKEN_REUSE_DETECTED で true を返す', () => {
    const err = new ApiError({
      code: 'AUTH_REFRESH_TOKEN_REUSE_DETECTED',
      status: 401,
      message: 'Reuse detected',
    });
    expect(isReuseDetected(err)).toBe(true);
  });

  it('他の 401 コードで false を返す', () => {
    const err = new ApiError({
      code: 'AUTH_REFRESH_TOKEN_INVALID',
      status: 401,
      message: 'Invalid',
    });
    expect(isReuseDetected(err)).toBe(false);
  });

  it('非 ApiError で false を返す', () => {
    expect(isReuseDetected(new Error('plain'))).toBe(false);
  });
});

describe('isTermsAcceptanceRequired', () => {
  it('TERMS_ACCEPTANCE_REQUIRED（403）で true を返す', () => {
    const err = new ApiError({
      code: 'TERMS_ACCEPTANCE_REQUIRED',
      status: 403,
      message: 'Terms acceptance required',
    });
    expect(isTermsAcceptanceRequired(err)).toBe(true);
  });

  it('同じ 403 ステータスでも別コードなら false を返す（ステータスではなくコードで判定する）', () => {
    const err = new ApiError({
      code: 'GUEST_NOT_ALLOWED',
      status: 403,
      message: 'Guest not allowed',
    });
    expect(isTermsAcceptanceRequired(err)).toBe(false);
  });

  it('別コード（401）で false を返す', () => {
    const err = new ApiError({
      code: 'AUTH_INVALID_TOKEN',
      status: 401,
      message: 'Invalid token',
    });
    expect(isTermsAcceptanceRequired(err)).toBe(false);
  });

  it('ApiError でない場合（Error）で false を返す', () => {
    expect(isTermsAcceptanceRequired(new Error('plain'))).toBe(false);
  });

  it('null / undefined で false を返す', () => {
    expect(isTermsAcceptanceRequired(null)).toBe(false);
    expect(isTermsAcceptanceRequired(undefined)).toBe(false);
  });

  it('文字列で false を返す', () => {
    expect(isTermsAcceptanceRequired('TERMS_ACCEPTANCE_REQUIRED')).toBe(false);
  });
});

describe('getCurrentTermsVersion', () => {
  it('TERMS_ACCEPTANCE_REQUIRED かつ details.currentTermsVersion が文字列 → その値を返す', () => {
    const err = new ApiError({
      code: 'TERMS_ACCEPTANCE_REQUIRED',
      status: 403,
      message: 'Terms acceptance required',
      details: { currentTermsVersion: '2026-07-28' },
    });
    expect(getCurrentTermsVersion(err)).toBe('2026-07-28');
  });

  it('details が無い（旧サーバー） → undefined を返す', () => {
    const err = new ApiError({
      code: 'TERMS_ACCEPTANCE_REQUIRED',
      status: 403,
      message: 'Terms acceptance required',
    });
    expect(getCurrentTermsVersion(err)).toBeUndefined();
  });

  it('details はあるが currentTermsVersion が無い → undefined を返す', () => {
    const err = new ApiError({
      code: 'TERMS_ACCEPTANCE_REQUIRED',
      status: 403,
      message: 'Terms acceptance required',
      details: { otherField: 'value' },
    });
    expect(getCurrentTermsVersion(err)).toBeUndefined();
  });

  it.each<[string, unknown]>([
    ['数値', 20260728],
    ['null', null],
    ['オブジェクト', { value: '2026-07-28' }],
  ])('currentTermsVersion が文字列でない（%s） → undefined を返す', (_label, value) => {
    const err = new ApiError({
      code: 'TERMS_ACCEPTANCE_REQUIRED',
      status: 403,
      message: 'Terms acceptance required',
      details: { currentTermsVersion: value },
    });
    expect(getCurrentTermsVersion(err)).toBeUndefined();
  });

  it('エラーコードが別（ACCOUNT_SUSPENDED 等の 403 含む） → undefined を返す', () => {
    const suspended = new ApiError({
      code: 'ACCOUNT_SUSPENDED',
      status: 403,
      message: 'Account suspended',
      details: { currentTermsVersion: '2026-07-28' },
    });
    expect(getCurrentTermsVersion(suspended)).toBeUndefined();

    const guestNotAllowed = new ApiError({
      code: 'GUEST_NOT_ALLOWED',
      status: 403,
      message: 'Guest not allowed',
      details: { currentTermsVersion: '2026-07-28' },
    });
    expect(getCurrentTermsVersion(guestNotAllowed)).toBeUndefined();
  });

  it('ApiError でない値（Error）→ undefined を返す', () => {
    expect(getCurrentTermsVersion(new Error('plain'))).toBeUndefined();
  });

  it('null / undefined / 文字列 → undefined を返す', () => {
    expect(getCurrentTermsVersion(null)).toBeUndefined();
    expect(getCurrentTermsVersion(undefined)).toBeUndefined();
    expect(getCurrentTermsVersion('TERMS_ACCEPTANCE_REQUIRED')).toBeUndefined();
  });
});
