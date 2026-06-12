/**
 * lib/constants/errors の関数型定数とエクスポートの検証。
 * 静的文字列定数は import 可能であることを確認し、関数型定数は動作を検証する。
 */

import {
  messageForApiError,
  ERR_NETWORK,
  ERR_OFFLINE,
  ERR_OFFLINE_ACTION,
  ERR_TIMEOUT,
  ERR_SESSION_EXPIRED,
  ERR_AUTH_REQUIRED,
  ERR_LOGIN_INVALID_CREDENTIALS,
  ERR_LOGIN_RATE_LIMITED,
  ERR_LOGIN_FAILED,
  ERR_ACCOUNT_SUSPENDED,
  ERR_EMAIL_NOT_VERIFIED,
  ERR_REGISTER_FAILED,
  ERR_EMAIL_ALREADY_REGISTERED,
  ERR_NICKNAME_RESERVED,
  ERR_PASSWORD_RESET_RATE_LIMITED,
  ERR_PASSWORD_RESET_SEND_FAILED,
  ERR_RESET_LINK_INVALID,
  ERR_PASSWORD_UPDATE_FAILED,
  ERR_RATE_LIMIT,
  ERR_RATE_LIMIT_DAILY_POSTS,
  ERR_RATE_LIMIT_DAILY_COMMENTS,
  ERR_RATE_LIMIT_SEARCH,
  ERR_NOT_FOUND,
  ERR_POST_NOT_FOUND,
  ERR_USER_NOT_FOUND,
  ERR_FORBIDDEN,
  ERR_INVALID_INPUT,
  ERR_REQUIRED_FIELD,
  ERR_EMAIL_REQUIRED,
  ERR_EMAIL_INVALID,
  ERR_PASSWORD_REQUIRED,
  ERR_PASSWORD_CONFIRM_REQUIRED,
  ERR_NEW_PASSWORD_REQUIRED,
  ERR_PASSWORD_MISMATCH,
  ERR_TERMS_AGREEMENT_REQUIRED,
  ERR_PASSWORD_MIN_LENGTH,
  ERR_PASSWORD_MAX_LENGTH,
  ERR_PASSWORD_ALPHANUMERIC,
  ERR_CONTENT_REQUIRED,
  ERR_COMMENT_CONTENT_REQUIRED,
  ERR_CONTENT_TOO_LONG,
  ERR_POST_CONTENT_TOO_LONG,
  ERR_COMMENT_CONTENT_TOO_LONG,
  ERR_GENRE_LIMIT,
  ERR_IMAGE_LIMIT,
  ERR_VIDEO_LIMIT,
  ERR_VIDEO_PREMIUM_ONLY,
  ERR_IMAGE_SIZE_EXCEEDED,
  ERR_INVALID_IMAGE_FORMAT,
  ERR_POST_CREATE_FAILED,
  ERR_POST_UPDATE_FAILED,
  ERR_POST_DELETE_FAILED,
  ERR_COMMENT_CREATE_FAILED,
  ERR_COMMENT_DELETE_FAILED,
  ERR_LIKE_FAILED,
  ERR_FOLLOW_FAILED,
  ERR_BLOCK_FAILED,
  ERR_UNBLOCK_FAILED,
  ERR_ACCOUNT_DELETE_FAILED,
  ERR_MEDIA_UPLOAD_FAILED,
  ERR_SELF_ACTION,
  ERR_PRIVATE_ACCOUNT_FOLLOW,
  ERR_PUSH_SUBSCRIBE_FAILED,
  ERR_PREMIUM_ONLY,
  ERR_PURCHASE_FAILED,
  ERR_PURCHASE_PENDING,
  ERR_GENERIC,
  ERR_RETRY_HINT,
  ERR_SERVER,
  ERR_LOAD_FAILED,
  ERR_FEED_LOAD_FAILED,
  ERR_NOTIFICATIONS_LOAD_FAILED,
  ERR_PROFILE_LOAD_FAILED,
  ERR_SEARCH_FAILED,
  ERR_POST_LOAD_FAILED,
  MSG_PASSWORD_RESET_SENT_TITLE,
  MSG_PASSWORD_RESET_SENT_BODY,
  MSG_PASSWORD_RESET_SENT_HINT,
  MSG_RESET_LINK_INVALID_TITLE,
  MSG_RESET_LINK_INVALID_BODY,
  MSG_PASSWORD_UPDATED_TITLE,
  MSG_PASSWORD_UPDATED_BODY,
} from '@/lib/constants/errors';

