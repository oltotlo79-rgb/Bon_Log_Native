/**
 * @module lib/queries/follows
 * フォロートグルミューテーションフック（楽観更新付き）。
 *
 * v1.4.0 以降: UserProfileResponse / SearchUsersResponse.items に following/requested が含まれる。
 * フォロー状態は users.detail と search.users キャッシュから直接読み書きする。
 *
 * invalidation-map.md 参照。
 */

import { useMutation, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

type FollowResponse = components['schemas']['FollowResponse'];
type UserProfileResponse = components['schemas']['UserProfileResponse'];
type SearchUsersResponse = components['schemas']['SearchUsersResponse'];

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
