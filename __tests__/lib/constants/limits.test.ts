/**
 * lib/constants/limits 各モジュールの定数値・エクスポートの検証。
 * サーバー側の仕様（CLAUDE.md 機能制約）と照合して正しい値が定義されていることを確認する。
 */

import {
  MAX_POST_CONTENT_FREE,
  MAX_POST_CONTENT_PREMIUM,
  MAX_DAILY_POSTS_FREE,
  MAX_DAILY_POSTS_PREMIUM,
  MAX_GENRES_PER_POST,
  MAX_COMMENT_LENGTH,
  DAILY_COMMENT_LIMIT,
  MAX_SEARCH_QUERY_LENGTH,
  GENRE_CATEGORY_ORDER,
} from '@/lib/constants/limits/post';

import {
  MAX_NICKNAME_LENGTH,
  MAX_BIO_LENGTH,
  MAX_LOCATION_LENGTH,
} from '@/lib/constants/limits/auth';

import {
  MAX_IMAGE_SIZE_MB,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_POST_IMAGES_FREE,
  MAX_POST_IMAGES_PREMIUM,
  MAX_POST_VIDEOS_FREE,
  MAX_POST_VIDEOS_PREMIUM,
  MAX_COMMENT_IMAGES,
  MAX_COMMENT_VIDEOS_FREE,
  MAX_COMMENT_VIDEOS_PREMIUM,
  MAX_IMAGE_SIZE_BEFORE_COMPRESSION,
  SKIP_COMPRESSION_THRESHOLD,
  MAX_IMAGE_DIMENSION,
  DEFAULT_IMAGE_QUALITY,
  AVATAR_COMPRESSION_MAX_SIZE_MB,
  AVATAR_MAX_DIMENSION,
  HEADER_COMPRESSION_MAX_SIZE_MB,
  HEADER_MAX_DIMENSION,
  ALLOWED_PROFILE_IMAGE_TYPES,
} from '@/lib/constants/limits/media';

import {
  FEED_PAGE_SIZE,
  NOTIFICATIONS_PAGE_SIZE,
  COMMENTS_PAGE_SIZE,
  USERS_PAGE_SIZE,
  RECOMMENDED_USERS_LIMIT,
  TRENDING_HASHTAGS_LIMIT,
  MAX_PAGE_LIMIT,
} from '@/lib/constants/limits/pagination';

import * as limitsIndex from '@/lib/constants/limits';

describe('limits/post — 投稿制限値', () => {
  it('無料プランの投稿文字数上限は 500', () => {
    expect(MAX_POST_CONTENT_FREE).toBe(500);
  });

  it('プレミアムプランの投稿文字数上限は 2000', () => {
    expect(MAX_POST_CONTENT_PREMIUM).toBe(2000);
  });

  it('プレミアム上限は無料上限より大きい', () => {
    expect(MAX_POST_CONTENT_PREMIUM).toBeGreaterThan(MAX_POST_CONTENT_FREE);
  });

  it('1日の最大投稿数（無料）は 20', () => {
    expect(MAX_DAILY_POSTS_FREE).toBe(20);
  });

  it('1日の最大投稿数（プレミアム）は無料より多い', () => {
    expect(MAX_DAILY_POSTS_PREMIUM).toBeGreaterThan(MAX_DAILY_POSTS_FREE);
  });

  it('投稿あたりの最大ジャンル数は 3', () => {
    expect(MAX_GENRES_PER_POST).toBe(3);
  });

  it('コメントの最大文字数は正の整数', () => {
    expect(MAX_COMMENT_LENGTH).toBeGreaterThan(0);
  });

  it('1日のコメント上限は正の整数', () => {
    expect(DAILY_COMMENT_LIMIT).toBeGreaterThan(0);
  });

  it('ニックネーム・自己紹介・居住地域・検索クエリの上限が定義されている', () => {
    expect(MAX_NICKNAME_LENGTH).toBeGreaterThan(0);
    expect(MAX_BIO_LENGTH).toBeGreaterThan(0);
    expect(MAX_LOCATION_LENGTH).toBeGreaterThan(0);
    expect(MAX_SEARCH_QUERY_LENGTH).toBeGreaterThan(0);
  });

  describe('GENRE_CATEGORY_ORDER', () => {
    it('6カテゴリが定義されている', () => {
      expect(GENRE_CATEGORY_ORDER).toHaveLength(6);
    });

    it('仕様書記載の全カテゴリが含まれる（CLAUDE.md 機能制約）', () => {
      expect(GENRE_CATEGORY_ORDER).toContain('松柏類');
      expect(GENRE_CATEGORY_ORDER).toContain('雑木類');
      expect(GENRE_CATEGORY_ORDER).toContain('草もの');
      expect(GENRE_CATEGORY_ORDER).toContain('用品・道具');
      expect(GENRE_CATEGORY_ORDER).toContain('施設・イベント');
      expect(GENRE_CATEGORY_ORDER).toContain('その他');
    });
  });
});

