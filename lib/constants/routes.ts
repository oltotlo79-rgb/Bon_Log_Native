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

  // tabs
  feed: ROUTE_FEED,
  search: ROUTE_SEARCH,
  notifications: ROUTE_NOTIFICATIONS,
  profile: ROUTE_PROFILE,

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
} as const;
