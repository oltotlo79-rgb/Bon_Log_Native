/**
 * @module lib/queries/messages
 * DM（ダイレクトメッセージ）の会話・メッセージ取得クエリとミューテーションフック。
 * ポーリング前提（リアルタイム通信なし）。
 *
 * 存在秘匿仕様:
 * サーバーは非参加者・ブロック相手・不在ユーザーに対して HTTP 403 かつ body.error.code = "NOT_FOUND" を返す。
 * フックはこのエラーをそのまま伝播するため、UI 側で isApiError(e) && e.code === 'NOT_FOUND' かつ
 * e.status === 403 の場合を not-found として扱うこと。
 *
 * 429 自動リトライ禁止:
 * QueryClient のデフォルト retry（shouldRetry）は 4xx をリトライしない設定のため、
 * 429 の自動リトライは起こらない。ポーリング中に 429 を受信した場合も同様に止まる。
 */

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/queries/keys';
import {
  STALE_TIME_REALTIME,
  DM_CONVERSATIONS_REFETCH_INTERVAL_MS,
  DM_MESSAGES_REFETCH_INTERVAL_MS,
} from '@/lib/constants/query';
import {
  DM_CONVERSATIONS_PAGE_SIZE,
  DM_MESSAGES_PAGE_SIZE,
} from '@/lib/constants/limits/pagination';
import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// 公開型エイリアス（frontend 向け）
// ---------------------------------------------------------------------------

export type ConversationItem = components['schemas']['ConversationListResponse']['items'][number];
export type ConversationListResponse = components['schemas']['ConversationListResponse'];
export type StartConversationResponse = components['schemas']['StartConversationResponse'];
export type MessageItem = components['schemas']['MessageListResponse']['items'][number];
export type MessageListResponse = components['schemas']['MessageListResponse'];

// ---------------------------------------------------------------------------
// useConversationsQuery
// ---------------------------------------------------------------------------

/**
 * 自分が参加している会話一覧を取得するクエリ（無限スクロール）。
 * refetchInterval でポーリングを行い、未読バッジを定期更新する。
 * ゲスト不可（403 GUEST_NOT_ALLOWED）— ApiError をそのまま throw する。
 */
export function useConversationsQuery() {
  return useInfiniteQuery<
    ConversationListResponse,
    Error,
    InfiniteData<ConversationListResponse>,
    ReturnType<typeof queryKeys.messages.conversations>,
    string | undefined
  >({
    queryKey: queryKeys.messages.conversations(),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET('/api/v1/messages/conversations', {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: DM_CONVERSATIONS_PAGE_SIZE,
          },
        },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching conversations');
      }
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_REALTIME,
    refetchInterval: DM_CONVERSATIONS_REFETCH_INTERVAL_MS,
  });
}

// ---------------------------------------------------------------------------
// useStartConversationMutation
// ---------------------------------------------------------------------------

/**
 * 指定ユーザーとの会話を開始（または既存会話を取得）するミューテーション。
 * 成功後は会話一覧を invalidate して未読バッジを更新する。
 *
 * ブロック関係（双方向）は 403 NOT_FOUND（存在秘匿）として ApiError を throw する。
 * UI 側で isApiError(e) && e.code === 'NOT_FOUND' && e.status === 403 を
 * not-found として扱うこと。
 */