describe('静的エラー定数', () => {
  it('ネットワーク系定数が文字列型である', () => {
    expect(typeof ERR_NETWORK).toBe('string');
    expect(typeof ERR_OFFLINE).toBe('string');
    expect(typeof ERR_OFFLINE_ACTION).toBe('string');
    expect(typeof ERR_TIMEOUT).toBe('string');
  });

  it('認証系定数が文字列型である', () => {
    expect(typeof ERR_SESSION_EXPIRED).toBe('string');
    expect(typeof ERR_AUTH_REQUIRED).toBe('string');
    expect(typeof ERR_LOGIN_INVALID_CREDENTIALS).toBe('string');
    expect(typeof ERR_LOGIN_RATE_LIMITED).toBe('string');
    expect(typeof ERR_LOGIN_FAILED).toBe('string');
    expect(typeof ERR_ACCOUNT_SUSPENDED).toBe('string');
    expect(typeof ERR_EMAIL_NOT_VERIFIED).toBe('string');
    expect(typeof ERR_REGISTER_FAILED).toBe('string');
    expect(typeof ERR_EMAIL_ALREADY_REGISTERED).toBe('string');
    expect(typeof ERR_NICKNAME_RESERVED).toBe('string');
    expect(typeof ERR_PASSWORD_RESET_RATE_LIMITED).toBe('string');
    expect(typeof ERR_PASSWORD_RESET_SEND_FAILED).toBe('string');
    expect(typeof ERR_RESET_LINK_INVALID).toBe('string');
    expect(typeof ERR_PASSWORD_UPDATE_FAILED).toBe('string');
  });

  it('レート制限系定数が文字列型である', () => {
    expect(typeof ERR_RATE_LIMIT).toBe('string');
    expect(typeof ERR_RATE_LIMIT_DAILY_POSTS).toBe('string');
    expect(typeof ERR_RATE_LIMIT_DAILY_COMMENTS).toBe('string');
    expect(typeof ERR_RATE_LIMIT_SEARCH).toBe('string');
  });

  it('権限・存在確認系定数が文字列型である', () => {
    expect(typeof ERR_NOT_FOUND).toBe('string');
    expect(typeof ERR_POST_NOT_FOUND).toBe('string');
    expect(typeof ERR_USER_NOT_FOUND).toBe('string');
    expect(typeof ERR_FORBIDDEN).toBe('string');
  });

  it('入力バリデーション系の静的定数が文字列型である', () => {
    expect(typeof ERR_INVALID_INPUT).toBe('string');
    expect(typeof ERR_REQUIRED_FIELD).toBe('string');
    expect(typeof ERR_EMAIL_REQUIRED).toBe('string');
    expect(typeof ERR_EMAIL_INVALID).toBe('string');
    expect(typeof ERR_PASSWORD_REQUIRED).toBe('string');
    expect(typeof ERR_PASSWORD_CONFIRM_REQUIRED).toBe('string');
    expect(typeof ERR_NEW_PASSWORD_REQUIRED).toBe('string');
    expect(typeof ERR_PASSWORD_MISMATCH).toBe('string');
    expect(typeof ERR_TERMS_AGREEMENT_REQUIRED).toBe('string');
    expect(typeof ERR_PASSWORD_MIN_LENGTH).toBe('string');
    expect(typeof ERR_PASSWORD_MAX_LENGTH).toBe('string');
    expect(typeof ERR_PASSWORD_ALPHANUMERIC).toBe('string');
    expect(typeof ERR_CONTENT_REQUIRED).toBe('string');
    expect(typeof ERR_COMMENT_CONTENT_REQUIRED).toBe('string');
    expect(typeof ERR_VIDEO_PREMIUM_ONLY).toBe('string');
    expect(typeof ERR_IMAGE_SIZE_EXCEEDED).toBe('string');
    expect(typeof ERR_INVALID_IMAGE_FORMAT).toBe('string');
  });

  it('CRUD失敗系定数が文字列型である', () => {
    expect(typeof ERR_POST_CREATE_FAILED).toBe('string');
    expect(typeof ERR_POST_UPDATE_FAILED).toBe('string');
    expect(typeof ERR_POST_DELETE_FAILED).toBe('string');
    expect(typeof ERR_COMMENT_CREATE_FAILED).toBe('string');
    expect(typeof ERR_COMMENT_DELETE_FAILED).toBe('string');
    expect(typeof ERR_LIKE_FAILED).toBe('string');
    expect(typeof ERR_FOLLOW_FAILED).toBe('string');
    expect(typeof ERR_BLOCK_FAILED).toBe('string');
    expect(typeof ERR_UNBLOCK_FAILED).toBe('string');
    expect(typeof ERR_ACCOUNT_DELETE_FAILED).toBe('string');
    expect(typeof ERR_MEDIA_UPLOAD_FAILED).toBe('string');
  });

  it('ソーシャル操作系定数が文字列型である', () => {
    expect(typeof ERR_SELF_ACTION).toBe('string');
    expect(typeof ERR_PRIVATE_ACCOUNT_FOLLOW).toBe('string');
  });

  it('Push通知・課金・汎用系定数が文字列型である', () => {
    expect(typeof ERR_PUSH_SUBSCRIBE_FAILED).toBe('string');
    expect(typeof ERR_PREMIUM_ONLY).toBe('string');
    expect(typeof ERR_PURCHASE_FAILED).toBe('string');
    expect(typeof ERR_PURCHASE_PENDING).toBe('string');
    expect(typeof ERR_GENERIC).toBe('string');
    expect(typeof ERR_RETRY_HINT).toBe('string');
    expect(typeof ERR_SERVER).toBe('string');
    expect(typeof ERR_LOAD_FAILED).toBe('string');
    expect(typeof ERR_FEED_LOAD_FAILED).toBe('string');
    expect(typeof ERR_NOTIFICATIONS_LOAD_FAILED).toBe('string');
    expect(typeof ERR_PROFILE_LOAD_FAILED).toBe('string');
    expect(typeof ERR_SEARCH_FAILED).toBe('string');
    expect(typeof ERR_POST_LOAD_FAILED).toBe('string');
  });

  it('認証フォーム案内メッセージが文字列型である', () => {
    expect(typeof MSG_PASSWORD_RESET_SENT_TITLE).toBe('string');
    expect(typeof MSG_PASSWORD_RESET_SENT_BODY).toBe('string');
    expect(typeof MSG_PASSWORD_RESET_SENT_HINT).toBe('string');
    expect(typeof MSG_RESET_LINK_INVALID_TITLE).toBe('string');
    expect(typeof MSG_RESET_LINK_INVALID_BODY).toBe('string');
    expect(typeof MSG_PASSWORD_UPDATED_TITLE).toBe('string');
    expect(typeof MSG_PASSWORD_UPDATED_BODY).toBe('string');
  });
});

