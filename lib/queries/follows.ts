/**
 * @module lib/queries/follows
 * フォロートグルミューテーションフック（楽観更新付き）＋フォローリクエスト管理フック。
 *
 * v1.4.0 以降: UserProfileResponse / SearchUsersResponse.items に following/requested が含まれる。
 * フォロー状態は users.detail と search.users キャッシュから直接読み書きする。
 *
 * v1.21.0 以降: フォローリクエスト一覧・承認・拒否を追加。
 *
 * invalidation-map.md 参照。
 */

import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import {
  FOLLOW_REQUESTS_PAGE_SIZE,
  USER_FOLLOWERS_PAGE_SIZE,
  USER_FOLLOWING_PAGE_SIZE,
} from '@/lib/constants/limits/pagination';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import type { components } from '@/lib/api/generated/schema.d.ts';

type FollowResponse = components['schemas']['FollowResponse'];
type UserProfileResponse = components['schemas']['UserProfileResponse'];
type SearchUsersResponse = components['schemas']['SearchUsersResponse'];
type FollowRequestsListResponse = components['schemas']['FollowRequestsListResponse'];
type SuccessResponse = components['schemas']['SuccessResponse'];
export type UserConnectionsListResponse = components['schemas']['UserConnectionsListResponse'];
export type UserConnectionItem = components['schemas']['UserConnectionItem'];

/** フォローリクエスト 1 件の型。requester に bio が含まれる点に注意。 */
export type FollowRequestItem = components['schemas']['FollowRequestItem'];

export type ToggleFollowParams = {
  userId: string;
  /**
   * isActive = following || requested。
   * true → 解除/取消(DELETE)、false → フォロー/リクエスト(POST)。
   */
  isActive: boolean;
  /**
   * 対象ユーザーが公開アカウントか。
   * フォロー時の楽観更新で「公開 → following:true」「非公開 → requested:true」を出し分けるために使う。
   * 解除/取消(isActive=true)では参照しない。
   */
  isPublic: boolean;
};

type FollowSnapshot = {
  profileData: UserProfileResponse | undefined;
  searchSnapshot: [QueryKey, InfiniteData<SearchUsersResponse>][];
};

/**
 * フォローをトグルするミューテーション。
 * isActive=true → DELETE（フォロー解除またはリクエスト取消）
 * isActive=false → POST（フォロー確立またはリクエスト送信）
 *
 * 楽観更新: users.detail(userId) の following/requested/followersCount と
 *   検索キャッシュ(search.users)の該当 item の following/requested を即時更新する。
 * onSuccess: FollowResponse の確定値で users.detail と検索 item を上書きする。
 * onError: スナップショットからロールバックする。
 * onSettled: users.detail(userId) と posts.feed() を invalidate する。
 *
 * 自己フォロー(400 VALIDATION_ERROR) / ブロック・不存在・停止(404 NOT_FOUND) は ApiError をそのまま throw する。
 */
