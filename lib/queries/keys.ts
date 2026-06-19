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
  },

  /** 通知 */
  notifications: {
    /** ルートキー */
    all: ['notifications'] as const,
    /** 通知一覧（無限スクロール） */
    list: () => ['notifications', 'list'] as const,
    /** 未読件数 */
    unreadCount: ['notifications', 'unreadCount'] as const,
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
} as const;