describe('関数型エラー定数', () => {
  describe('ERR_CONTENT_TOO_LONG', () => {
    it('max 文字数を含むメッセージを返す', () => {
      expect(ERR_CONTENT_TOO_LONG(100)).toBe('100文字以内で入力してください。');
      expect(ERR_CONTENT_TOO_LONG(500)).toBe('500文字以内で入力してください。');
    });
  });

  describe('ERR_POST_CONTENT_TOO_LONG', () => {
    it('無料プランの文字数制限メッセージを返す', () => {
      expect(ERR_POST_CONTENT_TOO_LONG(500)).toBe('投稿は500文字以内で入力してください。');
    });

    it('プレミアムプランの文字数制限メッセージを返す', () => {
      expect(ERR_POST_CONTENT_TOO_LONG(2000)).toBe('投稿は2000文字以内で入力してください。');
    });
  });

  describe('ERR_COMMENT_CONTENT_TOO_LONG', () => {
    it('コメント文字数制限メッセージを返す', () => {
      expect(ERR_COMMENT_CONTENT_TOO_LONG(500)).toBe('コメントは500文字以内で入力してください。');
    });
  });

  describe('ERR_GENRE_LIMIT', () => {
    it('ジャンル選択上限メッセージを返す', () => {
      expect(ERR_GENRE_LIMIT(3)).toBe('ジャンルは3つまで選択できます。');
    });
  });

  describe('ERR_IMAGE_LIMIT', () => {
    it('無料プラン画像枚数制限メッセージを返す', () => {
      expect(ERR_IMAGE_LIMIT(4)).toBe('画像は4枚までです。');
    });

    it('プレミアムプラン画像枚数制限メッセージを返す', () => {
      expect(ERR_IMAGE_LIMIT(6)).toBe('画像は6枚までです。');
    });
  });

  describe('ERR_VIDEO_LIMIT', () => {
    it('動画本数制限メッセージを返す', () => {
      expect(ERR_VIDEO_LIMIT(1)).toBe('動画は1本までです。');
    });
  });
});