export function useStartConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation<StartConversationResponse, Error, { targetUserId: string }>({
    mutationFn: async ({ targetUserId }) => {
      const { data, error } = await apiClient.POST('/api/v1/messages/conversations', {
        body: { targetUserId },
      });
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error starting conversation');
      }
      return data;
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversations(),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useMessagesQuery
// ---------------------------------------------------------------------------

/**
 * 指定会話のメッセージ一覧を取得するクエリ（無限スクロール・上向きページネーション）。
 * nextCursor は最古メッセージの id。前ページ取得で「さらに古いメッセージ」を読み込む。
 *
 * GET するたびサーバーが lastReadAt を更新するため、queryFn 内で会話一覧を invalidate し
 * 未読バッジを最新化する。invalidate は非同期で行い queryFn の戻り値に影響させない。
 *
 * conversationId が空文字の場合は enabled: false でクエリを無効化する。
 * 非参加者は 403 NOT_FOUND（存在秘匿）— ApiError をそのまま throw する。
 */
export function useMessagesQuery(conversationId: string) {
  const queryClient = useQueryClient();

  return useInfiniteQuery<
    MessageListResponse,
    Error,
    InfiniteData<MessageListResponse>,
    ReturnType<typeof queryKeys.messages.conversationMessages>,
    string | undefined
  >({
    queryKey: queryKeys.messages.conversationMessages(conversationId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET(
        '/api/v1/messages/conversations/{id}/messages',
        {
          params: {
            path: { id: conversationId },
            query: {
              cursor: pageParam ?? undefined,
              limit: DM_MESSAGES_PAGE_SIZE,
            },
          },
        }
      );
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error fetching messages');
      }
      // GETするたびサーバーが lastReadAt を更新するため、会話一覧の未読バッジを同期する。
      // void で非同期に実行し、invalidate の完了を待たずにデータを返す。
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversations(),
      });
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_REALTIME,
    refetchInterval: DM_MESSAGES_REFETCH_INTERVAL_MS,
    enabled: conversationId !== '',
  });
}

// ---------------------------------------------------------------------------
// useSendMessageMutation
// ---------------------------------------------------------------------------

export type SendMessageParams = {
  conversationId: string;
  content: string;
};

/**
 * 指定会話にメッセージを送信するミューテーション。
 * 成功後は当該メッセージ一覧と会話一覧を invalidate する。
 *
 * 非参加者・ブロック後の送信は 403 NOT_FOUND（存在秘匿）— ApiError をそのまま throw する。
 * 日次送信上限（100 通）超過は 400 VALIDATION_ERROR — ApiError をそのまま throw する。
 */
export function useSendMessageMutation(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation<MessageItem, Error, { content: string }>({
    mutationFn: async ({ content }) => {
      const { data, error } = await apiClient.POST(
        '/api/v1/messages/conversations/{id}/messages',
        {
          params: { path: { id: conversationId } },
          body: { content },
        }
      );
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error sending message');
      }
      return data;
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversationMessages(conversationId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversations(),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteMessageMutation
// ---------------------------------------------------------------------------

export type DeleteMessageParams = {
  messageId: string;
};

/**
 * 自分が送信したメッセージを削除するミューテーション（送信者のみ）。
 * 成功後は当該メッセージ一覧と会話一覧を invalidate する。
 *
 * 他人のメッセージ削除は 403 NOT_FOUND（存在秘匿）— ApiError をそのまま throw する。
 * 存在しないメッセージは 404 NOT_FOUND — ApiError をそのまま throw する。
 */
export function useDeleteMessageMutation(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, DeleteMessageParams>({
    mutationFn: async ({ messageId }) => {
      const { data, error } = await apiClient.DELETE(
        '/api/v1/messages/conversations/{id}/messages/{messageId}',
        {
          params: { path: { id: conversationId, messageId } },
        }
      );
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error deleting message');
      }
      return data;
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversationMessages(conversationId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversations(),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useMarkConversationReadMutation
// ---------------------------------------------------------------------------

/**
 * 会話を既読化するミューテーション（POST /api/v1/messages/conversations/{id}/read）。
 * GET /api/v1/messages/conversations/{id}/messages でも自動既読化されるが、
 * メッセージ画面を開かずに既読化したい場合（通知タップ等）に使う。
 * 成功後は会話一覧を invalidate して未読バッジを更新する。
 *
 * 非参加者は 403 NOT_FOUND（存在秘匿）— ApiError をそのまま throw する。
 */
export function useMarkConversationReadMutation(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, void>({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST(
        '/api/v1/messages/conversations/{id}/read',
        {
          params: { path: { id: conversationId } },
        }
      );
      if (error !== undefined || data === undefined) {
        throw error ?? new Error('Unexpected error marking conversation as read');
      }
      return data;
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversations(),
      });
    },
  });
}
