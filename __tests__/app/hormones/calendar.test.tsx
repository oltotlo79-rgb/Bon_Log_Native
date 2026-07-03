/**
 * app/hormones/calendar/index のコンポーネントテスト。
 * ローディング・エラー・空状態・ホルモン×月グリッド・月タップ・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import HormoneCalendarScreen from '@/app/hormones/calendar/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockSimulatorQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/hormones', () => ({
  useHormoneSimulatorQuery: () => mockSimulatorQuery,
  useHormonesQuery: jest.fn(),
  useHormoneDetailQuery: jest.fn(),
  useHormoneInteractionsQuery: jest.fn(),
  useHormoneTechniquesQuery: jest.fn(),
  useHormoneColumnsQuery: jest.fn(),
  useHormoneColumnDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

function makeSimulatorData() {
  return {
    hormones: [
      { id: 'h1', name: 'オーキシン', slug: 'auxin', category: 'major' },
      { id: 'h2', name: 'サイトカイニン', slug: 'cytokinin', category: 'major' },
    ],
    seasonalLevels: [
      { hormoneId: 'h1', month: 4, level: 'high' },
      { hormoneId: 'h1', month: 1, level: 'low' },
      { hormoneId: 'h2', month: 4, level: 'moderate' },
    ],
    techniques: [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockSimulatorQuery.data = undefined;
  mockSimulatorQuery.isLoading = false;
  mockSimulatorQuery.isError = false;
  mockSimulatorQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('HormoneCalendarScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockSimulatorQuery.isLoading = true;
    renderWithProviders(<HormoneCalendarScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('HormoneCalendarScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockSimulatorQuery.isError = true;
    renderWithProviders(<HormoneCalendarScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockSimulatorQuery.isError = true;
    renderWithProviders(<HormoneCalendarScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockSimulatorQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('HormoneCalendarScreen 空状態', () => {
  it('hormones が空配列のとき空状態テキストが表示される', () => {
    mockSimulatorQuery.data = { hormones: [], seasonalLevels: [], techniques: [] };
    renderWithProviders(<HormoneCalendarScreen />);
    expect(screen.getByText('カレンダーデータがありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// グリッド表示
// ---------------------------------------------------------------------------

describe('HormoneCalendarScreen グリッド表示', () => {
  it('ホルモン名がグリッドラベルとして表示される', () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneCalendarScreen />);
    expect(screen.getByText('オーキシン')).toBeTruthy();
    expect(screen.getByText('サイトカイニン')).toBeTruthy();
  });

  it('12ヶ月分のセルが存在する（オーキシン行）', () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneCalendarScreen />);
    // 1月のセルの accessibilityLabel を確認
    expect(screen.getByLabelText('オーキシン 1月 活性レベル: 低')).toBeTruthy();
  });

  it('4月は high レベルで「高」が表示される', () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneCalendarScreen />);
    expect(screen.getByLabelText('オーキシン 4月 活性レベル: 高')).toBeTruthy();
  });

  it('seasonalLevels に登録のない月は minimal（微）として表示される', () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneCalendarScreen />);
    // 2月は seasonalLevels 未登録なので minimal
    expect(screen.getByLabelText('オーキシン 2月 活性レベル: 微')).toBeTruthy();
  });

  it('凡例セクションが表示される', () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneCalendarScreen />);
    expect(screen.getByText('凡例:')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 月タップ → シミュレーター遷移
// ---------------------------------------------------------------------------

describe('HormoneCalendarScreen 月タップ遷移', () => {
  it('月タップでシミュレーター画面へ push する', () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneCalendarScreen />);
    fireEvent.press(screen.getByLabelText('オーキシン 4月 活性レベル: 高'));
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/hormones/simulator' }),
    );
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('HormoneCalendarScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneCalendarScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