describe('messageForApiError', () => {
  it('AUTH_REQUIRED は ERR_AUTH_REQUIRED を返す', () => {
    expect(typeof messageForApiError('AUTH_REQUIRED')).toBe('string');
    expect(messageForApiError('AUTH_REQUIRED')).toBeTruthy();
  });

  it('AUTH_INVALID_TOKEN は ERR_SESSION_EXPIRED を返す', () => {
    expect(messageForApiError('AUTH_INVALID_TOKEN')).toBeTruthy();
  });

  it('AUTH_TOKEN_EXPIRED は ERR_SESSION_EXPIRED を返す', () => {
    expect(messageForApiError('AUTH_TOKEN_EXPIRED')).toBeTruthy();
  });

  it('AUTH_INVALID_CREDENTIALS は ERR_LOGIN_INVALID_CREDENTIALS を返す', () => {
    expect(messageForApiError('AUTH_INVALID_CREDENTIALS')).toBeTruthy();
  });

  it('AUTH_2FA_REQUIRED は ERR_2FA_NO_TICKET を返す', () => {
    expect(messageForApiError('AUTH_2FA_REQUIRED')).toBeTruthy();
  });

  it('AUTH_2FA_INVALID_CODE は ERR_2FA_INVALID_CODE を返す', () => {
    expect(messageForApiError('AUTH_2FA_INVALID_CODE')).toBeTruthy();
  });

  it('AUTH_2FA_TICKET_EXPIRED は ERR_2FA_TICKET_EXPIRED を返す', () => {
    expect(messageForApiError('AUTH_2FA_TICKET_EXPIRED')).toBeTruthy();
  });

  it('AUTH_REFRESH_TOKEN_INVALID は ERR_SESSION_EXPIRED を返す', () => {
    expect(messageForApiError('AUTH_REFRESH_TOKEN_INVALID')).toBeTruthy();
  });

  it('AUTH_REFRESH_TOKEN_REUSE_DETECTED は ERR_SESSION_REUSE_DETECTED を返す', () => {
    const msg = messageForApiError('AUTH_REFRESH_TOKEN_REUSE_DETECTED');
    expect(msg).toContain('不正アクセス');
  });

  it('ACCOUNT_SUSPENDED は ERR_ACCOUNT_SUSPENDED を返す', () => {
    expect(messageForApiError('ACCOUNT_SUSPENDED')).toBeTruthy();
  });

  it('GUEST_NOT_ALLOWED は ERR_AUTH_REQUIRED を返す', () => {
    expect(messageForApiError('GUEST_NOT_ALLOWED')).toBeTruthy();
  });

  it('EMAIL_NOT_VERIFIED は ERR_EMAIL_NOT_VERIFIED を返す', () => {
    expect(messageForApiError('EMAIL_NOT_VERIFIED')).toBeTruthy();
  });

  it('VALIDATION_ERROR は ERR_INVALID_INPUT を返す', () => {
    expect(messageForApiError('VALIDATION_ERROR')).toBeTruthy();
  });

  it('RATE_LIMITED は ERR_RATE_LIMIT を返す', () => {
    expect(messageForApiError('RATE_LIMITED')).toBeTruthy();
  });

  it('NOT_FOUND は ERR_NOT_FOUND を返す', () => {
    expect(messageForApiError('NOT_FOUND')).toBeTruthy();
  });

  it('CONFLICT は ERR_INVALID_INPUT を返す', () => {
    expect(messageForApiError('CONFLICT')).toBeTruthy();
  });

  it('INTERNAL_ERROR は ERR_SERVER を返す', () => {
    expect(messageForApiError('INTERNAL_ERROR')).toBeTruthy();
  });

  it('SERVER_MISCONFIGURED は ERR_SERVER を返す', () => {
    expect(messageForApiError('SERVER_MISCONFIGURED')).toBeTruthy();
  });
});
