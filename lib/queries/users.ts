/**
 * @module lib/queries/users
 * ユーザープロフィールクエリフックおよびプロフィール編集・アカウント削除ミューテーションフック。
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import { STALE_TIME_STANDARD } from '@/lib/constants/query';
import { signOut } from '@/lib/auth/auth';
import type { components } from '@/lib/api/generated/schema.d.ts';

export type UserProfile = components['schemas']['UserProfileResponse'];
export type UsersMeFullResponse = components['schemas']['UsersMeFullResponse'];
export type SuccessResponse = components['schemas']['SuccessResponse'];
export type UpdateProfileRequest = components['schemas']['UpdateProfileRequest'];

// ---------------------------------------------------------------------------
// useCurrentUserProfileQuery
// ---------------------------------------------------------------------------

/**
 * プロフィール編集フォームの初期値プリフィル用クエリ。
 * queryKeys.users.meProfile キャッシュ（UsersMeFullResponse）を返す。
 *
 * キャッシュは useUpdateProfileMutation の onSuccess が書き込むため、
 * プロフィール編集画面を開く前に少なくとも 1 回 PATCH が成功している必要はない。
 * 初回起動（PATCH 未実施）では data が undefined になるため、
 * フォーム画面は isLoading ではなく data === undefined で「まだ取得できていない」状態を判別すること。
 *
 * birthDate は GET /api/v1/users/me が返さないため、PATCH 成功前の初回は undefined になる。
 * サーバー側に GET /api/v1/users/me の拡張（UsersMeFullResponse 返却）を依頼済み（引き継ぎ事項参照）。
 *
 * enabled オプションで認証状態に応じて無効化できる。
 */
