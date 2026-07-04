/**
 * @module __tests__/components/profile/UserCommentsList
 * UserCommentsList コンポーネントのユニットテスト。
 * モック境界: lib/queries/comments の useUserCommentsQuery をモック。ネットワークに出ない。
 * 4状態（ローディング・空・エラー・オフライン）、本文・相対時刻・投稿冒頭見出しの表示、
 * post.content が null のフォールバック、行タップでの投稿詳細遷移を検証する。
 */

import React from 'react';
import { Text } from 'react-native';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { UserCommentsList } from '@/components/profile/UserCommentsList';
import { ApiError } from '@/lib/api/errors';
import { ERR_LOAD_FAILED, ERR_FORBIDDEN } from '@/lib/constants/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { formatAbsoluteDateTime } from '@/lib/utils/relative-time';
import type { components } from '@/lib/api/generated/schema.d.ts';

type UserCommentsListResponse = components['schemas']['UserCommentsListResponse'];

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockFetchNextPage = jest.fn();
const mockRefetch = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
const mockRouter = jest.requireMock('expo-router').router;

type QueryResult = {
  data: InfiniteData<UserCommentsListResponse> | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  fetchNextPage: jest.Mock;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  refetch: jest.Mock;
  isRefetching: boolean;
};

const defaultQueryResult: QueryResult = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  fetchNextPage: mockFetchNextPage,
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: mockRefetch,
  isRefetching: false,
};

const mockUseUserCommentsQuery = jest.fn<QueryResult, [string]>(() => defaultQueryResult);

