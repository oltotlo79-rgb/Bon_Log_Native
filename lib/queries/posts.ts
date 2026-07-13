/**
 * @module lib/queries/posts
 * 投稿詳細クエリ・ユーザー投稿一覧クエリ・投稿 CRUD / リポスト / 引用 / 投票ミューテーションフック。
 */

import { useQuery, useMutation, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { USER_POSTS_PAGE_SIZE, USER_LIKED_POSTS_PAGE_SIZE } from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type PostDetail = components['schemas']['PostResponse'];
export type PostResponse = components['schemas']['PostResponse'];
export type SuccessResponse = components['schemas']['SuccessResponse'];
export type RepostResponse = components['schemas']['RepostResponse'];
export type PollVoteResponse = components['schemas']['PollVoteResponse'];
export type UserPostsResponse = components['schemas']['UserPostsResponse'];
export type UserLikesResponse = components['schemas']['UserLikesResponse'];

// ---------------------------------------------------------------------------
// クエリ
// ---------------------------------------------------------------------------

/**
 * 投稿詳細クエリ。
 * 不可視・ブロック済み投稿はサーバーが 404 を返す（一律）。
 * id が空文字の場合はフェッチを行わない（enabled=false）。
 */
export function usePostQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/posts/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching post');
      }
      return data;
    },
    staleTime: STALE_TIME_STANDARD,
    enabled: id.length > 0,
  });
}

// ---------------------------------------------------------------------------
// ミューテーション
// ---------------------------------------------------------------------------

export type CreatePostPoll = {
  options: string[];
  durationSeconds?: number;
};

export type CreatePostParams = {
  content: string;
  genreIds: string[];
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
  /** アンケート付き投稿にする場合に指定する。指定しない場合は通常投稿 */
  poll?: CreatePostPoll;
  /**
   * 紐付ける盆栽の ID（任意）。省略時は紐付けなし。
   * 他人・不存在の盆栽 ID を指定した場合は 404 NOT_FOUND（messageForPostBonsaiError 参照）。
   */
  bonsaiId?: string | null;
};

/**
 * 投稿を作成するミューテーション。
 *
 * 楽観更新しない（ファイルアップロード後の複合操作のため送信中 UI を出す）。
 * onSettled: posts.feed() と自分の users.detail(currentUserId) を invalidate する。
 * currentUserId は onSettled コールバック外から渡す必要があるため、
 * frontend は onSuccess/onSettled フックで queryClient を使って追加 invalidate できる。
 *
 * invalidation-map.md 参照: 投稿作成 → posts.feed() / users.detail(userId)。
 */
export function useCreatePostMutation(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation<PostResponse, Error, CreatePostParams>({
    mutationFn: async ({ content, genreIds, mediaUrls, mediaTypes, poll, bonsaiId }) => {
      const pollBody = poll !== undefined
        ? { options: poll.options, durationSeconds: poll.durationSeconds ?? 86400 }
        : undefined;
      const { data, error } = await apiClient.POST('/api/v1/posts', {
        body: { content, genreIds, mediaUrls, mediaTypes, poll: pollBody, bonsaiId },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating post');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
      if (currentUserId.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(currentUserId),
        });
      }
    },
  });
}

export type UpdatePostParams = {
  id: string;
  content: string;
  genreIds: string[];
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
  /**
   * 紐付ける盆栽の ID の三値制御。キー省略（undefined）＝現状維持、null＝紐付け解除、
   * 文字列＝紐付け設定。呼び出し側がキー自体を省略すると JSON シリアライズ時に
   * bonsaiId が送信されず「維持」として扱われる（サーバー側の PATCH 部分更新契約）。
   * 他人・不存在の盆栽 ID を指定した場合は 404 NOT_FOUND（messageForPostBonsaiError 参照）。
   */
  bonsaiId?: string | null;
};

/**
 * 投稿を編集するミューテーション（所有者のみ）。
 *
 * 楽観更新しない（メディア差し替え等の複合操作のため送信中 UI を出す）。
 * onSettled: posts.detail(id) と posts.feed() を invalidate する。
 *
 * invalidation-map.md 参照: 投稿更新 → posts.detail(id) / posts.feed()。
 */