export function useCurrentUserProfileQuery({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();

  return useQuery<UsersMeFullResponse>({
    queryKey: queryKeys.users.meProfile,
    queryFn: async (): Promise<UsersMeFullResponse> => {
      // meProfile キャッシュが存在すれば（PATCH 成功後）それを返す
      const cached = queryClient.getQueryData<UsersMeFullResponse>(queryKeys.users.meProfile);
      if (cached !== undefined) {
        return cached;
      }

      // キャッシュ未存在の場合、users.me（基本情報）と users.detail（プロフィール公開情報）を
      // 組み合わせて全フィールドを埋める。birthDate は取得できないため null を使う。
      // GET /api/v1/users/me を全フィールド返却に拡張した後は、このフォールバック分岐を削除できる。
      const { data: meData, error: meError } = await apiClient.GET('/api/v1/users/me');
      if (meError !== undefined || meData === undefined) {
        throw meError ?? new Error('Unexpected error fetching current user');
      }

      const { data: profileData, error: profileError } = await apiClient.GET(
        '/api/v1/users/{id}',
        { params: { path: { id: meData.id } } }
      );
      if (profileError !== undefined || profileData === undefined) {
        throw profileError ?? new Error('Unexpected error fetching user profile');
      }

      // UserProfileResponse（公開情報）と UsersMeResponse（認証情報）を合成する。
      // birthDate は GET エンドポイントに存在しないため null を補完する。
      return {
        id: meData.id,
        email: meData.email,
        nickname: meData.nickname,
        avatarUrl: meData.avatarUrl,
        headerUrl: profileData.headerUrl,
        bio: profileData.bio,
        location: profileData.location,
        isPublic: profileData.isPublic,
        bonsaiStartYear: profileData.bonsaiStartYear,
        bonsaiStartMonth: profileData.bonsaiStartMonth,
        birthDate: null,
        isPremium: meData.isPremium,
        twoFactorEnabled: meData.twoFactorEnabled,
      };
    },
    staleTime: STALE_TIME_STANDARD,
    enabled,
  });
}

// ---------------------------------------------------------------------------
// クエリ
// ---------------------------------------------------------------------------

/**
 * 公開ユーザープロフィールクエリ（GET /api/v1/users/{id}）。
 * email 等の非公開フィールドは含まない（auth.ts の useCurrentUserQuery を使うこと）。
 * id が空文字の場合はフェッチを行わない（enabled=false）。
 */
export function useUserProfileQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/users/{id}', {
        params: { path: { id } },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching user profile');
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

/**
 * 認証ユーザーのプロフィールを部分更新するミューテーション。
 *
 * サーバーは 400 VALIDATION_ERROR（nickname 形式不正・予約語・外部画像 URL）を返す場合がある。
 * frontend はエラー種別を isApiError + error.code で判別してフォームへフィードバックすること。
 *
 * onSuccess: users.me と users.detail(currentUserId) を setQueryData で即時反映し、
 *   その後 invalidate で整合させる。
 * onSettled は使用せず onSuccess での setQueryData + invalidate で確定反映する。
 *
 * invalidation-map.md 参照: プロフィール更新 → users.detail(userId) / users.me。
 */
export function useUpdateProfileMutation(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation<UsersMeFullResponse, Error, UpdateProfileRequest>({
    mutationFn: async (body) => {
      const { data, error } = await apiClient.PATCH('/api/v1/users/me', {
        body,
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error updating profile');
      }
      return data;
    },

    onSuccess: (updatedProfile) => {
      // users.me キャッシュをサーバー確定値で上書きする
      queryClient.setQueryData(queryKeys.users.me, {
        id: updatedProfile.id,
        email: updatedProfile.email,
        nickname: updatedProfile.nickname,
        avatarUrl: updatedProfile.avatarUrl,
        bio: updatedProfile.bio,
        isPremium: updatedProfile.isPremium,
      });

      // users.meProfile キャッシュをサーバー確定値（全フィールド）で上書きする。
      // useCurrentUserProfileQuery はこのキャッシュを優先的に返すため、
      // PATCH 成功後はフォームの再表示で全フィールドが揃った値を得られる。
      queryClient.setQueryData<UsersMeFullResponse>(queryKeys.users.meProfile, updatedProfile);

      // users.detail キャッシュも即時反映する（フォロワー数等は維持）
      const existingProfile = queryClient.getQueryData<UserProfile>(
        queryKeys.users.detail(currentUserId)
      );
      if (existingProfile !== undefined) {
        queryClient.setQueryData<UserProfile>(queryKeys.users.detail(currentUserId), {
          ...existingProfile,
          nickname: updatedProfile.nickname,
          avatarUrl: updatedProfile.avatarUrl,
          headerUrl: updatedProfile.headerUrl,
          bio: updatedProfile.bio,
          location: updatedProfile.location,
          isPublic: updatedProfile.isPublic,
          bonsaiStartYear: updatedProfile.bonsaiStartYear,
          bonsaiStartMonth: updatedProfile.bonsaiStartMonth,
        });
      }

      // setQueryData で反映後、サーバーと整合させる
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.meProfile });
      if (currentUserId.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(currentUserId),
        });
      }
    },
  });
}

/**
 * 認証ユーザーのアカウントを削除するミューテーション（不可逆）。
 *
 * DELETE /api/v1/users/me — cascade 削除。
 *
 * サーバー削除成功後、および失敗時も fail-safe でローカル撤収（signOut）を実施する。
 * signOut: logout API → Push 解除 → トークン削除 → queryClient.clear() → signedOut 遷移。
 *
 * アカウント削除後はリフレッシュトークンが cascade 削除されるため、
 * signOut 内の logout API 呼び出しは冪等設計により安全に失敗する。
 */
export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation<SuccessResponse, Error, void>({
    mutationFn: async () => {
      const { data, error } = await apiClient.DELETE('/api/v1/users/me');
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error deleting account');
      }
      return data;
    },

    onSettled: async () => {
      // サーバー削除成功・失敗いずれの場合もローカルの撤収処理を実施する（fail-safe）。
      // アカウント削除後はリフレッシュトークンが cascade 削除済みのため、
      // signOut 内の logout API が失敗しても後続処理を続行する。
      await signOut(queryClient);
    },
  });
}