export function useToggleFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation<FollowResponse, Error, ToggleFollowParams, FollowSnapshot>({
    mutationFn: async ({ userId, isActive }) => {
      if (isActive) {
        const { data, error } = await apiClient.DELETE('/api/v1/users/{id}/follow', {
          params: { path: { id: userId } },
        });
        if (error !== undefined || data === undefined) {
          throw error ?? new Error('Unexpected error removing follow');
        }
        return data;
      } else {
        const { data, error } = await apiClient.POST('/api/v1/users/{id}/follow', {
          params: { path: { id: userId } },
        });
        if (error !== undefined || data === undefined) {
          throw error ?? new Error('Unexpected error adding follow');
        }
        return data;
      }
    },

    onMutate: async ({ userId, isActive, isPublic }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(userId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.search.all });

      const profileData = queryClient.getQueryData<UserProfileResponse>(
        queryKeys.users.detail(userId)
      );

      // 検索キャッシュ（複数クエリキーが存在するため search.all プレフィックスで全件収集）
      const allSearchCache = queryClient.getQueriesData<InfiniteData<SearchUsersResponse>>({
        queryKey: queryKeys.search.all,
      });
      const searchSnapshot: [QueryKey, InfiniteData<SearchUsersResponse>][] = allSearchCache
        .filter((entry): entry is [QueryKey, InfiniteData<SearchUsersResponse>] => entry[1] !== undefined);

      // プロフィールキャッシュの楽観更新
      if (profileData !== undefined) {
        let optimisticFollowing: boolean;
        let optimisticRequested: boolean;
        let followersDelta: number;

        if (isActive) {
          // 解除/取消: 直前状態から followersCount 変化を判断する
          // following だったなら -1、requested（リクエスト取消）は 0
          followersDelta = profileData.following ? -1 : 0;
          optimisticFollowing = false;
          optimisticRequested = false;
        } else {
          // フォロー/リクエスト送信
          if (isPublic) {
            optimisticFollowing = true;
            optimisticRequested = false;
            followersDelta = 1;
          } else {
            optimisticFollowing = false;
            optimisticRequested = true;
            followersDelta = 0;
          }
        }

        queryClient.setQueryData<UserProfileResponse>(queryKeys.users.detail(userId), {
          ...profileData,
          following: optimisticFollowing,
          requested: optimisticRequested,
          followersCount: profileData.followersCount + followersDelta,
        });
      }

      // 検索キャッシュの楽観更新（該当 userId の item の following/requested を更新）
      for (const [key, data] of allSearchCache) {
        if (data === undefined) continue;
        const optimisticFollowing = !isActive && isPublic;
        const optimisticRequested = !isActive && !isPublic;
        queryClient.setQueryData<InfiniteData<SearchUsersResponse>>(key, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === userId
                ? { ...item, following: optimisticFollowing, requested: optimisticRequested }
                : item
            ),
          })),
        });
      }

      return { profileData, searchSnapshot };
    },

    onError: (_error, { userId }, snapshot) => {
      if (snapshot === undefined) return;
      if (snapshot.profileData !== undefined) {
        queryClient.setQueryData(queryKeys.users.detail(userId), snapshot.profileData);
      }
      for (const [key, data] of snapshot.searchSnapshot) {
        queryClient.setQueryData(key, data);
      }
    },

    onSuccess: (response, { userId }) => {
      // プロフィールキャッシュを確定値で上書きする
      const profileData = queryClient.getQueryData<UserProfileResponse>(
        queryKeys.users.detail(userId)
      );
      if (profileData !== undefined) {
        queryClient.setQueryData<UserProfileResponse>(queryKeys.users.detail(userId), {
          ...profileData,
          following: response.following,
          requested: response.requested,
          followersCount: response.followerCount,
        });
      }

      // 検索キャッシュも確定値で上書きする
      const allSearchCache = queryClient.getQueriesData<InfiniteData<SearchUsersResponse>>({
        queryKey: queryKeys.search.all,
      });
      for (const [key, data] of allSearchCache) {
        if (data === undefined) continue;
        queryClient.setQueryData<InfiniteData<SearchUsersResponse>>(key, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === userId
                ? { ...item, following: response.following, requested: response.requested }
                : item
            ),
          })),
        });
      }
    },

    onSettled: (_data, _error, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
    },
  });
}

// ---------------------------------------------------------------------------
// useFollowRequestsQuery
// ---------------------------------------------------------------------------

/**
 * 受信フォローリクエスト一覧の無限スクロールクエリ（GET /api/v1/users/me/follow-requests）。
 * pending 状態のリクエストのみ返す（承認/拒否済みは含まない）。
 * ゲスト不可（403 GUEST_NOT_ALLOWED）— ApiError をそのまま throw する。
 */
export function useFollowRequestsQuery() {
  return useInfiniteQuery<
    FollowRequestsListResponse,
    Error,
    InfiniteData<FollowRequestsListResponse>,
    ReturnType<typeof queryKeys.followRequests.list>,
    string | undefined
  >({
    queryKey: queryKeys.followRequests.list(),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/users/me/follow-requests', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: FOLLOW_REQUESTS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching follow requests');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
  });
}

// ---------------------------------------------------------------------------
// useApproveFollowRequestMutation
// ---------------------------------------------------------------------------

/**
 * フォローリクエストを承認するミューテーション（POST /api/v1/users/me/follow-requests/{id}/approve）。
 * 冪等（既承認/拒否済みも 200）。他者のリクエスト/不存在は 404 をそのまま throw する。
 * onSuccess: フォローリクエスト一覧から該当 id を除去 + users.detail(requesterId) と
 *   notifications.unreadCount / notifications.list を invalidate する。
 */
