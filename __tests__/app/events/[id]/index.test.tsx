/**
 * app/events/[id]/index のイベント詳細画面テスト。
 * ローディング・エラー（not-found/forbidden/汎用）・正常表示・開催状態バッジ・
 * 場所結合表示・入場料・作成者（登録者）セクションを検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import EventDetailScreen from '@/app/events/[id]/index';
import { ApiError } from '@/lib/api/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseEventDetailQuery = jest.fn();
const mockUseDeleteEventMutation = jest.fn();
const mockUseCurrentUserQuery = jest.fn();

jest.mock('@/lib/queries/events', () => ({
  useEventDetailQuery: (...args: unknown[]) => mockUseEventDetailQuery(...args),
  useDeleteEventMutation: () => mockUseDeleteEventMutation(),
}));

jest.mock('@/lib/queries/auth', () => ({
  useCurrentUserQuery: () => mockUseCurrentUserQuery(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

// テスト基準日から相対日付を生成するヘルパー
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function makeEvent(overrides = {}) {
  return {
    id: 'event-1',
    title: '秋の盆栽展',
    startDate: '2025-09-15',
    endDate: '2025-09-17',
    prefecture: '東京都',
    city: null,
    venue: '日本橋ギャラリー',
    organizer: '盆栽協会',
    admissionFee: null,
    hasSales: false,
    externalUrl: null,
    description: null,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    userId: 'user-1',
    creator: { id: 'user-1', nickname: '松の匠', avatarUrl: null },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'event-1' });
  mockUseEventDetailQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseDeleteEventMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseCurrentUserQuery.mockReturnValue({ data: undefined });
});

describe('EventDetailScreen', () => {
  describe('ローディング状態', () => {
    it('isLoading=true のとき「イベント詳細」ヘッダーが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('イベント詳細')).toBeTruthy();
    });
  });

  describe('404 not-found', () => {
    it('id が空のとき「イベントが見つかりません」が表示される', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: '' });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('イベントが見つかりません')).toBeTruthy();
    });

    it('404 エラーのとき「イベントが見つかりません」が表示される', () => {
      const err = new ApiError({ code: 'NOT_FOUND', status: 404, message: 'NOT_FOUND' });
      mockUseEventDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: err,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('イベントが見つかりません')).toBeTruthy();
    });
  });

  describe('403 forbidden', () => {
    it('403 エラーのとき「閲覧できません」が表示される', () => {
      const err = new ApiError({ code: 'GUEST_NOT_ALLOWED', status: 403, message: 'FORBIDDEN' });
      mockUseEventDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: err,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('閲覧できません')).toBeTruthy();
    });
  });

  describe('汎用エラー', () => {
    it('汎用エラーで data=undefined のとき Loading 表示になる（スクリーンのロード順序）', () => {
      const err = new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'error' });
      mockUseEventDetailQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: err,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      // isLoading || event === undefined の分岐が isError より先に評価されるため
      // ローディング状態のヘッダーが表示される
      expect(screen.getByText('イベント詳細')).toBeTruthy();
    });
  });

  describe('正常表示', () => {
    it('イベントタイトルが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent(),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('秋の盆栽展')).toBeTruthy();
    });

    it('prefecture・city・venue が結合されて1行に表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ prefecture: '東京都', city: '台東区', venue: '東京ギャラリー' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      // 結合形式: "東京都 台東区 東京ギャラリー"
      expect(screen.getByText('東京都 台東区 東京ギャラリー')).toBeTruthy();
    });

    it('prefecture のみのとき prefecture が表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ prefecture: '京都府', city: null, venue: null }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('京都府')).toBeTruthy();
    });

    it('venue のみのとき venue が表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ prefecture: null, city: null, venue: '会館ホール' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('会館ホール')).toBeTruthy();
    });

    it('admissionFee が null のとき「無料」が表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ admissionFee: null }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('無料')).toBeTruthy();
    });

    it('admissionFee が指定されているとき「入場料: 大人500円」形式で表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ admissionFee: '大人500円' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('入場料: 大人500円')).toBeTruthy();
    });

    it('「戻る」ボタンが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent(),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
    });

    it('description がある場合「詳細」見出しとテキストが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ description: '会場の盆栽を鑑賞できます。' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('詳細')).toBeTruthy();
      expect(screen.getByText('会場の盆栽を鑑賞できます。')).toBeTruthy();
    });

    it('description が null のとき「詳細」見出しは表示されない', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ description: null }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.queryByText('詳細')).toBeNull();
    });
  });

  describe('登録者（creator）セクション', () => {
    it('creator がある場合「登録者」ラベルとニックネームが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ creator: { id: 'user-1', nickname: '松の匠', avatarUrl: null } }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('登録者')).toBeTruthy();
      expect(screen.getByText('松の匠')).toBeTruthy();
    });

    it('creator が null のとき「登録者」セクションは表示されない', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ creator: null }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.queryByText('登録者')).toBeNull();
    });
  });

  describe('開催状態バッジ', () => {
    it('開始日・終了日ともに過去のとき「終了」バッジが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ startDate: '2025-01-01', endDate: '2025-01-03' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('終了')).toBeTruthy();
    });

    it('単日イベント（endDate なし）で開始日が過去のとき「終了」バッジが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ startDate: '2025-01-01', endDate: null }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('終了')).toBeTruthy();
    });

    it('単日イベント（endDate なし）で開始日が過去のとき「開催中」バッジは表示されない', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ startDate: '2025-01-01', endDate: null }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.queryByText('開催中')).toBeNull();
    });

    it('開始が過去・終了が未来の複数日イベントのとき「開催中」バッジが表示される', () => {
      const start = daysFromNow(-1);
      const end = daysFromNow(2);
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ startDate: start, endDate: end }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('開催中')).toBeTruthy();
    });

    it('hasSales=true のとき「即売あり」バッジが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ hasSales: true }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('即売あり')).toBeTruthy();
    });

    it('終了かつ即売ありのとき「終了」と「即売あり」が同時に表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ startDate: '2025-01-01', endDate: '2025-01-03', hasSales: true }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText('終了')).toBeTruthy();
      expect(screen.getByText('即売あり')).toBeTruthy();
    });

    it('未来の単日イベントでバッジなし（hasSales=false）のとき、バッジ行は表示されない', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ startDate: daysFromNow(3), endDate: null, hasSales: false }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.queryByText('終了')).toBeNull();
      expect(screen.queryByText('開催中')).toBeNull();
      expect(screen.queryByText('即売あり')).toBeNull();
    });
  });

  describe('作成者メニュー', () => {
    it('自分が作成者のときメニューボタンが表示される', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ creator: { id: 'user-1', nickname: '松の匠', avatarUrl: null } }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByRole('button', { name: 'イベントのメニューを開く' })).toBeTruthy();
    });

    it('他者が作成者のときメニューボタンが表示されない', () => {
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-2' } });
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ creator: { id: 'user-1', nickname: '松の匠', avatarUrl: null } }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.queryByRole('button', { name: 'イベントのメニューを開く' })).toBeNull();
    });

    it('メニューボタンタップで Alert が呼ばれる', () => {
      const AlertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ creator: { id: 'user-1', nickname: '松の匠', avatarUrl: null } }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'イベントのメニューを開く' }));
      expect(AlertSpy).toHaveBeenCalled();
      AlertSpy.mockRestore();
    });
  });

  describe('外部 URL', () => {
    it('externalUrl がある場合リンクが表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ externalUrl: 'https://event.example.com' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByRole('link', { name: '詳細ページを開く（外部リンク）' })).toBeTruthy();
    });

    it('外部リンクをタップすると openBrowserAsync が呼ばれる', async () => {
      const openBrowserAsync = jest.requireMock('expo-web-browser').openBrowserAsync as jest.Mock;
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ externalUrl: 'https://event.example.com' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      fireEvent.press(screen.getByRole('link', { name: '詳細ページを開く（外部リンク）' }));
      await Promise.resolve();
      expect(openBrowserAsync).toHaveBeenCalledWith('https://event.example.com');
    });
  });

  describe('handleOpenMenu → handleDelete (Alert callback)', () => {
    it('メニューから「削除する」を押すと確認 Alert が表示される', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      const mockDeleteEvent = jest.fn();
      mockUseDeleteEventMutation.mockReturnValue({ mutate: mockDeleteEvent, isPending: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ creator: { id: 'user-1', nickname: '松の匠', avatarUrl: null } }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'イベントのメニューを開く' }));
      const menuOptions = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const deleteOption = menuOptions?.find((opt) => opt.text === '削除する');
      deleteOption?.onPress?.();
      expect(alertCalls.length).toBeGreaterThanOrEqual(2);
      jest.restoreAllMocks();
    });

    it('削除確認で「削除する」を押すと deleteEvent.mutate が呼ばれる', () => {
      const alertCalls: Parameters<typeof Alert.alert>[] = [];
      jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
        alertCalls.push(args as Parameters<typeof Alert.alert>);
      });
      const mockDeleteEvent = jest.fn();
      mockUseDeleteEventMutation.mockReturnValue({ mutate: mockDeleteEvent, isPending: false });
      mockUseCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ creator: { id: 'user-1', nickname: '松の匠', avatarUrl: null } }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'イベントのメニューを開く' }));
      const menuOptions = alertCalls[0]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const deleteMenuOption = menuOptions?.find((opt) => opt.text === '削除する');
      deleteMenuOption?.onPress?.();
      const confirmOptions = alertCalls[1]?.[2] as { text: string; onPress?: () => void }[] | undefined;
      const execDelete = confirmOptions?.find((opt) => opt.text === '削除する');
      execDelete?.onPress?.();
      expect(mockDeleteEvent).toHaveBeenCalledWith(
        { id: 'event-1' },
        expect.any(Object)
      );
      jest.restoreAllMocks();
    });
  });

  describe('formatDateRange — 日付範囲表示', () => {
    it('開催日範囲が日本語フォーマットで表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ startDate: '2025-09-15', endDate: '2025-09-17' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText(/2025年.*9月.*15日.*〜.*2025年.*9月.*17日/)).toBeTruthy();
    });

    it('endDate が null のとき開始日のみ表示される', () => {
      mockUseEventDetailQuery.mockReturnValue({
        data: makeEvent({ startDate: '2025-09-15', endDate: null }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProviders(<EventDetailScreen />);
      expect(screen.getByText(/2025年.*9月.*15日/)).toBeTruthy();
    });
  });
});
