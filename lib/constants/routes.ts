/**
 * @module lib/constants/routes
 * アプリ内ルートパスの一元管理。
 * Expo Router の typed routes に対応する文字列定数 + ヘルパー関数。
 * パス文字列を画面に直書きして散在させない（navigation.md 規約）。
 * ディレクトリ構成は docs/design/navigation-structure.md §1 に準拠。
 */

// ---------------------------------------------------------------------------
// (auth) スタック — 未認証ルート
// ---------------------------------------------------------------------------

/** ログイン画面 */
export const ROUTE_LOGIN = '/(auth)/login' as const;

/** 新規登録画面 */
export const ROUTE_REGISTER = '/(auth)/register' as const;

/** メール確認送信完了画面 */
export const ROUTE_VERIFY_EMAIL_SENT = '/(auth)/register/verify-email-sent' as const;

/** パスワードリセット申請画面 */
export const ROUTE_PASSWORD_RESET = '/(auth)/password-reset' as const;

/** パスワードリセット確認画面 */
export const ROUTE_PASSWORD_RESET_CONFIRM = '/(auth)/password-reset/confirm' as const;

/** 二段階認証（2FA）確認画面 */
export const ROUTE_TWO_FACTOR_VERIFY = '/(auth)/two-factor-verify' as const;

// ---------------------------------------------------------------------------
// (tabs) — 認証後ボトムタブ
// ---------------------------------------------------------------------------

/** フィード（タイムライン） */
export const ROUTE_FEED = '/(tabs)/feed' as const;

/** 検索 */
export const ROUTE_SEARCH = '/(tabs)/search' as const;

/** 通知 */
export const ROUTE_NOTIFICATIONS = '/(tabs)/notifications' as const;

/** 自分のプロフィール */
export const ROUTE_PROFILE = '/(tabs)/profile' as const;

/** もっと見る（設定・法的情報・ヘルプ等へのハブ画面） */
export const ROUTE_MORE = '/(tabs)/more' as const;

// ---------------------------------------------------------------------------
// タブ外スタック画面
// ---------------------------------------------------------------------------

/** 新規投稿画面 */
export const ROUTE_POST_NEW = '/posts/new' as const;

/** 設定トップ */
export const ROUTE_SETTINGS = '/settings' as const;

/** プロフィール編集 */
export const ROUTE_SETTINGS_PROFILE = '/settings/profile' as const;

/** アカウント設定（削除導線を含む — store-compliance.md 要件） */
export const ROUTE_SETTINGS_ACCOUNT = '/settings/account' as const;

/** 通知設定 */
export const ROUTE_SETTINGS_NOTIFICATIONS = '/settings/notifications' as const;

/** ブロックリスト */
export const ROUTE_SETTINGS_BLOCKED = '/settings/blocked' as const;

/** ミュートリスト */
export const ROUTE_SETTINGS_MUTED = '/settings/muted' as const;

/** サブスクリプション（購入・復元 — store-compliance.md 要件） */
export const ROUTE_SETTINGS_SUBSCRIPTION = '/settings/subscription' as const;

// ---------------------------------------------------------------------------
// 検索遷移ヘルパー
// ---------------------------------------------------------------------------

/**
 * クエリ文字列で検索画面へ遷移する引数オブジェクトを返す。
 * `router.push(routeSearchByQuery('松'))` のようにそのまま渡せる。
 * Expo Router の typed routes に適合する { pathname, params } 形式を採用し、
 * クエリ文字列の手動エンコードによるパス破壊を防ぐ。
 */
export function routeSearchByQuery(query: string): {
  pathname: typeof ROUTE_SEARCH;
  params: { q: string };
} {
  return { pathname: ROUTE_SEARCH, params: { q: query } };
}

/**
 * ジャンル ID で検索画面へ遷移する引数オブジェクトを返す。
 * `router.push(routeSearchByGenre('pine'))` のようにそのまま渡せる。
 */
export function routeSearchByGenre(genreId: string): {
  pathname: typeof ROUTE_SEARCH;
  params: { genre: string };
} {
  return { pathname: ROUTE_SEARCH, params: { genre: genreId } };
}

// ---------------------------------------------------------------------------
// 動的ルートヘルパー
// ---------------------------------------------------------------------------

/**
 * 投稿詳細画面へのパスを返す。
 * Expo Router の dynamic route: `app/posts/[id]/index.tsx`
 */
export function routePostDetail(id: string): `/posts/${string}` {
  return `/posts/${id}`;
}

/**
 * 投稿編集画面へのパスを返す。
 * Expo Router の dynamic route: `app/posts/[id]/edit/index.tsx`
 */
export function routePostEdit(id: string): `/posts/${string}/edit` {
  return `/posts/${id}/edit`;
}

/**
 * 他ユーザープロフィール画面へのパスを返す。
 * Expo Router の dynamic route: `app/users/[id]/index.tsx`
 */
export function routeUserDetail(id: string): `/users/${string}` {
  return `/users/${id}`;
}

// ---------------------------------------------------------------------------
// ウェーブ1 閲覧系スタック画面
// ---------------------------------------------------------------------------

/** 発見（explore）画面 */
export const ROUTE_EXPLORE = '/explore' as const;

/** 盆栽用語辞典一覧 */
export const ROUTE_DICTIONARY = '/dictionary' as const;

/** 施肥ガイド */
export const ROUTE_FERTILIZERS = '/fertilizers' as const;

/** 植物ホルモン */
export const ROUTE_HORMONES = '/hormones' as const;

/** 農薬病害虫図鑑（3 カタログのタブ画面想定） */
export const ROUTE_PESTICIDES = '/pesticides' as const;

