/**
 * lib/constants/errors の messageForChangePasswordError / messageForEmailChangeRequestError の
 * ユニットテスト。各 API エラーコードが正しい文言に対応付けられることと、
 * 未知コードのフォールバックを検証する。
 */

import {
  messageForChangePasswordError,
  messageForEmailChangeRequestError,
  ERR_PASSWORD_CHANGE_INVALID_CURRENT,
  ERR_PASSWORD_CHANGE_WEAK,
  ERR_PASSWORD_CHANGE_OAUTH_ONLY,
  ERR_EMAIL_CHANGE_INVALID_PASSWORD,
  ERR_EMAIL_CHANGE_OAUTH_ONLY,
  ERR_RATE_LIMIT,
  ERR_GENERIC,
} from '@/lib/constants/errors';

describe('messageForChangePasswordError', () => {
  it('AUTH_INVALID_CREDENTIALS は ERR_PASSWORD_CHANGE_INVALID_CURRENT を返す', () => {
    expect(messageForChangePasswordError('AUTH_INVALID_CREDENTIALS')).toBe(
      ERR_PASSWORD_CHANGE_INVALID_CURRENT
    );
  });

  it('VALIDATION_ERROR は ERR_PASSWORD_CHANGE_WEAK を返す', () => {
    expect(messageForChangePasswordError('VALIDATION_ERROR')).toBe(ERR_PASSWORD_CHANGE_WEAK);
  });

  it('CONFLICT は ERR_PASSWORD_CHANGE_OAUTH_ONLY を返す', () => {
    expect(messageForChangePasswordError('CONFLICT')).toBe(ERR_PASSWORD_CHANGE_OAUTH_ONLY);
  });

  it('RATE_LIMITED は ERR_RATE_LIMIT を返す', () => {
    expect(messageForChangePasswordError('RATE_LIMITED')).toBe(ERR_RATE_LIMIT);
  });

  it('未対応コード（NOT_FOUND）は ERR_GENERIC にフォールバックする', () => {
    expect(messageForChangePasswordError('NOT_FOUND')).toBe(ERR_GENERIC);
  });

  it('未対応コード（INTERNAL_ERROR）は ERR_GENERIC にフォールバックする', () => {
    expect(messageForChangePasswordError('INTERNAL_ERROR')).toBe(ERR_GENERIC);
  });
});

describe('messageForEmailChangeRequestError', () => {
  it('AUTH_INVALID_CREDENTIALS は ERR_EMAIL_CHANGE_INVALID_PASSWORD を返す', () => {
    expect(messageForEmailChangeRequestError('AUTH_INVALID_CREDENTIALS')).toBe(
      ERR_EMAIL_CHANGE_INVALID_PASSWORD
    );
  });

  it('CONFLICT は ERR_EMAIL_CHANGE_OAUTH_ONLY を返す', () => {
    expect(messageForEmailChangeRequestError('CONFLICT')).toBe(ERR_EMAIL_CHANGE_OAUTH_ONLY);
  });

  it('RATE_LIMITED は ERR_RATE_LIMIT を返す', () => {
    expect(messageForEmailChangeRequestError('RATE_LIMITED')).toBe(ERR_RATE_LIMIT);
  });

  it('未対応コード（NOT_FOUND）は ERR_GENERIC にフォールバックする', () => {
    expect(messageForEmailChangeRequestError('NOT_FOUND')).toBe(ERR_GENERIC);
  });

  it('未対応コード（VALIDATION_ERROR）は ERR_GENERIC にフォールバックする（列挙攻撃対策で常に200のため考慮不要）', () => {
    expect(messageForEmailChangeRequestError('VALIDATION_ERROR')).toBe(ERR_GENERIC);
  });
});
