/**
 * @module lib/queries/keys
 * アプリ全体のクエリキーを集約する。
 * インライン配列キーの直書きは禁止し、すべてここから import する（data-fetching.md）。
 * 階層設計により、上位キー単位での invalidateQueries が可能。
 *
 * フィルタ・ページネーションの具体型はサーバー API 確定後に更新する。
 * 現時点では unknown を使わず、必要最小限の string 型で保持する。
 */

// ---------------------------------------------------------------------------
// FeedFilter — サーバー API 確定前の最小型
// ---------------------------------------------------------------------------

/**
 * フィードの絞り込み条件。
 * サーバー API 確定後に具体的な型へ置き換える。
 * 現時点では object として受け付け、クエリキーの構造を壊さない。
 */
export type FeedFilter = Record<string, string | number | boolean | undefined>;

// ---------------------------------------------------------------------------
// クエリキー定義
// ---------------------------------------------------------------------------

export const queryKeys = {
  /** 投稿 */
  posts: {
    /** すべての投稿キャッシュのルート（投稿系を一括 invalidate するときに使う） */
    all: ['posts'] as const,
    /** フィード一覧 */
    feed: (filter: FeedFilter = {}) => ['posts', 'feed', filter] as const,
    /** 投稿詳細 */
    detail: (id: string) => ['posts', 'detail', id] as const,
  },

  /** コメント */
  comments: {
    /** ルートキー */
    all: ['comments'] as const,
    /** 指定投稿のコメント一覧 */
    byPost: (postId: string) => ['comments', postId] as const,
  },

  /** ユーザー */
  users: {
    /** ルートキー */
    all: ['users'] as const,
    /** 認証中ユーザー自身の基本情報（GET /api/v1/users/me） */
    me: ['users', 'me'] as const,
    /**
     * プロフィール編集フォーム用の全フィールドキャッシュ。
     * PATCH /api/v1/users/me 成功時に useUpdateProfileMutation が setQueryData で書き込む。
     * GET /api/v1/users/me は UsersMeResponse（部分型）しか返さないため、
     * このキーは読み取り専用クエリ（queryFn なし）として useCurrentUserProfileQuery が使用する。
     */
    meProfile: ['users', 'me', 'profile'] as const,
    /** ユーザー詳細・プロフィール */
    detail: (id: string) => ['users', 'detail', id] as const,
    /** ブロックリスト（GET /api/v1/users/me/blocks） */
    blocks: ['users', 'me', 'blocks'] as const,
    /** ミュートリスト（GET /api/v1/users/me/mutes） */
    mutes: ['users', 'me', 'mutes'] as const,
    /** ユーザー投稿一覧（GET /api/v1/users/{id}/posts・無限スクロール） */
    posts: (userId: string) => ['users', 'posts', userId] as const,
  },

  /** 通知 */
  notifications: {
    /** ルートキー */
    all: ['notifications'] as const,
    /** 通知一覧（無限スクロール） */
    list: () => ['notifications', 'list'] as const,
    /** 未読件数 */
    unreadCount: ['notifications', 'unreadCount'] as const,
    /** 通知設定（GET /api/v1/users/me/notification-settings） */
    settings: ['notifications', 'settings'] as const,
  },

  /** フォローリクエスト */
  followRequests: {
    /** ルートキー */
    all: ['followRequests'] as const,
    /** 受信フォローリクエスト一覧（無限スクロール・pending のみ） */
    list: () => ['followRequests', 'list'] as const,
  },

  /** 検索 */
  search: {
    /** ルートキー */
    all: ['search'] as const,
    /** 投稿検索 */
    posts: (query: string) => ['search', 'posts', query] as const,
    /** ユーザー検索 */
    users: (query: string) => ['search', 'users', query] as const,
  },

  /** 発見（explore） */
  explore: {
    /** ルートキー */
    all: ['explore'] as const,
    /** トレンドハッシュタグ */
    trendingHashtags: ['explore', 'trendingHashtags'] as const,
    /** トレンドジャンル */
    trendingGenres: ['explore', 'trendingGenres'] as const,
    /** おすすめユーザー */
    recommendedUsers: ['explore', 'recommendedUsers'] as const,
    /** ハッシュタグ/ジャンル別投稿一覧（無限スクロール・排他パラメータ） */
    posts: (params: ExplorePostsParams) => ['explore', 'posts', params] as const,
  },

  /** 盆栽用語辞典 */
  dictionary: {
    /** ルートキー */
    all: ['dictionary'] as const,
    /** 用語一覧（フィルタ含む） */
    list: (params: DictionaryListParams) => ['dictionary', 'list', params] as const,
    /** 用語詳細 */
    detail: (slug: string) => ['dictionary', 'detail', slug] as const,
  },

  /** 施肥ガイド */
  fertilizers: {
    /** ルートキー */
    all: ['fertilizers'] as const,
    /** 栄養素一覧 */
    nutrients: (category?: string) => ['fertilizers', 'nutrients', category] as const,
    /** 栄養素詳細 */
    nutrientDetail: (slug: string) => ['fertilizers', 'nutrientDetail', slug] as const,
    /** 肥料カテゴリ一覧 */
    categories: ['fertilizers', 'categories'] as const,
    /** 樹種一覧 */
    treeSpecies: (category?: string) => ['fertilizers', 'treeSpecies', category] as const,
    /** 樹種別施肥スケジュール */
    schedule: (slug: string) => ['fertilizers', 'schedule', slug] as const,
  },

  /** 植物ホルモン */
  hormones: {
    /** ルートキー */
    all: ['hormones'] as const,
    /** ホルモン一覧 */
    list: (category?: string) => ['hormones', 'list', category] as const,
    /** ホルモン詳細 */
    detail: (slug: string) => ['hormones', 'detail', slug] as const,
  },

  /** 農薬病害虫図鑑 */
  pesticides: {
    /** ルートキー */
    all: ['pesticides'] as const,
    /** 病害虫一覧 */
    diseasePests: (params: PesticideListParams) => ['pesticides', 'diseasePests', params] as const,
    /** 病害虫詳細 */
    diseasePestDetail: (slug: string) => ['pesticides', 'diseasePestDetail', slug] as const,
    /** 農薬製品一覧 */
    products: (params: PesticideListParams) => ['pesticides', 'products', params] as const,
    /** 農薬製品詳細 */
    productDetail: (slug: string) => ['pesticides', 'productDetail', slug] as const,
    /** 有効成分一覧 */
    ingredients: (params: PesticideListParams) => ['pesticides', 'ingredients', params] as const,
    /** 有効成分詳細 */
    ingredientDetail: (slug: string) => ['pesticides', 'ingredientDetail', slug] as const,
  },

  /** 法的文章 */
  legal: {
    /** ルートキー */
    all: ['legal'] as const,
    /** 法的文章一覧 */
    list: ['legal', 'list'] as const,
    /** 法的文章詳細 */
    document: (slug: string) => ['legal', 'document', slug] as const,
  },

  /** 投稿分析（プレミアム限定） */
  analytics: {
    /** ルートキー */
    all: ['analytics'] as const,
    /** 分析サマリ */
    summary: (days: AnalyticsDays) => ['analytics', 'summary', days] as const,
  },

  /** ブックマーク */
  bookmarks: {
    /** ルートキー */
    all: ['bookmarks'] as const,
    /** 自分のブックマーク一覧（無限スクロール） */
    list: () => ['bookmarks', 'list'] as const,
  },

  /** マイ盆栽 */
  bonsai: {
    /** ルートキー */
    all: ['bonsai'] as const,
    /** 盆栽一覧（無限スクロール） */
    list: () => ['bonsai', 'list'] as const,
    /** 盆栽詳細 */
    detail: (id: string) => ['bonsai', 'detail', id] as const,
    /** 成長記録一覧（盆栽 ID ごと・無限スクロール） */
    records: (bonsaiId: string) => ['bonsai', 'records', bonsaiId] as const,
    /** 手入れログ一覧（ユーザー単位・無限スクロール） */
    careLogs: (params: CareLogsParams) => ['bonsai', 'careLogs', params] as const,
  },

  /** イベント */
  events: {
    /** ルートキー */
    all: ['events'] as const,
    /** イベント一覧（フィルタ付き・無限スクロール） */
    list: (filter: EventsFilter) => ['events', 'list', filter] as const,
    /** イベント詳細 */
    detail: (id: string) => ['events', 'detail', id] as const,
  },

  /** 盆栽園マップ */
  shops: {
    /** ルートキー */
    all: ['shops'] as const,
    /** 盆栽園一覧（フィルタ付き・無限スクロール） */
    list: (params: ShopsListParams) => ['shops', 'list', params] as const,
    /** 盆栽園詳細 */
    detail: (id: string) => ['shops', 'detail', id] as const,
    /** レビュー一覧（盆栽園 ID ごと・無限スクロール） */
    reviews: (shopId: string) => ['shops', 'reviews', shopId] as const,
  },

  /** ジャンル */
  genres: {
    /** ルートキー */
    all: ['genres'] as const,
    /** ジャンル一覧（type=shop or post） */
    list: (type: GenreType) => ['genres', 'list', type] as const,
  },

  /** 予約投稿（プレミアム限定） */
  scheduledPosts: {
    /** ルートキー */
    all: ['scheduledPosts'] as const,
    /** 予約投稿一覧（無限スクロール） */
    list: () => ['scheduledPosts', 'list'] as const,
    /** 予約投稿詳細 */
    detail: (id: string) => ['scheduledPosts', 'detail', id] as const,
  },

  /** 課金・サブスクリプション */
  subscription: {
    /** ルートキー */
    all: ['subscription'] as const,
    /**
     * RevenueCat Offering（価格表示用）。
     * プレミアム判定には使わない — 判定の正は queryKeys.users.me の isPremium（billing.md）。
     */
    offering: ['subscription', 'offering'] as const,
  },
} as const;