export function useApproveFollowRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<SuccessResponse, Error, { requestId: string; requesterId: string }>({
    mutationFn: async ({ requestId }) => {
      const { data, error } = await apiClient.POST(
        '/api/v1/users/me/follow-requests/{id}/approve',
        { params: { path: { id: requestId } } }
      );
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error approving follow request');
      }
      return data;
    },

    onSuccess: (_data, { requestId, requesterId }) => {
      // フォローリクエスト一覧から承認済み id を除去する
      const listData = queryClient.getQueryData<InfiniteData<FollowRequestsListResponse>>(
        queryKeys.followRequests.list()
      );
      if (listData !== undefined) {
        queryClient.setQueryData<InfiniteData<FollowRequestsListResponse>>(
          queryKeys.followRequests.list(),
          {
            ...listData,
            pages: listData.pages.map((page) => ({
              ...page,
              requests: page.requests.filter((req) => req.id !== requestId),
            })),
          }
        );
      }

      // 承認によりフォロー関係が成立したため関連キャッシュを invalidate する
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(requesterId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    },
  });
}

// ---------------------------------------------------------------------------
// useRejectFollowRequestMutation
// ---------------------------------------------------------------------------

/**
 * フォローリクエストを拒否するミューテーション（POST /api/v1/users/me/follow-requests/{id}/reject）。
 * 他者のリクエスト/不存在は 404 をそのまま throw する。通知なし。
 * onSuccess: フォローリクエスト一覧から該当 id を除去する。
 */
export function useRejectFollowRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<SuccessResponse, Error, { requestId: string }>({
    mutationFn: async ({ requestId }) => {
      const { data, error } = await apiClient.POST(
        '/api/v1/users/me/follow-requests/{id}/reject',
        { params: { path: { id: requestId } } }
      );
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error rejecting follow request');
      }
      return data;
    },

    onSuccess: (_data, { requestId }) => {
      // フォローリクエスト一覧から拒否済み id を除去する
      const listData = queryClient.getQueryData<InfiniteData<FollowRequestsListResponse>>(
        queryKeys.followRequests.list()
      );
      if (listData !== undefined) {
        queryClient.setQueryData<InfiniteData<FollowRequestsListResponse>>(
          queryKeys.followRequests.list(),
          {
            ...listData,
            pages: listData.pages.map((page) => ({
              ...page,
              requests: page.requests.filter((req) => req.id !== requestId),
            })),
          }
        );
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useUserFollowersQuery / useUserFollowingQuery
// ---------------------------------------------------------------------------

/**
 * 指定ユーザーのフォロワー一覧の無限スクロールクエリ（GET /api/v1/users/{id}/followers）。
 * カーソルは followerId 側（createdAt DESC 順）。
 * 非公開アカウントはフォロワー以外には 403 FORBIDDEN を返す（ApiError をそのまま throw）。
 * userId が空文字の場合はフェッチを行わない（enabled=false）。
 *
 * following（フォロー中一覧）とはカーソルの意味が異なるため、queryKeys.users.followers で
 * キャッシュを分離する（同一キーで混用しない）。
 */
export function useUserFollowersQuery(userId: string) {
  return useInfiniteQuery<
    UserConnectionsListResponse,
    Error,
    InfiniteData<UserConnectionsListResponse>,
    ReturnType<typeof queryKeys.users.followers>,
    string | undefined
  >({
    queryKey: queryKeys.users.followers(userId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/users/{id}/followers', {
        params: {
          path: { id: userId },
          query: {
            cursor: pageParam ?? undefined,
            limit: USER_FOLLOWERS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching followers');
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
 * 指定ユーザーのフォロー中一覧の無限スクロールクエリ（GET /api/v1/users/{id}/following）。
 * カーソルは followingId 側（createdAt DESC 順）。
 * 非公開アカウントはフォロワー以外には 403 FORBIDDEN を返す（ApiError をそのまま throw）。
 * userId が空文字の場合はフェッチを行わない（enabled=false）。
 *
 * followers（フォロワー一覧）とはカーソルの意味が異なるため、queryKeys.users.following で
 * キャッシュを分離する（同一キーで混用しない）。
 */
export function useUserFollowingQuery(userId: string) {
  return useInfiniteQuery<
    UserConnectionsListResponse,
    Error,
    InfiniteData<UserConnectionsListResponse>,
    ReturnType<typeof queryKeys.users.following>,
    string | undefined
  >({
    queryKey: queryKeys.users.following(userId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/users/{id}/following', {
        params: {
          path: { id: userId },
          query: {
            cursor: pageParam ?? undefined,
            limit: USER_FOLLOWING_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching following');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_STANDARD,
    enabled: userId.length > 0,
  });
}