describe('limits/media — メディア制限値', () => {
  it('画像最大サイズは 4MB', () => {
    expect(MAX_IMAGE_SIZE_MB).toBe(4);
  });

  it('MAX_IMAGE_SIZE は MAX_IMAGE_SIZE_MB の byte 換算と一致する', () => {
    expect(MAX_IMAGE_SIZE).toBe(MAX_IMAGE_SIZE_MB * 1024 * 1024);
  });

  it('MAX_VIDEO_SIZE が正の値である', () => {
    expect(MAX_VIDEO_SIZE).toBeGreaterThan(0);
  });

  it('無料プランの投稿画像枚数は 4', () => {
    expect(MAX_POST_IMAGES_FREE).toBe(4);
  });

  it('プレミアムプランの投稿画像枚数は 6', () => {
    expect(MAX_POST_IMAGES_PREMIUM).toBe(6);
  });

  it('プレミアム画像枚数は無料より多い', () => {
    expect(MAX_POST_IMAGES_PREMIUM).toBeGreaterThan(MAX_POST_IMAGES_FREE);
  });

  it('無料プランの投稿動画は 0（プレミアム限定）', () => {
    expect(MAX_POST_VIDEOS_FREE).toBe(0);
  });

  it('プレミアムプランの投稿動画は 1', () => {
    expect(MAX_POST_VIDEOS_PREMIUM).toBe(1);
  });

  it('コメント添付画像は 2 枚まで', () => {
    expect(MAX_COMMENT_IMAGES).toBe(2);
  });

  it('無料プランのコメント動画は 0（プレミアム限定）', () => {
    expect(MAX_COMMENT_VIDEOS_FREE).toBe(0);
  });

  it('プレミアムプランのコメント動画は 1', () => {
    expect(MAX_COMMENT_VIDEOS_PREMIUM).toBe(1);
  });

  it('圧縮閾値は MAX_IMAGE_SIZE より小さい（圧縮が意味を持つ範囲）', () => {
    expect(SKIP_COMPRESSION_THRESHOLD).toBeLessThan(MAX_IMAGE_SIZE);
  });

  it('圧縮前の最大サイズは MAX_IMAGE_SIZE より大きい（圧縮対象になる）', () => {
    expect(MAX_IMAGE_SIZE_BEFORE_COMPRESSION).toBeGreaterThan(MAX_IMAGE_SIZE);
  });

  it('MAX_IMAGE_DIMENSION が正の値である', () => {
    expect(MAX_IMAGE_DIMENSION).toBeGreaterThan(0);
  });

  it('DEFAULT_IMAGE_QUALITY は 0 より大きく 1 以下', () => {
    expect(DEFAULT_IMAGE_QUALITY).toBeGreaterThan(0);
    expect(DEFAULT_IMAGE_QUALITY).toBeLessThanOrEqual(1);
  });

  it('アバター圧縮設定が定義されている', () => {
    expect(AVATAR_COMPRESSION_MAX_SIZE_MB).toBeGreaterThan(0);
    expect(AVATAR_MAX_DIMENSION).toBeGreaterThan(0);
  });

  it('ヘッダー圧縮設定が定義されている', () => {
    expect(HEADER_COMPRESSION_MAX_SIZE_MB).toBeGreaterThan(0);
    expect(HEADER_MAX_DIMENSION).toBeGreaterThan(0);
  });

  describe('ALLOWED_PROFILE_IMAGE_TYPES', () => {
    it('JPEG・PNG・WebP が許可されている', () => {
      expect(ALLOWED_PROFILE_IMAGE_TYPES).toContain('image/jpeg');
      expect(ALLOWED_PROFILE_IMAGE_TYPES).toContain('image/png');
      expect(ALLOWED_PROFILE_IMAGE_TYPES).toContain('image/webp');
    });

    it('3種類の MIME タイプが定義されている', () => {
      expect(ALLOWED_PROFILE_IMAGE_TYPES).toHaveLength(3);
    });
  });
});

describe('limits/pagination — ページネーション制限値', () => {
  it('各一覧のページサイズが正の整数', () => {
    expect(FEED_PAGE_SIZE).toBeGreaterThan(0);
    expect(NOTIFICATIONS_PAGE_SIZE).toBeGreaterThan(0);
    expect(COMMENTS_PAGE_SIZE).toBeGreaterThan(0);
    expect(USERS_PAGE_SIZE).toBeGreaterThan(0);
  });

  it('おすすめユーザー・トレンドの取得件数が正の整数', () => {
    expect(RECOMMENDED_USERS_LIMIT).toBeGreaterThan(0);
    expect(TRENDING_HASHTAGS_LIMIT).toBeGreaterThan(0);
  });

  it('MAX_PAGE_LIMIT がページサイズより大きい', () => {
    expect(MAX_PAGE_LIMIT).toBeGreaterThanOrEqual(FEED_PAGE_SIZE);
    expect(MAX_PAGE_LIMIT).toBeGreaterThanOrEqual(NOTIFICATIONS_PAGE_SIZE);
    expect(MAX_PAGE_LIMIT).toBeGreaterThanOrEqual(COMMENTS_PAGE_SIZE);
  });
});

describe('limits/index — barrel エクスポート', () => {
  it('post モジュールの定数が re-export されている', () => {
    expect(limitsIndex.MAX_POST_CONTENT_FREE).toBeDefined();
    expect(limitsIndex.MAX_POST_CONTENT_PREMIUM).toBeDefined();
    expect(limitsIndex.GENRE_CATEGORY_ORDER).toBeDefined();
  });

  it('media モジュールの定数が re-export されている', () => {
    expect(limitsIndex.MAX_IMAGE_SIZE_MB).toBeDefined();
    expect(limitsIndex.MAX_POST_IMAGES_FREE).toBeDefined();
  });

  it('pagination モジュールの定数が re-export されている', () => {
    expect(limitsIndex.FEED_PAGE_SIZE).toBeDefined();
    expect(limitsIndex.MAX_PAGE_LIMIT).toBeDefined();
  });
});
