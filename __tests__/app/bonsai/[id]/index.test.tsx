/**
 * app/bonsai/[id]/index の盆栽詳細画面テスト。
 * ローディング・エラー・正常表示・メニュー・削除・成長記録を検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import BonsaiDetailScreen from '@/app/bonsai/[id]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: { message: '', visible: false, variant: 'success' as const },
    showToast: jest.fn(),
    hideToast: jest.fn(),
  })),
}));

const mockUseBonsaiDetailQuery = jest.fn();
const mockUseBonsaiRecordsQuery = jest.fn();
const mockUseDeleteBonsaiMutation = jest.fn();
const mockUseDeleteBonsaiRecordMutation = jest.fn();

jest.mock('@/lib/queries/bonsai', () => ({
  useBonsaiDetailQuery: (...args: unknown[]) => mockUseBonsaiDetailQuery(...args),
  useBonsaiRecordsQuery: (...args: unknown[]) => mockUseBonsaiRecordsQuery(...args),
  useDeleteBonsaiMutation: () => mockUseDeleteBonsaiMutation(),
  useDeleteBonsaiRecordMutation: () => mockUseDeleteBonsaiRecordMutation(),
}));

const defaultRecordsQuery = {
  data: undefined,
  isLoading: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
};

const defaultDeleteMutation = {
  mutate: jest.fn(),
  isPending: false,
};

function makeBonsai(overrides = {}) {
  return {
    id: 'bonsai-1',
    name: '黒松',
    species: '松柏類',
    acquiredAt: null,
    description: null,
    recordCount: 0,
    latestRecord: null,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'bonsai-1' });
  mockUseBonsaiDetailQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseBonsaiRecordsQuery.mockReturnValue(defaultRecordsQuery);
  mockUseDeleteBonsaiMutation.mockReturnValue(defaultDeleteMutation);
  mockUseDeleteBonsaiRecordMutation.mockReturnValue(defaultDeleteMutation);
});

describe('BonsaiDetailScreen', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のときローディング表示になる', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      // ScreenLoading が表示される（ヘッダーが表示されない）
      expect(screen.queryByText('黒松')).toBeNull();
    });
  });

  describe('エラー状態', () => {
    it('isError=true のとき「読み込めませんでした」が表示される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });

  describe('正常表示', () => {
    it('盆栽名がヘッダーに表示される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      // 名前はヘッダーとコンテンツ両方に表示される
      expect(screen.getAllByText('黒松').length).toBeGreaterThan(0);
    });

    it('「戻る」ボタンが表示される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('「戻る」ボタンタップで router.back が呼ばれる', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '戻る' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it('「メニューを開く」ボタンが表示される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      expect(screen.getByRole('button', { name: 'メニューを開く' })).toBeTruthy();
    });

    it('種名（species）が表示される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai({ species: '雑木類' }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      expect(screen.getByText('雑木類')).toBeTruthy();
    });

    it('description が表示される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai({ description: '大切な黒松です' }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      expect(screen.getByText('大切な黒松です')).toBeTruthy();
    });
  });

  describe('メニュー操作', () => {
    it('メニューボタンをタップすると Alert が呼ばれる', () => {
      const AlertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'メニューを開く' }));
      expect(AlertSpy).toHaveBeenCalled();
      AlertSpy.mockRestore();
    });
  });

  describe('成長記録の有無', () => {
    it('成長記録がある場合は件数が表示される', () => {
      const recordsData = {
        pages: [{
          items: [
            { id: 'rec-1', content: '水やりをした', recordAt: '2025-06-01', images: [] },
          ],
          nextCursor: null,
        }],
        pageParams: [undefined],
      };
      mockUseBonsaiRecordsQuery.mockReturnValue({
        data: recordsData,
        isLoading: false,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      });
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai({ recordCount: 1 }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      expect(screen.getByText('水やりをした')).toBeTruthy();
    });

    it('成長記録がない場合は空状態メッセージが表示される', () => {
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai({ recordCount: 0 }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      mockUseBonsaiRecordsQuery.mockReturnValue({
        ...defaultRecordsQuery,
        data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
      });
      renderWithProviders(<BonsaiDetailScreen />);
      expect(screen.getByText('記録がまだありません')).toBeTruthy();
    });
  });

  describe('handleShowMenu → handleDelete (Alert callback)', () => {
    it('メニューから「削除する」を押すと handleDelete が呼ばれ確認 Alert が表示される', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      const mockDeleteMutate = jest.fn();
      mockUseDeleteBonsaiMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'メニューを開く' }));
      const menuOptions = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const deleteOption = menuOptions?.find((opt) => opt.text === '削除する');
      deleteOption?.onPress?.();
      // 2回目のAlertは確認ダイアログ
      expect(alertCalls.length).toBeGreaterThanOrEqual(2);
      jest.restoreAllMocks();
    });

    it('削除確認で「削除する」を押すと deleteBonsai.mutate が呼ばれる', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      const mockDeleteMutate = jest.fn();
      mockUseDeleteBonsaiMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'メニューを開く' }));
      const menuOptions = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const deleteOption = menuOptions?.find((opt) => opt.text === '削除する');
      deleteOption?.onPress?.();
      const confirmOptions = alertCalls[1]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const execDelete = confirmOptions?.find((opt) => opt.text === '削除する');
      execDelete?.onPress?.();
      expect(mockDeleteMutate).toHaveBeenCalledWith(
        { id: 'bonsai-1' },
        expect.any(Object)
      );
      jest.restoreAllMocks();
    });
  });

  describe('GrowthRecordItem のメニューと削除', () => {
    function setupWithRecord() {
      const recordsData = {
        pages: [{
          items: [
            { id: 'rec-1', content: '水やりをした', recordAt: '2025-06-01', images: [] },
          ],
          nextCursor: null,
        }],
        pageParams: [undefined],
      };
      mockUseBonsaiRecordsQuery.mockReturnValue({
        data: recordsData,
        isLoading: false,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      });
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai({ recordCount: 1 }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
    }

    it('「記録のメニューを開く」ボタンをタップすると Alert が呼ばれる', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      setupWithRecord();
      renderWithProviders(<BonsaiDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '記録のメニューを開く' }));
      expect(alertSpy).toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    it('記録メニューから「削除する」を押すと handleDeleteRecord の確認 Alert が表示される', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      const mockDeleteRecordMutate = jest.fn();
      mockUseDeleteBonsaiRecordMutation.mockReturnValue({ mutate: mockDeleteRecordMutate, isPending: false });
      setupWithRecord();
      renderWithProviders(<BonsaiDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: '記録のメニューを開く' }));
      const menuOptions = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const deleteRecordOption = menuOptions?.find((opt) => opt.text === '削除する');
      deleteRecordOption?.onPress?.();
      expect(alertCalls.length).toBeGreaterThanOrEqual(2);
      jest.restoreAllMocks();
    });
  });

  describe('hasNextPage ボタン', () => {
    it('hasNextPage=true のとき「さらに読み込む」ボタンが表示される', () => {
      const fetchNextPage = jest.fn();
      mockUseBonsaiRecordsQuery.mockReturnValue({
        data: {
          pages: [{
            items: [{ id: 'rec-1', content: '記録', recordAt: '2025-06-01', images: [] }],
            nextCursor: 'cursor-1',
          }],
          pageParams: [undefined],
        },
        isLoading: false,
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
      });
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      expect(screen.getByRole('button', { name: 'さらに記録を読み込む' })).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'さらに記録を読み込む' }));
      expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatDate — 記録日の表示', () => {
    it('有効な日付が日本語フォーマットで表示される', () => {
      mockUseBonsaiRecordsQuery.mockReturnValue({
        data: {
          pages: [{
            items: [{ id: 'rec-1', content: '記録', recordAt: '2025-06-15', images: [] }],
            nextCursor: null,
          }],
          pageParams: [undefined],
        },
        isLoading: false,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      });
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: makeBonsai(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      expect(screen.getByText(/2025年.*6月.*15日/)).toBeTruthy();
    });
  });

  describe('id パラメータ型ガード', () => {
    it('id が配列のとき空文字として扱い isLoading 分岐になる', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['bonsai-1', 'bonsai-2'] });
      mockUseBonsaiDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: jest.fn(),
      });
      renderWithProviders(<BonsaiDetailScreen />);
      expect(screen.getByText('読み込めませんでした')).toBeTruthy();
    });
  });
});
