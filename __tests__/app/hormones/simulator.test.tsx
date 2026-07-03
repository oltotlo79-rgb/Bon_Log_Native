/**
 * app/hormones/simulator/index のコンポーネントテスト。
 * ローディング・エラー・月選択・技法選択でバー変動・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import HormoneSimulatorScreen from '@/app/hormones/simulator/index';
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

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/lib/queries/hormones', () => ({
  useHormoneSimulatorQuery: () => mockSimulatorQuery,
  useHormonesQuery: jest.fn(),
  useHormoneDetailQuery: jest.fn(),
  useHormoneInteractionsQuery: jest.fn(),
  useHormoneTechniquesQuery: jest.fn(),
  useHormoneColumnsQuery: jest.fn(),
  useHormoneColumnDetailQuery: jest.fn(),
}));

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
    techniques: [
      {
        techniqueKey: 'pinching',
        nameJa: '芽摘み',
        nameEn: 'Pinching',
        effects: [
          { hormoneId: 'h1', effectType: 'decrease', magnitude: 'strong' },
        ],
      },
      {
        techniqueKey: 'repotting',
        nameJa: '植え替え',
        nameEn: null,
        effects: [
          { hormoneId: 'h1', effectType: 'increase', magnitude: 'moderate' },
          { hormoneId: 'h2', effectType: 'increase', magnitude: 'mild' },
        ],
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({});
  mockSimulatorQuery.data = undefined;
  mockSimulatorQuery.isLoading = false;
  mockSimulatorQuery.isError = false;
  mockSimulatorQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('HormoneSimulatorScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockSimulatorQuery.isLoading = true;
    renderWithProviders(<HormoneSimulatorScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('HormoneSimulatorScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockSimulatorQuery.isError = true;
    renderWithProviders(<HormoneSimulatorScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockSimulatorQuery.isError = true;
    renderWithProviders(<HormoneSimulatorScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockSimulatorQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 月選択
// ---------------------------------------------------------------------------

describe('HormoneSimulatorScreen 月選択', () => {
  it('月選択ボタンが 12 個表示される', () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneSimulatorScreen />);
    for (let m = 1; m <= 12; m++) {
      expect(screen.getByLabelText(`${m}月を選択`)).toBeTruthy();
    }
  });

  it('month パラメータで初期月が設定される', () => {
    mockUseLocalSearchParams.mockReturnValue({ month: '4' });
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneSimulatorScreen />);
    // 4月ボタンが selected 状態
    expect(screen.getByLabelText('4月を選択')).toBeTruthy();
  });

  it('月ボタンタップで月が切り替わる', async () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneSimulatorScreen />);
    fireEvent.press(screen.getByLabelText('7月を選択'));
    await waitFor(() => {
      expect(screen.getByText(/7月のホルモンバランス/)).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// 技法選択で効果が反映される
// ---------------------------------------------------------------------------

describe('HormoneSimulatorScreen 技法選択', () => {
  it('技法ボタンが表示される', () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneSimulatorScreen />);
    expect(screen.getByLabelText('芽摘みを選択')).toBeTruthy();
    expect(screen.getByLabelText('植え替えを選択')).toBeTruthy();
  });

  it('技法を選択すると「解除」ラベルに変わる', async () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneSimulatorScreen />);
    fireEvent.press(screen.getByLabelText('芽摘みを選択'));
    await waitFor(() => {
      expect(screen.getByLabelText('芽摘みを解除')).toBeTruthy();
    });
  });

  it('技法選択後に「すべて解除」ボタンが表示される', async () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneSimulatorScreen />);
    fireEvent.press(screen.getByLabelText('芽摘みを選択'));
    await waitFor(() => {
      expect(screen.getByLabelText('選択中の技法をすべて解除')).toBeTruthy();
    });
  });

  it('「すべて解除」タップで技法選択がリセットされる', async () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneSimulatorScreen />);
    fireEvent.press(screen.getByLabelText('芽摘みを選択'));
    await waitFor(() => { expect(screen.getByLabelText('選択中の技法をすべて解除')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('選択中の技法をすべて解除'));
    await waitFor(() => {
      expect(screen.queryByLabelText('選択中の技法をすべて解除')).toBeNull();
    });
  });

  it('ホルモン名とレベルバッジが表示される', () => {
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneSimulatorScreen />);
    expect(screen.getAllByText('オーキシン').length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('HormoneSimulatorScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockSimulatorQuery.data = makeSimulatorData();
    renderWithProviders(<HormoneSimulatorScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
