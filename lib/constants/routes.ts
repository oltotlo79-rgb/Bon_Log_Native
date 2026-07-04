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

/** セキュリティ設定（2段階認証等） */
export const ROUTE_SETTINGS_SECURITY = '/settings/security' as const;

/** パスワード変更 */
export const ROUTE_SETTINGS_PASSWORD = '/settings/password' as const;

/** メールアドレス変更 */
export const ROUTE_SETTINGS_EMAIL = '/settings/email' as const;

/** ブロックリスト */
export const ROUTE_SETTINGS_BLOCKED = '/settings/blocked' as const;

/** ミュートリスト */
export const ROUTE_SETTINGS_MUTED = '/settings/muted' as const;

/** フォローリクエスト管理 */
export const ROUTE_FOLLOW_REQUESTS = '/follow-requests' as const;

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

/** 剤型の違い一覧（フィルタ用クエリパラメータ formulationTypeCode を受け付ける） */
export const ROUTE_PESTICIDES_FORMULATIONS = '/pesticides/formulations' as const;

/** 法的文章一覧 */
export const ROUTE_LEGAL = '/legal' as const;

/** 投稿分析（プレミアム限定） */
export const ROUTE_ANALYTICS = '/analytics' as const;

// ---------------------------------------------------------------------------
// ウェーブ2 操作系スタック画面
// ---------------------------------------------------------------------------

/** ブックマーク一覧 */
export const ROUTE_BOOKMARKS = '/bookmarks' as const;

/** マイ盆栽一覧 */
export const ROUTE_BONSAI = '/bonsai' as const;

/** 盆栽新規登録 */
export const ROUTE_BONSAI_NEW = '/bonsai/new' as const;

/** イベント一覧 */
export const ROUTE_EVENTS = '/events' as const;

/** イベント新規登録 */
export const ROUTE_EVENTS_NEW = '/events/new' as const;

/** 盆栽園マップ一覧 */
export const ROUTE_SHOPS = '/shops' as const;

/** 盆栽園新規登録 */
export const ROUTE_SHOPS_NEW = '/shops/new' as const;

/** 予約投稿一覧（プレミアム限定） */
export const ROUTE_SCHEDULED_POSTS = '/scheduled-posts' as const;

/** 予約投稿新規作成（プレミアム限定） */
export const ROUTE_SCHEDULED_POSTS_NEW = '/scheduled-posts/new' as const;

/** ハッシュタグ/ジャンル別投稿一覧（explore/posts） */
export const ROUTE_EXPLORE_POSTS = '/explore/posts' as const;

/** 手入れログ一覧（カレンダー） */
export const ROUTE_BONSAI_CARE_LOGS = '/bonsai/care-logs' as const;

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
 * 農薬病害虫 詳細（展着剤タイプ）へのパスを返す。
 * Expo Router の dynamic route: `app/pesticides/spreaders/[slug]/index.tsx`
 *
 * 使い方: `router.push(routeSpreaderTypeDetail('foam-type'))`
 */
export function routeSpreaderTypeDetail(slug: string): {
  pathname: '/pesticides/spreaders/[slug]';
  params: { slug: string };
} {
  return { pathname: '/pesticides/spreaders/[slug]', params: { slug } };
}

/**
 * 剤型の違い一覧画面へのパスを返す。
 * Expo Router の static route: `app/pesticides/formulations/index.tsx`
 * formulationTypeCode を渡すと該当剤型に絞り込んだ製品一覧を表示する（Web の ?formulation=CODE 相当）。
 * 省略時は剤型一覧をそのまま表示する。
 *
 * 使い方: `router.push(routeFormulations('EW'))` / `router.push(routeFormulations())`
 */
