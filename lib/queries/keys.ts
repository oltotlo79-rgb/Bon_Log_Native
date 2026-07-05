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
    /** ユーザーコメント一覧（GET /api/v1/users/{id}/comments・無限スクロール） */
    comments: (userId: string) => ['users', 'comments', userId] as const,
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
    /** 投稿検索（フィルタ付き。フィルタが異なると別キャッシュになる） */
    posts: (query: string, filter?: SearchPostsFilter) => ['search', 'posts', query, filter ?? {}] as const,
    /** ユーザー検索 */
    users: (query: string) => ['search', 'users', query] as const,
    /** ハッシュタグ候補検索（オートコンプリート） */
    hashtags: (query: string, limit?: number) => ['search', 'hashtags', query, limit] as const,
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
    /** 施肥コラム一覧（カーソルページネーション・任意 category フィルタ） */
    columns: (category?: string) => ['fertilizers', 'columns', category] as const,
    /** 施肥コラム詳細 */
    columnDetail: (slug: string) => ['fertilizers', 'columnDetail', slug] as const,
  },

  /** 植物ホルモン */
  hormones: {
    /** ルートキー */
    all: ['hormones'] as const,
    /** ホルモン一覧 */
    list: (category?: string) => ['hormones', 'list', category] as const,
    /** ホルモン詳細 */
    detail: (slug: string) => ['hormones', 'detail', slug] as const,
    /** 相互作用全件（ページネーションなし） */
    interactions: ['hormones', 'interactions'] as const,
    /** 技法全件（ページネーションなし・techniqueKey 単位グループ化） */
    techniques: ['hormones', 'techniques'] as const,
    /** シミュレーター用一括データ */
    simulator: ['hormones', 'simulator'] as const,
    /** ホルモンコラム一覧（カーソルページネーション） */
    columns: ['hormones', 'columns'] as const,
    /** ホルモンコラム詳細 */
    columnDetail: (slug: string) => ['hormones', 'columnDetail', slug] as const,
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
    /** 展着剤タイプ一覧（全件・ページネーションなし） */
    spreaderTypes: ['pesticides', 'spreaderTypes'] as const,
    /** 展着剤タイプ詳細 */
    spreaderTypeDetail: (slug: string) => ['pesticides', 'spreaderTypeDetail', slug] as const,
    /** 展着剤製品一覧（カーソルページネーション） */
    spreaderProducts: ['pesticides', 'spreaderProducts'] as const,
    /** 農薬コラム一覧（カーソルページネーション） */
    columns: ['pesticides', 'columns'] as const,
    /** 農薬コラム詳細 */
    columnDetail: (slug: string) => ['pesticides', 'columnDetail', slug] as const,
    /** 剤型マスタ全件 */
    formulations: ['pesticides', 'formulations'] as const,
    /** 混用チェッカー全データ */
    mixingData: ['pesticides', 'mixingData'] as const,
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
    /** 投稿分析 */
    posts: (days: AnalyticsPeriod) => ['analytics', 'posts', days] as const,
    /** いいね分析 */
    likes: (days: AnalyticsPeriod) => ['analytics', 'likes', days] as const,
    /** 引用・リポスト分析（全期間。days パラメータなし） */
    quotes: ['analytics', 'quotes'] as const,
    /** キーワード分析 */
    keywords: (days: AnalyticsPeriod) => ['analytics', 'keywords', days] as const,
    /** 日次エンゲージメント推移 */
    engagementTrend: (days: AnalyticsPeriod) => ['analytics', 'engagementTrend', days] as const,
    /** ジャンル別パフォーマンス */
    genrePerformance: (days: AnalyticsPeriod) => ['analytics', 'genrePerformance', days] as const,
    /** フォロワー増加推移 */
    followerGrowth: (days: AnalyticsPeriod) => ['analytics', 'followerGrowth', days] as const,
    /** 期間比較 */
    periodComparison: (days: AnalyticsPeriod) => ['analytics', 'periodComparison', days] as const,
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
    /** 地図用全件ピン（ページネーションなし） */
    mapPins: ['shops', 'mapPins'] as const,
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

  /** DM（ダイレクトメッセージ） */
  messages: {
    /** ルートキー（messages 系の一括 invalidate 用） */
    all: ['messages'] as const,
    /** 会話一覧（無限スクロール） */
    conversations: () => ['messages', 'conversations'] as const,
    /**
     * 会話内メッセージ一覧（無限スクロール）。
     * nextCursor は最古メッセージの id（上向きページネーション）。
     */
    conversationMessages: (conversationId: string) =>
      ['messages', 'conversations', conversationId, 'messages'] as const,
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

/** アナリティクス集計期間（文字列。サーバー API クエリパラメータの型） */
export type AnalyticsDays = '7' | '30' | '90';

/**
 * アナリティクス集計期間（数値リテラルユニオン。frontend 向け公開 I/F）。
 * queryFn 内で AnalyticsDays への文字列変換を行う。
 */
export type AnalyticsPeriod = 7 | 30 | 90;

/**
 * イベント一覧フィルタ。
 * limit: 1 ページあたりの取得件数（省略時は EVENTS_PAGE_SIZE）。
 * カレンダー用の全件収集ではサーバーの id ベースカーソルの並び順不整合
 * （startDate 昇順に対し id 比較でページングしており、2 ページ目以降で
 * 取りこぼしが起き得る）を避けるため、MAX_PAGE_LIMIT を指定して
 * 1 ページで完結させることを優先する。
 */
export type EventsFilter = {
  region?: string;
  prefecture?: string;
  showPast?: boolean;
  year?: number;
  month?: number;
  limit?: number;
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

/** 投稿検索の追加フィルタ（mediaType は API スキーマのリテラルユニオンをミラー） */
export type SearchPostsFilter = {
  genreId?: string;
  dateFrom?: string;
  dateTo?: string;
  minLikes?: number;
  mediaType?: 'image' | 'video' | 'none';
};
