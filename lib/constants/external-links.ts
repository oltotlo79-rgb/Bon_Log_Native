/**
 * @module lib/constants/external-links
 * アプリ外部の Web URL 定数。expo-web-browser / Linking.openURL() に渡す際はここから参照する。
 * URL の正は Bon_Log_cfw のルート構成。
 * ベース URL は EXPO_PUBLIC_API_BASE_URL に追従し、開発環境でも正しいホストを向く。
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.bon-log.com';

/** パス文字列とベース URL を結合する共通ロジック */
function buildUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

// ---------------------------------------------------------------------------
// 既存 URL 定数（互換のため維持）
// ---------------------------------------------------------------------------

/** 利用規約ページ（Bon_Log_cfw: app/(legal)/terms/page.tsx） */
export const TERMS_URL = buildUrl('/terms');

/** プライバシーポリシーページ（Bon_Log_cfw: app/(legal)/privacy/page.tsx） */
export const PRIVACY_URL = buildUrl('/privacy');

/**
 * PRIVACY_URL の別名。frontend 向け統一命名（TERMS_URL に合わせた _URL サフィックス + 意味を明示する名前）。
 * 既存 PRIVACY_URL と同値。どちらを使っても動作は同じ。
 */
export const PRIVACY_POLICY_URL = PRIVACY_URL;

/** ヘルプページ（Bon_Log_cfw: app/help/page.tsx） */
export const HELP_URL = buildUrl('/help');

// ---------------------------------------------------------------------------
// 「もっと見る」メニュー向け URL 定数
// アプリにネイティブ画面が無い機能は expo-web-browser でこれらを開く
// ---------------------------------------------------------------------------

/** 発見（探索）ページ */
export const EXPLORE_URL = buildUrl('/explore');

/** マイ盆栽一覧ページ */
export const BONSAI_URL = buildUrl('/bonsai');

/** 盆栽園マップページ */
export const SHOPS_URL = buildUrl('/shops');

/** イベント一覧ページ */
export const EVENTS_URL = buildUrl('/events');

/** ブックマーク一覧ページ */
export const BOOKMARKS_URL = buildUrl('/bookmarks');

/** 農薬・病害虫ページ */
export const PESTICIDES_URL = buildUrl('/pesticides');

/** 施肥ガイドページ */
export const FERTILIZERS_URL = buildUrl('/fertilizers');

/** 植物ホルモンページ */
export const HORMONES_URL = buildUrl('/hormones');

/** 盆栽用語辞典ページ */
export const DICTIONARY_URL = buildUrl('/dictionary');

/** 特定商取引法に基づく表記ページ */
export const TOKUSHOHO_URL = buildUrl('/tokushoho');

/** 予約投稿管理ページ（プレミアム機能） */
export const SCHEDULED_POSTS_URL = buildUrl('/posts/scheduled');

/** 投稿分析ページ（プレミアム機能） */
export const ANALYTICS_URL = buildUrl('/analytics');

// ---------------------------------------------------------------------------
// 集約オブジェクト（既存 + 新規をまとめて参照する場合に使用）
// ---------------------------------------------------------------------------

/**
 * 全外部リンク定数をまとめた読み取り専用オブジェクト。
 * `import { externalLinks } from '@/lib/constants/external-links'` で使用する。
 * 個別エクスポートは互換のため残しているため、どちらを使っても動作は同じ。
 */
export const externalLinks = {
  terms: TERMS_URL,
  privacy: PRIVACY_URL,
  privacyPolicy: PRIVACY_POLICY_URL,
  help: HELP_URL,
  explore: EXPLORE_URL,
  bonsai: BONSAI_URL,
  shops: SHOPS_URL,
  events: EVENTS_URL,
  bookmarks: BOOKMARKS_URL,
  pesticides: PESTICIDES_URL,
  fertilizers: FERTILIZERS_URL,
  hormones: HORMONES_URL,
  dictionary: DICTIONARY_URL,
  tokushoho: TOKUSHOHO_URL,
  scheduledPosts: SCHEDULED_POSTS_URL,
  analytics: ANALYTICS_URL,
} as const;