export function useUpdatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation<PostResponse, Error, UpdatePostParams>({
    mutationFn: async ({ id, content, genreIds, mediaUrls, mediaTypes, bonsaiId }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/posts/{id}', {
        params: { path: { id } },
        body: { content, genreIds, mediaUrls, mediaTypes, bonsaiId },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error updating post');
      }
      return data;
    },

    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
    },
  });
}

export type DeletePostParams = {
  id: string;
};

/**
 * 投稿を削除するミューテーション（所有者のみ）。
 *
 * onSettled: posts.all（投稿系一括）と自分の users.detail(currentUserId) を invalidate する。
 *
 * invalidation-map.md 参照: 投稿削除 → posts.all / users.detail(userId)。
 */
export function useDeletePostMutation(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation<SuccessResponse, Error, DeletePostParams>({
    mutationFn: async ({ id }) => {
      const { data, error } = await apiClient.DELETE('/api/v1/posts/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error deleting post');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      if (currentUserId.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(currentUserId),
        });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// ユーザー投稿一覧クエリ
// ---------------------------------------------------------------------------

/**
 * 指定ユーザーの投稿一覧をカーソルページネーションで取得する無限スクロールクエリ。
 * 非公開アカウントへの非フォロワーアクセスはサーバーが 403 を返す。
 * userId が空文字の場合はフェッチを行わない（enabled=false）。
 *
 * invalidation-map.md 参照: ユーザー投稿一覧 → ミューテーション側から users.posts(userId) を invalidate。
 */
export function useUserPostsQuery(userId: string) {
  return useInfiniteQuery<
    UserPostsResponse,
    Error,
    InfiniteData<UserPostsResponse>,
    ReturnType<typeof queryKeys.users.posts>,
    string | undefined
  >({
    queryKey: queryKeys.users.posts(userId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/users/{id}/posts', {
        params: {
          path: { id: userId },
          query: {
            cursor: pageParam ?? undefined,
            limit: USER_POSTS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching user posts');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: userId.length > 0,
  });
}

/**
 * 指定ユーザーがいいねした投稿一覧をカーソルページネーションで取得する無限スクロールクエリ。
 * 非公開アカウントへの非フォロワーアクセスはサーバーが 403 を返す。ゲストアクセス可（公開アカウントのみ）。
 * isLiked / isBookmarked / isReposted は閲覧者基準（対象ユーザー基準ではない）で解決される。
 * userId が空文字の場合はフェッチを行わない（enabled=false）。
 *
 * invalidation-map.md 参照: ユーザーいいね一覧 → 現状は明示的な invalidate 対象に含めない
 * （低頻度画面のため次回表示時の自然な stale 更新に委ねる）。
 */
export function useUserLikedPostsQuery(userId: string) {
  return useInfiniteQuery<
    UserLikesResponse,
    Error,
    InfiniteData<UserLikesResponse>,
    ReturnType<typeof queryKeys.users.likes>,
    string | undefined
  >({
    queryKey: queryKeys.users.likes(userId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/users/{id}/likes', {
        params: {
          path: { id: userId },
          query: {
            cursor: pageParam ?? undefined,
            limit: USER_LIKED_POSTS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching user liked posts');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: userId.length > 0,
  });
}

// ---------------------------------------------------------------------------
// リポスト
// ---------------------------------------------------------------------------

export type ToggleRepostParams = {
  postId: string;
  /** 操作前のリポスト状態。true → 解除(DELETE)、false → リポスト(POST) */
  reposted: boolean;
};

/** 楽観更新のロールバック用スナップショット型（リポスト） */
type RepostSnapshot = {
  feedData: InfiniteData<components['schemas']['FeedResponse']> | undefined;
  detailData: PostResponse | undefined;
};

/**
 * リポストをトグルするミューテーション。
 * reposted が false → POST（リポスト）、true → DELETE（解除）。
 * いいねトグルと同じ設計（楽観更新 + onError ロールバック + onSettled invalidate）。
 *
 * invalidation-map.md 参照: リポスト/解除 → 楽観更新 + posts.detail(postId) のみ onSettled invalidate。
 */
export function useToggleRepostMutation() {
  const queryClient = useQueryClient();

  return useMutation<RepostResponse, Error, ToggleRepostParams, RepostSnapshot>({
    mutationFn: async ({ postId, reposted }) => {
      if (reposted) {
        const { data, error } = await apiClient.DELETE('/api/v1/posts/{id}/repost', {
          params: { path: { id: postId } },
        });
        if (error !== undefined || data === undefined) {
          throw error ?? new Error('Unexpected error removing repost');
        }
        return data;
      } else {
        const { data, error } = await apiClient.POST('/api/v1/posts/{id}/repost', {
          params: { path: { id: postId } },
        });
        if (error !== undefined || data === undefined) {
          throw error ?? new Error('Unexpected error adding repost');
        }
        return data;
      }
    },

    onMutate: async ({ postId, reposted }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.feed() });
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(postId) });

      const feedData = queryClient.getQueryData<InfiniteData<components['schemas']['FeedResponse']>>(
        queryKeys.posts.feed()
      );
      const detailData = queryClient.getQueryData<PostResponse>(queryKeys.posts.detail(postId));

      const delta = reposted ? -1 : 1;

      if (feedData !== undefined) {
        queryClient.setQueryData<InfiniteData<components['schemas']['FeedResponse']>>(
          queryKeys.posts.feed(),
          {
            ...feedData,
            pages: feedData.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === postId
                  ? { ...item, isReposted: !reposted, repostCount: item.repostCount + delta }
                  : item
              ),
            })),
          }
        );
      }

      if (detailData !== undefined) {
        queryClient.setQueryData<PostResponse>(queryKeys.posts.detail(postId), {
          ...detailData,
          isReposted: !reposted,
          repostCount: detailData.repostCount + delta,
        });
      }

      return { feedData, detailData };
    },

    onError: (_error, { postId }, snapshot) => {
      if (snapshot === undefined) return;

      if (snapshot.feedData !== undefined) {
        queryClient.setQueryData(queryKeys.posts.feed(), snapshot.feedData);
      }
      if (snapshot.detailData !== undefined) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), snapshot.detailData);
      }
    },

    onSettled: (_data, _error, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });
}

