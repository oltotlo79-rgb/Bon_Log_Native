/**
 * @module lib/constants/limits/pagination
 * ページネーション・データ取得件数の制限値（クライアント事前検証用ミラー）。
 * 値の正はサーバー。サーバーエラー (400/429) のハンドリングは必須（api-client.md）。
 */

/** フィードのデフォルトページ取得件数 */
export const FEED_PAGE_SIZE = 20;

/** 通知一覧のページ取得件数 */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/** コメント一覧のページ取得件数 */
export const COMMENTS_PAGE_SIZE = 20;

/** ユーザー検索・一覧のページ取得件数 */
export const USERS_PAGE_SIZE = 20;

/** おすすめユーザーの取得件数（検索画面の初期表示） */
export const RECOMMENDED_USERS_LIMIT = 5;

/** トレンドハッシュタグの取得件数 */
export const TRENDING_HASHTAGS_LIMIT = 10;

/** ページネーション limit パラメータの最大値 */
export const MAX_PAGE_LIMIT = 100;

/** 辞典一覧のページ取得件数 */
export const DICTIONARY_PAGE_SIZE = 20;

/** 病害虫一覧のページ取得件数 */
export const DISEASE_PESTS_PAGE_SIZE = 20;

/** 農薬製品一覧のページ取得件数 */
export const PESTICIDE_PRODUCTS_PAGE_SIZE = 20;

/** 有効成分一覧のページ取得件数 */
export const PESTICIDE_INGREDIENTS_PAGE_SIZE = 20;

/** トレンドジャンルの取得件数 */
export const TRENDING_GENRES_LIMIT = 10;

/** ブックマーク一覧のページ取得件数 */
export const BOOKMARKS_PAGE_SIZE = 20;

/** マイ盆栽一覧のページ取得件数 */
export const BONSAI_PAGE_SIZE = 20;

/** 盆栽成長記録一覧のページ取得件数 */
export const BONSAI_RECORDS_PAGE_SIZE = 20;

/** イベント一覧のページ取得件数 */
export const EVENTS_PAGE_SIZE = 20;

/** 盆栽園一覧のページ取得件数 */
export const SHOPS_PAGE_SIZE = 20;

/** レビュー一覧のページ取得件数 */
export const REVIEWS_PAGE_SIZE = 20;

/** 予約投稿一覧のページ取得件数 */
export const SCHEDULED_POSTS_PAGE_SIZE = 20;