/** 法的文章一覧 */
export const ROUTE_LEGAL = '/legal' as const;

/** 投稿分析（プレミアム限定） */
export const ROUTE_ANALYTICS = '/analytics' as const;

// ---------------------------------------------------------------------------
// ウェーブ1 動的ルートヘルパー
// ---------------------------------------------------------------------------

/**
 * 盆栽用語辞典 詳細画面へのパスを返す。
 * Expo Router の dynamic route: `app/dictionary/[slug].tsx`
 */
export function routeDictionaryDetail(slug: string): `/dictionary/${string}` {
  return `/dictionary/${slug}`;
}

/**
 * 施肥ガイド 栄養素詳細へのパスを返す。
 * Expo Router の dynamic route: `app/fertilizers/nutrients/[slug].tsx`
 */
export function routeFertilizerNutrientDetail(slug: string): `/fertilizers/nutrients/${string}` {
  return `/fertilizers/nutrients/${slug}`;
}

/**
 * 施肥ガイド 樹種詳細（施肥スケジュール）へのパスを返す。
 * Expo Router の dynamic route: `app/fertilizers/tree-species/[slug].tsx`
 */
export function routeFertilizerTreeSpeciesDetail(slug: string): `/fertilizers/tree-species/${string}` {
  return `/fertilizers/tree-species/${slug}`;
}

/**
 * 植物ホルモン詳細へのパスを返す。
 * Expo Router の dynamic route: `app/hormones/[slug].tsx`
 */
export function routeHormoneDetail(slug: string): `/hormones/${string}` {
  return `/hormones/${slug}`;
}

/**
 * 農薬病害虫 詳細（病害虫）へのパスを返す。
 * Expo Router の dynamic route: `app/pesticides/disease-pests/[slug].tsx`
 */
export function routeDiseasePestDetail(slug: string): `/pesticides/disease-pests/${string}` {
  return `/pesticides/disease-pests/${slug}`;
}

/**
 * 農薬病害虫 詳細（農薬製品）へのパスを返す。
 * Expo Router の dynamic route: `app/pesticides/products/[slug].tsx`
 */
export function routePesticideProductDetail(slug: string): `/pesticides/products/${string}` {
  return `/pesticides/products/${slug}`;
}

/**
 * 農薬病害虫 詳細（有効成分）へのパスを返す。
 * Expo Router の dynamic route: `app/pesticides/ingredients/[slug].tsx`
 */
export function routePesticideIngredientDetail(slug: string): `/pesticides/ingredients/${string}` {
  return `/pesticides/ingredients/${slug}`;
}

/**
 * 法的文章 詳細へのパスを返す。
 * Expo Router の dynamic route: `app/legal/[slug].tsx`
 * slug は 'tokushoho' | 'terms' | 'privacy' のみ有効（サーバー側で検証）。
 */
export function routeLegalDocument(slug: 'tokushoho' | 'terms' | 'privacy'): `/legal/${string}` {
  return `/legal/${slug}`;
}

// ---------------------------------------------------------------------------
// 後方互換エイリアス（frontend が `routes.xxx` 形式で参照する契約に対応）
// ---------------------------------------------------------------------------

/**
 * frontend 向けの名前付きオブジェクト。
 * `import { routes } from '@/lib/constants/routes'` で使用する。
 */
export const routes = {
  // auth
  login: ROUTE_LOGIN,
  register: ROUTE_REGISTER,
  verifyEmailSent: ROUTE_VERIFY_EMAIL_SENT,
  passwordReset: ROUTE_PASSWORD_RESET,
  passwordResetConfirm: ROUTE_PASSWORD_RESET_CONFIRM,
  twoFactorVerify: ROUTE_TWO_FACTOR_VERIFY,

  // tabs
  feed: ROUTE_FEED,
  search: ROUTE_SEARCH,
  notifications: ROUTE_NOTIFICATIONS,
  profile: ROUTE_PROFILE,
  more: ROUTE_MORE,

  // stack
  postNew: ROUTE_POST_NEW,
  settings: ROUTE_SETTINGS,
  settingsProfile: ROUTE_SETTINGS_PROFILE,
  settingsAccount: ROUTE_SETTINGS_ACCOUNT,
  settingsNotifications: ROUTE_SETTINGS_NOTIFICATIONS,
  settingsBlocked: ROUTE_SETTINGS_BLOCKED,
  settingsMuted: ROUTE_SETTINGS_MUTED,
  settingsSubscription: ROUTE_SETTINGS_SUBSCRIPTION,

  // dynamic helpers
  postDetail: routePostDetail,
  postEdit: routePostEdit,
  userDetail: routeUserDetail,
  searchByQuery: routeSearchByQuery,
  searchByGenre: routeSearchByGenre,

  // wave-1 browse
  explore: ROUTE_EXPLORE,
  dictionary: ROUTE_DICTIONARY,
  fertilizers: ROUTE_FERTILIZERS,
  hormones: ROUTE_HORMONES,
  pesticides: ROUTE_PESTICIDES,
  legal: ROUTE_LEGAL,
  analytics: ROUTE_ANALYTICS,

  // wave-1 dynamic helpers
  dictionaryDetail: routeDictionaryDetail,
  fertilizerNutrientDetail: routeFertilizerNutrientDetail,
  fertilizerTreeSpeciesDetail: routeFertilizerTreeSpeciesDetail,
  hormoneDetail: routeHormoneDetail,
  diseasePestDetail: routeDiseasePestDetail,
  pesticideProductDetail: routePesticideProductDetail,
  pesticideIngredientDetail: routePesticideIngredientDetail,
  legalDocument: routeLegalDocument,
} as const;