// ---------------------------------------------------------------------------
// 引用投稿
// ---------------------------------------------------------------------------

export type QuotePostParams = {
  /** 引用元の投稿 ID */
  quotedPostId: string;
  content: string;
  genreIds?: string[];
  mediaUrls?: string[];
  mediaTypes?: ('image' | 'video')[];
};

/**
 * 引用投稿を作成するミューテーション。
 * 楽観更新はしない（ファイルアップロード後の複合操作の可能性があるため）。
 * onSettled: posts.feed() と自分の users.posts(currentUserId) を invalidate する。
 *
 * invalidation-map.md 参照: 引用投稿 → posts.feed() / users.posts(currentUserId)。
 */
export function useQuotePostMutation(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation<PostResponse, Error, QuotePostParams>({
    mutationFn: async ({ quotedPostId, content, genreIds = [], mediaUrls = [], mediaTypes = [] }) => {
      const { data, error } = await apiClient.POST('/api/v1/posts/{id}/quote', {
        params: { path: { id: quotedPostId } },
        body: { content, genreIds, mediaUrls, mediaTypes },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error creating quote post');
      }
      return data;
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
      if (currentUserId.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.users.posts(currentUserId),
        });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// アンケート投票
// ---------------------------------------------------------------------------

export type VotePollParams = {
  pollId: string;
  optionId: string;
  /** 関連する投稿 ID。指定した場合は投稿詳細を invalidate する */
  postId?: string;
};

/**
 * アンケートに投票するミューテーション。
 * 楽観更新はしない（二重投票・期限切れ・不正 optionId の拒否がありロールバックが複雑になるため）。
 * postId がある場合は posts.detail(postId) を、ない場合は posts.all を invalidate する。
 *
 * invalidation-map.md 参照: アンケート投票 → posts.detail(postId) または posts.all。
 */
export function useVotePollMutation() {
  const queryClient = useQueryClient();

  return useMutation<PollVoteResponse, Error, VotePollParams>({
    mutationFn: async ({ pollId, optionId }) => {
      const { data, error } = await apiClient.POST('/api/v1/polls/{id}/vote', {
        params: { path: { id: pollId } },
        body: { optionId },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error voting on poll');
      }
      return data;
    },

    onSettled: (_data, _error, { postId }) => {
      if (postId !== undefined && postId.length > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      }
    },
  });
}
