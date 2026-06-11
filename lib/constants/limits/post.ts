/**
 * @module lib/constants/limits/post
 * 投稿・コメント・コンテンツ関連の制限値（クライアント事前検証用ミラー）。
 * 値の正はサーバー。サーバーエラー (400/429) のハンドリングは必須（api-client.md）。
 */

/** 投稿の最大文字数（無料プラン） */
export const MAX_POST_CONTENT_FREE = 500;

/** 投稿の最大文字数（プレミアムプラン） */
export const MAX_POST_CONTENT_PREMIUM = 2000;

/** 1日の最大投稿数（無料プラン） */
export const MAX_DAILY_POSTS_FREE = 20;

/** 1日の最大投稿数（プレミアムプラン） */
export const MAX_DAILY_POSTS_PREMIUM = 40;

/** 投稿あたりの最大ジャンル数 */
export const MAX_GENRES_PER_POST = 3;

/** コメントの最大文字数 */
export const MAX_COMMENT_LENGTH = 500;

/** 1日のコメント上限数 */
export const DAILY_COMMENT_LIMIT = 100;

/** 検索クエリの最大文字数 */
export const MAX_SEARCH_QUERY_LENGTH = 100;

/** ジャンルカテゴリの表示順序 */
export const GENRE_CATEGORY_ORDER = [
  '松柏類',
  '雑木類',
  '草もの',
  '用品・道具',
  '施設・イベント',
  'その他',
] as const;

/** GenreCategory の union 型 */
export type GenreCategory = (typeof GENRE_CATEGORY_ORDER)[number];
