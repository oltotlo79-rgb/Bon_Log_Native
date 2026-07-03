/**
 * app/hormones/techniques/index のコンポーネントテスト。
 * ローディング・エラー・空状態・技法カード・effectType/magnitude バッジ・
 * ホルモン名タップ遷移・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import HormoneTechniquesScreen from '@/app/hormones/techniques/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockTechniquesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/hormones', () => ({
  useHormoneTechniquesQuery: () => mockTechniquesQuery,
  useHormonesQuery: jest.fn(),
  useHormoneDetailQuery: jest.fn(),
  useHormoneInteractionsQuery: jest.fn(),
  useHormoneSimulatorQuery: jest.fn(),
  useHormoneColumnsQuery: jest.fn(),
  useHormoneColumnDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

function makeTechniquesData() {
  return {
    items: [
      {
        techniqueKey: 'pinching',
        techniqueNameJa: '芽摘み',
        techniqueNameEn: 'Pinching',
        effects: [
          {
            hormoneId: 'h1',
            hormoneSlug: 'auxin',
            hormoneNameJa: 'オーキシン',
            effectType: 'decrease',
            magnitude: 'strong',
            mechanism: '頂端優勢を解消し側芽の成長を促進する',
          },
          {
            hormoneId: 'h2',
            hormoneSlug: 'cytokinin',
            hormoneNameJa: 'サイトカイニン',
            effectType: 'increase',
            magnitude: 'moderate',
            mechanism: null,
          },
        ],
      },
      {
        techniqueKey: 'repotting',
        techniqueNameJa: '植え替え',
        techniqueNameEn: null,
        effects: [],
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockTechniquesQuery.data = undefined;
  mockTechniquesQuery.isLoading = false;
  mockTechniquesQuery.isError = false;
  mockTechniquesQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('HormoneTechniquesScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockTechniquesQuery.isLoading = true;
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('HormoneTechniquesScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockTechniquesQuery.isError = true;
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockTechniquesQuery.isError = true;
    renderWithProviders(<HormoneTechniquesScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockTechniquesQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('HormoneTechniquesScreen 空状態', () => {
  it('items が空配列のとき空状態テキストが表示される', () => {
    mockTechniquesQuery.data = { items: [] };
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByText('技法データはまだありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 技法カード
// ---------------------------------------------------------------------------

describe('HormoneTechniquesScreen 技法カード', () => {
  it('技法の日本語名が表示される', () => {
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByText('芽摘み')).toBeTruthy();
    expect(screen.getByText('植え替え')).toBeTruthy();
  });

  it('英名がある場合に表示される', () => {
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByText('Pinching')).toBeTruthy();
  });

  it('英名が null の技法には英名が表示されない', () => {
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.queryByText('null')).toBeNull();
  });

  it('effects がない技法に「ホルモン効果データはまだありません」が表示される', () => {
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByText('この技法のホルモン効果データはまだありません。')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// effectType / magnitude バッジ
// ---------------------------------------------------------------------------

describe('HormoneTechniquesScreen effectType/magnitude バッジ', () => {
  it('effectType=decrease のとき「減少」バッジが表示される', () => {
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByText('減少')).toBeTruthy();
  });

  it('effectType=increase のとき「増加」バッジが表示される', () => {
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByText('増加')).toBeTruthy();
  });

  it('magnitude=strong のとき「影響度: 強」が表示される', () => {
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByText('（影響度: 強）')).toBeTruthy();
  });

  it('magnitude=moderate のとき「影響度: 中」が表示される', () => {
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByText('（影響度: 中）')).toBeTruthy();
  });

  it('mechanism がある場合に表示される', () => {
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    expect(screen.getByText('頂端優勢を解消し側芽の成長を促進する')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ホルモン名タップ遷移
// ---------------------------------------------------------------------------

describe('HormoneTechniquesScreen ホルモン名タップ遷移', () => {
  it('ホルモン名タップでホルモン詳細画面へ push する', () => {
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    fireEvent.press(screen.getByLabelText('オーキシンの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/auxin');
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('HormoneTechniquesScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockTechniquesQuery.data = makeTechniquesData();
    renderWithProviders(<HormoneTechniquesScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
