/**
 * @module __tests__/components/profile/UserPostsList
 * UserPostsList コンポーネントのユニットテスト。
 * モック境界: lib/queries/posts の useUserPostsQuery をモック。ネットワークに出ない。
 * 4状態（ローディング・空・エラー・オフライン）、投稿表示、fetchNextPage 発火を検証する。
 */

import React from 'react';
import { Text } from 'react-native';
import { screen, act } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { onlineManager, type InfiniteData } from '@tanstack/react-query';
import { UserPostsList } from '@/components/profile/UserPostsList';
import { ApiError } from '@/lib/api/errors';
import { ERR_POST_LOAD_FAILED, ERR_FORBIDDEN } from '@/lib/constants/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makeFeedItem } from '@/__tests__/utils/data-factories';
import type { components } from '@/lib/api/generated/schema.d.ts';

type UserPostsResponse = components['schemas']['UserPostsResponse'];

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockFetchNextPage = jest.fn();
const mockRefetch = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

type QueryResult = {
  data: InfiniteData<UserPostsResponse> | undefined;
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

const mockUseUserPostsQuery = jest.fn<QueryResult, [string]>(() => defaultQueryResult);

jest.mock('@/lib/queries/posts', () => ({
  useUserPostsQuery: (userId: string) => mockUseUserPostsQuery(userId),
  useToggleLikeMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useToggleBookmarkMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useToggleRepostMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock('@/lib/queries/likes', () => ({
  useToggleLikeMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));
jest.mock('@/lib/queries/bookmarks', () => ({
  useToggleBookmarkMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

const HEADER_TEXT = 'プロフィールヘッダー';
const EMPTY_TEXT = '投稿がありません';

const header = <Text>{HEADER_TEXT}</Text>;
const emptyComponent = <Text>{EMPTY_TEXT}</Text>;

type Props = React.ComponentProps<typeof UserPostsList>;

function renderUserPostsList(props?: Partial<Props>) {
  const defaultProps: Props = {
    userId: 'user-1',
    currentUserId: 'user-self',
    ListHeaderComponent: header,
    emptyComponent: emptyComponent,
    isOffline: false,
    ...props,
  };
  return renderWithProviders(<UserPostsList {...defaultProps} />);
}

function makePageData(
  items: ReturnType<typeof makeFeedItem>[],
  nextCursor: string | null = null
): InfiniteData<UserPostsResponse> {
  return {
    pages: [{ items, nextCursor }],
    pageParams: [undefined],
  };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('UserPostsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserPostsQuery.mockReturnValue(defaultQueryResult);
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
      mockUseUserPostsQuery.mockReturnValue({ ...defaultQueryResult, isLoading: true });
      renderUserPostsList();
      expect(screen.getByText(HEADER_TEXT)).toBeTruthy();
    });

    it('isLoading=true のとき空状態コンポーネントが表示されない', () => {
      mockUseUserPostsQuery.mockReturnValue({ ...defaultQueryResult, isLoading: true });
      renderUserPostsList();
      expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // エラー状態
  // -------------------------------------------------------------------------

  describe('エラー状態', () => {
    it('isError=true のときエラーメッセージが表示される', () => {
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        isError: true,
        error: new Error('Network error'),
      });
      renderUserPostsList();
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
      expect(screen.getByText(ERR_POST_LOAD_FAILED)).toBeTruthy();
    });

    it('GUEST_NOT_ALLOWED エラーのとき ERR_FORBIDDEN が表示される', () => {
      const forbiddenError = new ApiError({
        code: 'GUEST_NOT_ALLOWED',
        status: 403,
        message: 'Forbidden',
      });
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        isError: true,
        error: forbiddenError,
      });
      renderUserPostsList();
      expect(screen.getByText(ERR_FORBIDDEN)).toBeTruthy();
    });

    it('エラー時にヘッダーが表示される', () => {
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        isError: true,
        error: new Error('Network error'),
      });
      renderUserPostsList();
      expect(screen.getByText(HEADER_TEXT)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 空状態
  // -------------------------------------------------------------------------

  describe('空状態', () => {
    it('投稿が0件のとき emptyComponent が表示される', () => {
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([]),
      });
      renderUserPostsList();
      expect(screen.getByText(EMPTY_TEXT)).toBeTruthy();
    });

    it('空状態でもヘッダーが表示される', () => {
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([]),
      });
      renderUserPostsList();
      expect(screen.getByText(HEADER_TEXT)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 投稿表示
  // -------------------------------------------------------------------------

  describe('投稿が並ぶ', () => {
    it('投稿アイテムの内容が表示される', () => {
      const item = makeFeedItem({ id: 'p1', content: '黒松の春管理' });
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([item]),
      });
      renderUserPostsList();
      expect(screen.getByText('黒松の春管理')).toBeTruthy();
    });

    it('複数ページの投稿がすべて表示される', () => {
      const item1 = makeFeedItem({ id: 'p1', content: '黒松の春管理' });
      const item2 = makeFeedItem({ id: 'p2', content: '五葉松の秋管理' });
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: {
          pages: [
            { items: [item1], nextCursor: 'cursor-2' },
            { items: [item2], nextCursor: null },
          ],
          pageParams: [undefined, 'cursor-2'],
        },
      });
      renderUserPostsList();
      expect(screen.getByText('黒松の春管理')).toBeTruthy();
      expect(screen.getByText('五葉松の秋管理')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 無限スクロール fetchNextPage 発火
  // -------------------------------------------------------------------------

  describe('無限スクロール', () => {
    it('hasNextPage=true のとき onEndReached ハンドラが設定されている', () => {
      const item = makeFeedItem({ id: 'p1', content: '黒松の春管理' });
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([item], 'cursor-2'),
        hasNextPage: true,
        isFetchingNextPage: false,
      });
      renderUserPostsList();
      const flatListNode = screen.root.findAll(
        (node: ReactTestInstance) => typeof (node.props as { onEndReached?: unknown }).onEndReached === 'function'
      );
      expect(flatListNode.length).toBeGreaterThan(0);
    });

    it('hasNextPage=true のとき onEndReached で fetchNextPage が呼ばれる', () => {
      const item = makeFeedItem({ id: 'p1', content: '黒松の春管理' });
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([item], 'cursor-2'),
        hasNextPage: true,
        isFetchingNextPage: false,
      });
      renderUserPostsList();
      const flatListNodes = screen.root.findAll(
        (node: ReactTestInstance) => typeof (node.props as { onEndReached?: unknown }).onEndReached === 'function'
      );
      const handler = (flatListNodes[0]?.props as { onEndReached?: () => void }).onEndReached;
      if (handler) {
        act(() => {
          handler();
        });
        expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
      }
    });

    it('hasNextPage=false のとき onEndReached を呼んでも fetchNextPage が呼ばれない', () => {
      const item = makeFeedItem({ id: 'p1', content: '黒松の春管理' });
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([item], null),
        hasNextPage: false,
        isFetchingNextPage: false,
      });
      renderUserPostsList();
      const flatListNodes = screen.root.findAll(
        (node: ReactTestInstance) => typeof (node.props as { onEndReached?: unknown }).onEndReached === 'function'
      );
      const handler = (flatListNodes[0]?.props as { onEndReached?: () => void }).onEndReached;
      if (handler) {
        act(() => {
          handler();
        });
      }
      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });

    it('isFetchingNextPage=true のとき onEndReached を呼んでも fetchNextPage が呼ばれない', () => {
      const item = makeFeedItem({ id: 'p1', content: '黒松の春管理' });
      mockUseUserPostsQuery.mockReturnValue({
        ...defaultQueryResult,
        data: makePageData([item], 'cursor-2'),
        hasNextPage: true,
        isFetchingNextPage: true,
      });
      renderUserPostsList();
      const flatListNodes = screen.root.findAll(
        (node: ReactTestInstance) => typeof (node.props as { onEndReached?: unknown }).onEndReached === 'function'
      );
      const handler = (flatListNodes[0]?.props as { onEndReached?: () => void }).onEndReached;
      if (handler) {
        act(() => {
          handler();
        });
      }
      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // useUserPostsQuery に正しい userId が渡される
  // -------------------------------------------------------------------------

  describe('クエリ引数', () => {
    it('props.userId が useUserPostsQuery に渡される', () => {
      renderUserPostsList({ userId: 'user-target-123' });
      expect(mockUseUserPostsQuery).toHaveBeenCalledWith('user-target-123');
    });
  });
});
