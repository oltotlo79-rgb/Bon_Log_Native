/**
 * @module lib/queries/follows
 * フォロートグルミューテーションフック（楽観更新付き）。
 *
 * 設計上の制約:
 * UserProfileResponse には following/requested フィールドが含まれない。
 * そのため following/requested の状態は queryKeys.users.followState(userId) という
 * 専用の非同期クエリキーで管理し、ミューテーション結果を onSuccess で setQueryData する。
 * プロフィール画面でフォローボタンの状態を表示するには useFollowStateQuery を使うこと。
 *
 * invalidation-map.md 参照:
 * - followersCount の楽観更新 → onError でロールバック
 * - following/requested は楽観更新せず、onSuccess で確定値を setQueryData
 * - onSettled で users.detail(userId) と posts.feed() を invalidate
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import type { components } from '@/lib/api/generated/schema.d.ts';

type FollowResponse = components['schemas']['FollowResponse'];
type UserProfileResponse = components['schemas']['UserProfileResponse'];

/**
 * フォロー状態（following/requested）のクエリキー。
 * UserProfileResponse に含まれないため専用キーで管理する。
 * frontend が useFollowStateQuery 経由でフォローボタンの状態を取得すること。
 */

export type FollowState = {
  following: boolean;
  requested: boolean;
};

/** フォロー状態のクエリ（GET /api/v1/users/{id}/follow-state は存在しないためミューテーション結果のみ保持）。
 * 初期値は null。useToggleFollowMutation の onSuccess で setQueryData により FollowState が注入される。
 * プロフィール画面は useUserProfileQuery とこのクエリを両方参照する。
 */
export function useFollowStateQuery(userId: string) {
  return useQuery<FollowState | null>({
    queryKey: queryKeys.users.followState(userId),
    // サーバーに follow-state 専用エンドポイントがないため null を返す。
    // ミューテーション結果が setQueryData で注入されるまで null が続く。
    queryFn: () => null,
    // staleTime を Infinity にしてバックグラウンドフェッチを行わない
    staleTime: Infinity,
    enabled: userId.length > 0,
  });
}

export type ToggleFollowParams = {
  userId: string;
  /**
   * isActive = following || requested。
   * true → 解除/取消(DELETE)、false → フォロー/リクエスト(POST)。
   */
  isActive: boolean;
};

type FollowSnapshot = {
  profileData: UserProfileResponse | undefined;
};

/**
 * フォローをトグルするミューテーション。
 * isActive=true → DELETE（フォロー解除またはリクエスト取消）
 * isActive=false → POST（フォロー確立またはリクエスト送信）
 *
 * 楽観更新: followersCount のみ（+1/-1）。following/requested はサーバー応答確定まで更新しない。
 * onSuccess: FollowResponse の確定値（following/requested/followerCount）を
 *   queryKeys.users.followState(userId) と queryKeys.users.detail(userId) に setQueryData する。
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

    onMutate: async ({ userId, isActive }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(userId) });

      const profileData = queryClient.getQueryData<UserProfileResponse>(
        queryKeys.users.detail(userId)
      );

      // followersCount のみ楽観更新する
      if (profileData !== undefined) {
        const followersDelta = isActive ? -1 : 1;
        queryClient.setQueryData<UserProfileResponse>(queryKeys.users.detail(userId), {
          ...profileData,
          followersCount: profileData.followersCount + followersDelta,
        });
      }

      return { profileData };
    },

    onError: (_error, { userId }, snapshot) => {
      if (snapshot === undefined) return;
      if (snapshot.profileData !== undefined) {
        queryClient.setQueryData(queryKeys.users.detail(userId), snapshot.profileData);
      }
    },

    onSuccess: (response, { userId }) => {
      // following/requested の確定値を専用キーに保存する（フォローボタンの状態管理）
      const followState: FollowState = {
        following: response.following,
        requested: response.requested,
      };
      queryClient.setQueryData(queryKeys.users.followState(userId), followState);

      // プロフィールの followersCount を確定値で上書きする
      const profileData = queryClient.getQueryData<UserProfileResponse>(
        queryKeys.users.detail(userId)
      );
      if (profileData !== undefined) {
        queryClient.setQueryData<UserProfileResponse>(queryKeys.users.detail(userId), {
          ...profileData,
          followersCount: response.followerCount,
        });
      }
    },

    onSettled: (_data, _error, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
    },
  });
}