// ---------------------------------------------------------------------------
// 補助型（クエリキーのパラメータ型）
// ---------------------------------------------------------------------------

/** 辞典一覧フィルタ */
export type DictionaryListParams = {
  search?: string;
  category?: string;
  row?: string;
};

/** 農薬系一覧の共通フィルタ（未使用フィールドは undefined） */
export type PesticideListParams = Record<string, string | number | undefined>;

/** アナリティクス集計期間 */
export type AnalyticsDays = '7' | '30' | '90';

/** イベント一覧フィルタ */
export type EventsFilter = {
  region?: string;
  prefecture?: string;
  showPast?: boolean;
  year?: number;
  month?: number;
};

/** 盆栽園一覧クエリパラメータ */
export type ShopsListParams = {
  search?: string;
  genreId?: string;
  prefecture?: string;
  /** 地方ブロック名でフィルタ。prefecture と同時指定した場合は prefecture が優先される */
  region?: string;
  sortBy?: 'rating' | 'name' | 'newest' | 'location';
};

/** ジャンル取得タイプ */
export type GenreType = 'shop' | 'post';

/**
 * ハッシュタグ/ジャンル別投稿一覧のパラメータ（排他）。
 * hashtag と genreId はどちらか一方のみ指定可。
 * 両方指定 / 両方未指定はサーバーが 400 VALIDATION_ERROR を返す。
 */
export type ExplorePostsParams =
  | { hashtag: string; genreId?: never }
  | { genreId: string; hashtag?: never };

/** 手入れログ一覧のフィルタパラメータ */
export type CareLogsParams = {
  from?: string;
  to?: string;
};