export function routeFormulations(formulationTypeCode?: string): {
  pathname: typeof ROUTE_PESTICIDES_FORMULATIONS;
  params: { formulationTypeCode?: string };
} {
  const params: { formulationTypeCode?: string } = {};
  if (formulationTypeCode !== undefined) {
    params.formulationTypeCode = formulationTypeCode;
  }
  return { pathname: ROUTE_PESTICIDES_FORMULATIONS, params };
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
// ウェーブ2 動的ルートヘルパー
// ---------------------------------------------------------------------------

/**
 * 盆栽詳細画面へのパスを返す。
 * Expo Router の dynamic route: `app/bonsai/[id]/index.tsx`
 *
 * 使い方: `router.push(routeBonsaiDetail('abc123'))`
 */
export function routeBonsaiDetail(id: string): {
  pathname: '/bonsai/[id]';
  params: { id: string };
} {
  return { pathname: '/bonsai/[id]', params: { id } };
}

/**
 * 盆栽編集画面へのパスを返す。
 * Expo Router の dynamic route: `app/bonsai/[id]/edit/index.tsx`
 *
 * 使い方: `router.push(routeBonsaiEdit('abc123'))`
 */
export function routeBonsaiEdit(id: string): {
  pathname: '/bonsai/[id]/edit';
  params: { id: string };
} {
  return { pathname: '/bonsai/[id]/edit', params: { id } };
}

/**
 * イベント詳細画面へのパスを返す。
 * Expo Router の dynamic route: `app/events/[id]/index.tsx`
 *
 * 使い方: `router.push(routeEventDetail('abc123'))`
 */
export function routeEventDetail(id: string): {
  pathname: '/events/[id]';
  params: { id: string };
} {
  return { pathname: '/events/[id]', params: { id } };
}

/**
 * イベント編集画面へのパスを返す。
 * Expo Router の dynamic route: `app/events/[id]/edit/index.tsx`
 *
 * 使い方: `router.push(routeEventEdit('abc123'))`
 */
export function routeEventEdit(id: string): {
  pathname: '/events/[id]/edit';
  params: { id: string };
} {
  return { pathname: '/events/[id]/edit', params: { id } };
}

/**
 * 盆栽園詳細画面へのパスを返す。
 * Expo Router の dynamic route: `app/shops/[id]/index.tsx`
 *
 * 使い方: `router.push(routeShopDetail('abc123'))`
 */
export function routeShopDetail(id: string): {
  pathname: '/shops/[id]';
  params: { id: string };
} {
  return { pathname: '/shops/[id]', params: { id } };
}

/**
 * 盆栽園編集画面へのパスを返す。
 * Expo Router の dynamic route: `app/shops/[id]/edit/index.tsx`
 *
 * 使い方: `router.push(routeShopEdit('abc123'))`
 */
export function routeShopEdit(id: string): {
  pathname: '/shops/[id]/edit';
  params: { id: string };
} {
  return { pathname: '/shops/[id]/edit', params: { id } };
}

/**
 * 盆栽園レビュー一覧画面へのパスを返す。
 * Expo Router の dynamic route: `app/shops/[id]/reviews/index.tsx`
 *
 * 使い方: `router.push(routeShopReviews('abc123'))`
 */
export function routeShopReviews(id: string): {
  pathname: '/shops/[id]/reviews';
  params: { id: string };
} {
  return { pathname: '/shops/[id]/reviews', params: { id } };
}

/**
 * 予約投稿詳細画面へのパスを返す。
 * Expo Router の dynamic route: `app/scheduled-posts/[id]/index.tsx`
 *
 * 使い方: `router.push(routeScheduledPostDetail('abc123'))`
 */
export function routeScheduledPostDetail(id: string): {
  pathname: '/scheduled-posts/[id]';
  params: { id: string };
} {
  return { pathname: '/scheduled-posts/[id]', params: { id } };
}

/**
 * 予約投稿編集画面へのパスを返す。
 * Expo Router の dynamic route: `app/scheduled-posts/[id]/edit/index.tsx`
 *
 * 使い方: `router.push(routeScheduledPostEdit('abc123'))`
 */
export function routeScheduledPostEdit(id: string): {
  pathname: '/scheduled-posts/[id]/edit';
  params: { id: string };
} {
  return { pathname: '/scheduled-posts/[id]/edit', params: { id } };
}

/**
 * ハッシュタグ別投稿一覧画面へのパスを返す。
 * params に hashtag を渡す（# なしのタグ名）。
 * Expo Router の画面: `app/explore/posts/index.tsx`
 *
 * 使い方: `router.push(routeExplorePostsByHashtag('松'))`
 */
export function routeExplorePostsByHashtag(hashtag: string): {
  pathname: typeof ROUTE_EXPLORE_POSTS;
  params: { hashtag: string };
} {
  return { pathname: ROUTE_EXPLORE_POSTS, params: { hashtag } };
}

/**
 * ジャンル別投稿一覧画面へのパスを返す。
 * params に genreId を渡す。
 * Expo Router の画面: `app/explore/posts/index.tsx`
 *
 * 使い方: `router.push(routeExplorePostsByGenre('genre-id'))`
 */
export function routeExplorePostsByGenre(genreId: string): {
  pathname: typeof ROUTE_EXPLORE_POSTS;
  params: { genreId: string };
} {
  return { pathname: ROUTE_EXPLORE_POSTS, params: { genreId } };
}

/**
 * 引用投稿作成画面へのパスを返す。
 * Expo Router の dynamic route: `app/posts/[id]/quote/index.tsx`
 *
 * 使い方: `router.push(routePostQuote('abc123'))`
 * href 文字列形式を採用。typed routes の静的型は開発サーバー起動時に自動更新される。
 */
export function routePostQuote(id: string): `/posts/${string}/quote` {
  return `/posts/${id}/quote`;
}

/**
 * 盆栽成長記録 新規追加画面へのパスを返す。
 * Expo Router の dynamic route: `app/bonsai/[id]/records/new/index.tsx`
 *
 * 使い方: `router.push(routeBonsaiRecordNew('abc123'))`
 */
export function routeBonsaiRecordNew(bonsaiId: string): {
  pathname: '/bonsai/[id]/records/new';
  params: { id: string };
} {
  return { pathname: '/bonsai/[id]/records/new', params: { id: bonsaiId } };
}

/**
 * 盆栽成長記録 編集画面へのパスを返す。
 * Expo Router の dynamic route: `app/bonsai/[id]/records/[recordId]/edit/index.tsx`
 *
 * 使い方: `router.push(routeBonsaiRecordEdit('abc123', 'rec456'))`
 */
export function routeBonsaiRecordEdit(bonsaiId: string, recordId: string): {
  pathname: '/bonsai/[id]/records/[recordId]/edit';
  params: { id: string; recordId: string };
} {
  return { pathname: '/bonsai/[id]/records/[recordId]/edit', params: { id: bonsaiId, recordId } };
}

/**
 * 盆栽園レビュー 新規投稿画面へのパスを返す。
 * Expo Router の dynamic route: `app/shops/[id]/reviews/new/index.tsx`
 *
 * 使い方: `router.push(routeShopReviewNew('abc123'))`
 */
export function routeShopReviewNew(id: string): {
  pathname: '/shops/[id]/reviews/new';
  params: { id: string };
} {
  return { pathname: '/shops/[id]/reviews/new', params: { id } };
}

// ---------------------------------------------------------------------------
// DM（ダイレクトメッセージ）
// ---------------------------------------------------------------------------

/** DM 会話一覧画面 */
export const ROUTE_MESSAGES = '/messages' as const;

/**
 * DM 会話スレッド画面へのパスを返す。
 * Expo Router の dynamic route: `app/messages/[conversationId]/index.tsx`
 *
 * otherUser を渡すと、メッセージが 0 件でも相手名をヘッダーに即時表示できる。
 * パラメータが欠落した場合はスレッド画面がメッセージ送信者から逆引きしてフォールバックする。
 *
 * 使い方: `router.push(routeMessageThread('abc123', { nickname: '松太郎', avatarUrl: '...', userId: 'u1' }))`
 */
export function routeMessageThread(
  conversationId: string,
  otherUser?: { nickname: string; avatarUrl: string | null; userId: string }
): {
  pathname: '/messages/[conversationId]';
  params: { conversationId: string; nickname?: string; avatarUrl?: string; userId?: string };
} {
  const params: { conversationId: string; nickname?: string; avatarUrl?: string; userId?: string } =
    { conversationId };
  if (otherUser !== undefined) {
    params.nickname = otherUser.nickname;
    if (otherUser.avatarUrl !== null) {
      params.avatarUrl = otherUser.avatarUrl;
    }
    params.userId = otherUser.userId;
  }
  return { pathname: '/messages/[conversationId]', params };
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
  settingsSecurity: ROUTE_SETTINGS_SECURITY,
  settingsPassword: ROUTE_SETTINGS_PASSWORD,
  settingsEmail: ROUTE_SETTINGS_EMAIL,
  settingsBlocked: ROUTE_SETTINGS_BLOCKED,
  settingsMuted: ROUTE_SETTINGS_MUTED,
  settingsSubscription: ROUTE_SETTINGS_SUBSCRIPTION,
  followRequests: ROUTE_FOLLOW_REQUESTS,

  // dynamic helpers
  postDetail: routePostDetail,
  postEdit: routePostEdit,
  postQuote: routePostQuote,
  userDetail: routeUserDetail,
  searchByQuery: routeSearchByQuery,
  searchByGenre: routeSearchByGenre,

  // wave-1 browse
  explore: ROUTE_EXPLORE,
  dictionary: ROUTE_DICTIONARY,
  fertilizers: ROUTE_FERTILIZERS,
  hormones: ROUTE_HORMONES,
  pesticides: ROUTE_PESTICIDES,
  pesticidesFormulations: ROUTE_PESTICIDES_FORMULATIONS,
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
  spreaderTypeDetail: routeSpreaderTypeDetail,
  formulations: routeFormulations,
  legalDocument: routeLegalDocument,

  // wave-2 browse
  bookmarks: ROUTE_BOOKMARKS,
  bonsai: ROUTE_BONSAI,
  bonsaiNew: ROUTE_BONSAI_NEW,
  events: ROUTE_EVENTS,
  eventsNew: ROUTE_EVENTS_NEW,
  shops: ROUTE_SHOPS,
  shopsNew: ROUTE_SHOPS_NEW,
  scheduledPosts: ROUTE_SCHEDULED_POSTS,
  scheduledPostsNew: ROUTE_SCHEDULED_POSTS_NEW,
  explorePosts: ROUTE_EXPLORE_POSTS,
  bonsaiCareLogs: ROUTE_BONSAI_CARE_LOGS,

  // wave-2 dynamic helpers
  bonsaiDetail: routeBonsaiDetail,
  bonsaiEdit: routeBonsaiEdit,
  bonsaiRecordNew: routeBonsaiRecordNew,
  bonsaiRecordEdit: routeBonsaiRecordEdit,
  eventDetail: routeEventDetail,
  eventEdit: routeEventEdit,
  shopDetail: routeShopDetail,
  shopEdit: routeShopEdit,
  shopReviews: routeShopReviews,
  shopReviewNew: routeShopReviewNew,
  scheduledPostDetail: routeScheduledPostDetail,
  scheduledPostEdit: routeScheduledPostEdit,
  explorePostsByHashtag: routeExplorePostsByHashtag,
  explorePostsByGenre: routeExplorePostsByGenre,

  // DM
  messages: ROUTE_MESSAGES,
  messageThread: routeMessageThread,
} as const;
