/**
 * lib/constants/errors の messageForPostBonsaiError のユニットテスト。
 * useCreatePostMutation / useUpdatePostMutation で bonsaiId を指定したリクエストの
 * NOT_FOUND を盆栽起因として解釈することと、それ以外は messageForApiError に
 * フォールバックすることを検証する。
 */

import {
  messageForPostBonsaiError,
  messageForApiError,
  ERR_BONSAI_NOT_FOUND,
} from '@/lib/constants/errors';

describe('messageForPostBonsaiError', () => {
  it('NOT_FOUND は ERR_BONSAI_NOT_FOUND を返す（messageForApiError の ERR_NOT_FOUND ではない）', () => {
    expect(messageForPostBonsaiError('NOT_FOUND')).toBe(ERR_BONSAI_NOT_FOUND);
    expect(messageForPostBonsaiError('NOT_FOUND')).not.toBe(messageForApiError('NOT_FOUND'));
  });

  it('VALIDATION_ERROR は messageForApiError にフォールバックする', () => {
    expect(messageForPostBonsaiError('VALIDATION_ERROR')).toBe(
      messageForApiError('VALIDATION_ERROR')
    );
  });

  it('RATE_LIMITED は messageForApiError にフォールバックする', () => {
    expect(messageForPostBonsaiError('RATE_LIMITED')).toBe(messageForApiError('RATE_LIMITED'));
  });

  it('AUTH_REQUIRED は messageForApiError にフォールバックする', () => {
    expect(messageForPostBonsaiError('AUTH_REQUIRED')).toBe(messageForApiError('AUTH_REQUIRED'));
  });

  it('INTERNAL_ERROR は messageForApiError にフォールバックする', () => {
    expect(messageForPostBonsaiError('INTERNAL_ERROR')).toBe(
      messageForApiError('INTERNAL_ERROR')
    );
  });

  it('未対応コード（CONFLICT）は messageForApiError にフォールバックする', () => {
    expect(messageForPostBonsaiError('CONFLICT')).toBe(messageForApiError('CONFLICT'));
  });
});