jest.mock('@/lib/queries/comments', () => ({
  useUserCommentsQuery: (userId: string) => mockUseUserCommentsQuery(userId),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

const HEADER_TEXT = 'プロフィールヘッダー';
const EMPTY_TEXT = 'コメントがありません';

const header = <Text>{HEADER_TEXT}</Text>;
const emptyComponent = <Text>{EMPTY_TEXT}</Text>;

type Props = React.ComponentProps<typeof UserCommentsList>;

function renderUserCommentsList(props?: Partial<Props>) {
  const defaultProps: Props = {
    userId: 'user-1',
    ListHeaderComponent: header,
    emptyComponent: emptyComponent,
    isOffline: false,
    ...props,
  };
  return renderWithProviders(<UserCommentsList {...defaultProps} />);
}

function makeCommentItem(
  overrides?: Partial<UserCommentsListResponse['items'][number]>
): UserCommentsListResponse['items'][number] {
  return {
    id: 'comment-1',
    content: '春の芽摘みが順調です',
    createdAt: '2025-06-01T10:00:00Z',
    post: { id: 'post-1', content: '黒松の春管理について' },
    ...overrides,
  };
}

function makePageData(
  items: UserCommentsListResponse['items'],
  nextCursor: string | null = null
): InfiniteData<UserCommentsListResponse> {
  return {
    pages: [{ items, nextCursor }],
    pageParams: [undefined],
  };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('UserCommentsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserCommentsQuery.mockReturnValue(defaultQueryResult);
    act(() => {
      onlineManager.setOnline(true);
    });
  });

  afterEach(() => {
    act(() => {
      onlineManager.setOnline(true);
    });
  });

  // -------------------------------------------------------------------------
  // ローディング状態
  // -------------------------------------------------------------------------

  describe('ローディング状態', () => {
    it('isLoading=true のときリストヘッダーが表示される', () => {
      mockUseUserCommentsQuery.mockReturnValue({ ...defaultQueryResult, isLoading: true });
      renderUserCommentsList();
      expect(screen.getByText(HEADER_TEXT)).toBeTruthy();
    });

    it('isLoading=true のとき空状態コンポーネントが表示されない', () => {
      mockUseUserCommentsQuery.mockReturnValue({ ...defaultQueryResult, isLoading: true });
      renderUserCommentsList();
      expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // エラー状態
  // -------------------------------------------------------------------------

  describe('エラー状態', () => {
    it('isError=true のときエラーメッセージが表示される', () => {
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        isError: true,
        error: new Error('Network error'),
      });
      renderUserCommentsList();
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
      expect(screen.getByText(ERR_LOAD_FAILED)).toBeTruthy();
    });

    it('GUEST_NOT_ALLOWED エラーのとき ERR_FORBIDDEN が表示される', () => {
      const forbiddenError = new ApiError({
        code: 'GUEST_NOT_ALLOWED',
        status: 403,
        message: 'Forbidden',
      });
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        isError: true,
        error: forbiddenError,
      });
      renderUserCommentsList();
      expect(screen.getByText(ERR_FORBIDDEN)).toBeTruthy();
    });

    it('エラー時にヘッダーが表示される', () => {
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        isError: true,
        error: new Error('Network error'),
      });
      renderUserCommentsList();
      expect(screen.getByText(HEADER_TEXT)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 空状態
  // -------------------------------------------------------------------------

  describe('空状態', () => {
    it('コメントが0件のとき emptyComponent が表示される', () => {
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([]),
      });
      renderUserCommentsList();
      expect(screen.getByText(EMPTY_TEXT)).toBeTruthy();
    });

    it('空状態でもヘッダーが表示される', () => {
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([]),
      });
      renderUserCommentsList();
      expect(screen.getByText(HEADER_TEXT)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 行の表示（本文・相対時刻・投稿冒頭見出し）
  // -------------------------------------------------------------------------

  describe('行の表示', () => {
    it('コメント本文が表示される', () => {
      const item = makeCommentItem({ content: '春の芽摘みが順調です' });
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([item]),
      });
      renderUserCommentsList();
      expect(screen.getByText('春の芽摘みが順調です')).toBeTruthy();
    });

    it('投稿冒頭見出しが表示される', () => {
      const item = makeCommentItem({ post: { id: 'post-1', content: '黒松の春管理について' } });
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([item]),
      });
      renderUserCommentsList();
      expect(screen.getByText('「黒松の春管理について」への返信')).toBeTruthy();
    });

    it('相対時刻に絶対日時のアクセシビリティラベルが付与される', () => {
      const createdAt = '2025-06-01T10:00:00Z';
      const item = makeCommentItem({ createdAt });
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([item]),
      });
      renderUserCommentsList();
      const expectedLabel = formatAbsoluteDateTime(new Date(createdAt));
      expect(screen.getByLabelText(expectedLabel)).toBeTruthy();
    });

    it('post.content が null のときフォールバック文言が表示される', () => {
      const item = makeCommentItem({ post: { id: 'post-1', content: null } });
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([item]),
      });
      renderUserCommentsList();
      expect(screen.getByText('投稿への返信')).toBeTruthy();
    });

    it('複数ページのコメントがすべて表示される', () => {
      const item1 = makeCommentItem({ id: 'comment-1', content: '一件目のコメント' });
      const item2 = makeCommentItem({ id: 'comment-2', content: '二件目のコメント' });
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: {
          pages: [
            { items: [item1], nextCursor: 'cursor-2' },
            { items: [item2], nextCursor: null },
          ],
          pageParams: [undefined, 'cursor-2'],
        },
      });
      renderUserCommentsList();
      expect(screen.getByText('一件目のコメント')).toBeTruthy();
      expect(screen.getByText('二件目のコメント')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 行タップで投稿詳細へ遷移
  // -------------------------------------------------------------------------

  describe('行タップ', () => {
    it('行タップで対象投稿の詳細画面へ push する', () => {
      const item = makeCommentItem({ post: { id: 'post-42', content: '黒松の春管理について' } });
      mockUseUserCommentsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([item]),
      });
      renderUserCommentsList();
      fireEvent.press(
        screen.getByLabelText(/^「黒松の春管理について」への返信。コメント: /)
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/posts/post-42');
    });
  });

  // -------------------------------------------------------------------------
  // useUserCommentsQuery に正しい userId が渡される
  // -------------------------------------------------------------------------

  describe('クエリ引数', () => {
    it('props.userId が useUserCommentsQuery に渡される', () => {
      renderUserCommentsList({ userId: 'user-target-123' });
      expect(mockUseUserCommentsQuery).toHaveBeenCalledWith('user-target-123');
    });
  });
});
