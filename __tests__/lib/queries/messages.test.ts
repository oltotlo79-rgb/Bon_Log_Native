/**
 * @module __tests__/lib/queries/messages
 * lib/queries/messages の 6 フックすべてのユニットテスト。
 * lib/api/client をモック境界とし、ネットワークに出ない（testing.md 規約）。
 * ポーリング実タイマーは使用しない（refetchInterval の発火を待たない）。
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import { createTestQueryClient } from '@/__tests__/utils/test-utils';
import { queryKeys } from '@/lib/queries/keys';
import {
  makeConversationItem,
  makeConversationListPage,
  makeMessageItem,
  makeMessageListPage,
} from '@/__tests__/utils/data-factories';
import {
  useConversationsQuery,
  useStartConversationMutation,
  useMessagesQuery,
  useSendMessageMutation,
  useDeleteMessageMutation,
  useMarkConversationReadMutation,
} from '@/lib/queries/messages';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => mockApiGet(...args),
    POST: (...args: unknown[]) => mockApiPost(...args),
    DELETE: (...args: unknown[]) => mockApiDelete(...args),
    PATCH: jest.fn(),
  },
  isApiError: (e: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiError: AE } = require('@/lib/api/errors');
    return e instanceof AE;
  },
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

function makeApiError(code: MobileApiErrorCode, status: number): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

async function actAndExpectError(fn: () => Promise<unknown>): Promise<void> {
  await act(async () => {
    try {
      await fn();
    } catch {
      // expected
    }
  });
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useConversationsQuery
// ---------------------------------------------------------------------------

describe('useConversationsQuery', () => {
  it('会話一覧が返る（pages[0].items に含まれる）', async () => {
    const page = makeConversationListPage([
      makeConversationItem({ id: 'conv-1' }),
      makeConversationItem({ id: 'conv-2' }),
    ]);
    mockApiGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConversationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
    expect(result.current.data?.pages[0].items[0].id).toBe('conv-1');
  });

  it('無限クエリで pages 構造を持つ', async () => {
    const page = makeConversationListPage([makeConversationItem()]);
    mockApiGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConversationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveProperty('pages');
    expect(Array.isArray(result.current.data?.pages)).toBe(true);
  });

  it('nextCursor が null のとき hasNextPage が false', async () => {
    const page = makeConversationListPage([makeConversationItem()], null);
    mockApiGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConversationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('nextCursor が string のとき hasNextPage が true', async () => {
    const page = makeConversationListPage([makeConversationItem()], 'cursor-abc');
    mockApiGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConversationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('403 NOT_FOUND で ApiError がそのまま伝播する', async () => {
    const error = makeApiError('NOT_FOUND', 403);
    mockApiGet.mockResolvedValue({ data: undefined, error });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConversationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
      expect(result.current.error.status).toBe(403);
    }
  });

  it('error が undefined のとき汎用 Error が throw される', async () => {
    mockApiGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConversationsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error fetching conversations');
  });
});

// ---------------------------------------------------------------------------
// useStartConversationMutation
// ---------------------------------------------------------------------------

describe('useStartConversationMutation', () => {
  it('targetUserId を送り conversationId を返す', async () => {
    mockApiPost.mockResolvedValue({
      data: { conversationId: 'conv-new' },
      error: undefined,
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useStartConversationMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ targetUserId: 'user-2' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.conversationId).toBe('conv-new');
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/messages/conversations',
      expect.objectContaining({ body: { targetUserId: 'user-2' } })
    );
  });

  it('成功後に会話一覧（messages.conversations）が invalidate される', async () => {
    mockApiPost.mockResolvedValue({
      data: { conversationId: 'conv-new' },
      error: undefined,
    });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useStartConversationMutation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ targetUserId: 'user-2' });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.messages.conversations() })
      );
    });
  });

  it('403 NOT_FOUND で ApiError がそのまま伝播する（存在秘匿）', async () => {
    const error = makeApiError('NOT_FOUND', 403);
    mockApiPost.mockResolvedValue({ data: undefined, error });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useStartConversationMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync({ targetUserId: 'user-blocked' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
      expect(result.current.error.status).toBe(403);
    }
  });

  it('error が undefined のとき汎用 Error が throw される', async () => {
    mockApiPost.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useStartConversationMutation(), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync({ targetUserId: 'user-2' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error starting conversation');
  });
});

// ---------------------------------------------------------------------------
// useMessagesQuery
// ---------------------------------------------------------------------------

describe('useMessagesQuery', () => {
  it('conversationId 指定でメッセージ一覧が返る', async () => {
    const page = makeMessageListPage([
      makeMessageItem({ id: 'msg-1' }),
      makeMessageItem({ id: 'msg-2' }),
    ]);
    mockApiGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMessagesQuery('conv-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(2);
    expect(result.current.data?.pages[0].items[0].id).toBe('msg-1');
  });

  it('conversationId が空文字のとき enabled false でフェッチしない', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMessagesQuery(''), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('取得成功後に会話一覧が invalidate される', async () => {
    const page = makeMessageListPage([makeMessageItem()]);
    mockApiGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMessagesQuery('conv-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.messages.conversations() })
      );
    });
  });

  it('nextCursor が null のとき hasNextPage が false', async () => {
    const page = makeMessageListPage([makeMessageItem()], null);
    mockApiGet.mockResolvedValue({ data: page, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMessagesQuery('conv-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('403 NOT_FOUND で ApiError がそのまま伝播する（非参加者）', async () => {
    const error = makeApiError('NOT_FOUND', 403);
    mockApiGet.mockResolvedValue({ data: undefined, error });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMessagesQuery('conv-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
      expect(result.current.error.status).toBe(403);
    }
  });

  it('error が undefined のとき汎用 Error が throw される', async () => {
    mockApiGet.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMessagesQuery('conv-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error fetching messages');
  });
});

// ---------------------------------------------------------------------------
// useSendMessageMutation
// ---------------------------------------------------------------------------

describe('useSendMessageMutation', () => {
  const CONV_ID = 'conv-1';

  it('content を送りメッセージが返る', async () => {
    const msg = makeMessageItem({ id: 'msg-new', content: 'テストメッセージ' });
    mockApiPost.mockResolvedValue({ data: msg, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSendMessageMutation(CONV_ID), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ content: 'テストメッセージ' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('msg-new');
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/messages/conversations/{id}/messages',
      expect.objectContaining({
        params: { path: { id: CONV_ID } },
        body: { content: 'テストメッセージ' },
      })
    );
  });

  it('成功後に当該メッセージ一覧が invalidate される', async () => {
    const msg = makeMessageItem();
    mockApiPost.mockResolvedValue({ data: msg, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSendMessageMutation(CONV_ID), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ content: 'こんにちは' });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: queryKeys.messages.conversationMessages(CONV_ID),
        })
      );
    });
  });

  it('成功後に会話一覧が invalidate される', async () => {
    const msg = makeMessageItem();
    mockApiPost.mockResolvedValue({ data: msg, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSendMessageMutation(CONV_ID), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ content: 'こんにちは' });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.messages.conversations() })
      );
    });
  });

  it('403 NOT_FOUND で ApiError がそのまま伝播する（存在秘匿）', async () => {
    const error = makeApiError('NOT_FOUND', 403);
    mockApiPost.mockResolvedValue({ data: undefined, error });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSendMessageMutation(CONV_ID), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync({ content: 'こんにちは' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
      expect(result.current.error.status).toBe(403);
    }
  });

  it('400 VALIDATION_ERROR で ApiError が throw される（内容不正）', async () => {
    const error = makeApiError('VALIDATION_ERROR', 400);
    mockApiPost.mockResolvedValue({ data: undefined, error });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSendMessageMutation(CONV_ID), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync({ content: '' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('VALIDATION_ERROR');
      expect(result.current.error.status).toBe(400);
    }
  });

  it('error が undefined のとき汎用 Error が throw される', async () => {
    mockApiPost.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSendMessageMutation(CONV_ID), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync({ content: 'こんにちは' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error sending message');
  });
});

// ---------------------------------------------------------------------------
// useDeleteMessageMutation
// ---------------------------------------------------------------------------

describe('useDeleteMessageMutation', () => {
  const CONV_ID = 'conv-1';
  const MSG_ID = 'msg-1';

  it('messageId を送り成功レスポンスが返る', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteMessageMutation(CONV_ID), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ messageId: MSG_ID });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true });
    expect(mockApiDelete).toHaveBeenCalledWith(
      '/api/v1/messages/conversations/{id}/messages/{messageId}',
      expect.objectContaining({
        params: { path: { id: CONV_ID, messageId: MSG_ID } },
      })
    );
  });

  it('成功後に当該メッセージ一覧が invalidate される', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteMessageMutation(CONV_ID), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ messageId: MSG_ID });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: queryKeys.messages.conversationMessages(CONV_ID),
        })
      );
    });
  });

  it('成功後に会話一覧が invalidate される', async () => {
    mockApiDelete.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteMessageMutation(CONV_ID), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ messageId: MSG_ID });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.messages.conversations() })
      );
    });
  });

  it('403 NOT_FOUND で ApiError がそのまま伝播する（存在秘匿）', async () => {
    const error = makeApiError('NOT_FOUND', 403);
    mockApiDelete.mockResolvedValue({ data: undefined, error });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteMessageMutation(CONV_ID), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync({ messageId: MSG_ID }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
      expect(result.current.error.status).toBe(403);
    }
  });

  it('401 AUTH_REQUIRED で ApiError が throw される', async () => {
    const error = makeApiError('AUTH_REQUIRED', 401);
    mockApiDelete.mockResolvedValue({ data: undefined, error });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteMessageMutation(CONV_ID), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync({ messageId: MSG_ID }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('AUTH_REQUIRED');
    }
  });

  it('error が undefined のとき汎用 Error が throw される', async () => {
    mockApiDelete.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteMessageMutation(CONV_ID), { wrapper: Wrapper });

    await actAndExpectError(() => result.current.mutateAsync({ messageId: MSG_ID }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error deleting message');
  });
});

// ---------------------------------------------------------------------------
// useMarkConversationReadMutation
// ---------------------------------------------------------------------------

describe('useMarkConversationReadMutation', () => {
  const CONV_ID = 'conv-1';

  it('read エンドポイントを呼ぶ', async () => {
    mockApiPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useMarkConversationReadMutation(CONV_ID),
      { wrapper: Wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/messages/conversations/{id}/read',
      expect.objectContaining({
        params: { path: { id: CONV_ID } },
      })
    );
  });

  it('成功後に会話一覧が invalidate される', async () => {
    mockApiPost.mockResolvedValue({ data: { success: true }, error: undefined });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useMarkConversationReadMutation(CONV_ID),
      { wrapper: Wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: queryKeys.messages.conversations() })
      );
    });
  });

  it('403 NOT_FOUND で ApiError がそのまま伝播する（非参加者）', async () => {
    const error = makeApiError('NOT_FOUND', 403);
    mockApiPost.mockResolvedValue({ data: undefined, error });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useMarkConversationReadMutation(CONV_ID),
      { wrapper: Wrapper }
    );

    await actAndExpectError(() => result.current.mutateAsync());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('NOT_FOUND');
      expect(result.current.error.status).toBe(403);
    }
  });

  it('429 RATE_LIMITED で ApiError が throw される', async () => {
    const error = makeApiError('RATE_LIMITED', 429);
    mockApiPost.mockResolvedValue({ data: undefined, error });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useMarkConversationReadMutation(CONV_ID),
      { wrapper: Wrapper }
    );

    await actAndExpectError(() => result.current.mutateAsync());

    await waitFor(() => expect(result.current.isError).toBe(true));
    if (result.current.error instanceof ApiError) {
      expect(result.current.error.code).toBe('RATE_LIMITED');
      expect(result.current.error.status).toBe(429);
    }
  });

  it('error が undefined のとき汎用 Error が throw される', async () => {
    mockApiPost.mockResolvedValue({ data: undefined, error: undefined });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useMarkConversationReadMutation(CONV_ID),
      { wrapper: Wrapper }
    );

    await actAndExpectError(() => result.current.mutateAsync());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Unexpected error marking conversation as read');
  });
});
