/**
 * app/hormones/interactions/index のコンポーネントテスト。
 * ローディング・エラー・空状態・相互作用ペア・type バッジ・説明・
 * ダイアグラムリンク・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import HormoneInteractionsScreen from '@/app/hormones/interactions/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockInteractionsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/hormones', () => ({
  useHormoneInteractionsQuery: () => mockInteractionsQuery,
  useHormonesQuery: jest.fn(),
  useHormoneDetailQuery: jest.fn(),
  useHormoneTechniquesQuery: jest.fn(),
  useHormoneSimulatorQuery: jest.fn(),
  useHormoneColumnsQuery: jest.fn(),
  useHormoneColumnDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

function makeInteractionsData() {
  return {
    items: [
      {
        id: 'i1',
        hormoneAId: 'h1',
        hormoneAName: 'オーキシン',
        hormoneBId: 'h2',
        hormoneBName: 'サイトカイニン',
        type: 'antagonistic',
        description: 'オーキシンとサイトカイニンは根と芽の比率を制御する',
        bonsaiRelevance: '植え替え時の発根促進に重要',
      },
      {
        id: 'i2',
        hormoneAId: 'h1',
        hormoneAName: 'オーキシン',
        hormoneBId: 'h3',
        hormoneBName: 'ジベレリン',
        type: 'synergistic',
        description: null,
        bonsaiRelevance: null,
      },
      {
        id: 'i3',
        hormoneAId: 'h2',
        hormoneAName: 'サイトカイニン',
        hormoneBId: 'h4',
        hormoneBName: 'エチレン',
        type: 'modulatory',
        description: '老化抑制に関わる',
        bonsaiRelevance: null,
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockInteractionsQuery.data = undefined;
  mockInteractionsQuery.isLoading = false;
  mockInteractionsQuery.isError = false;
  mockInteractionsQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('HormoneInteractionsScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockInteractionsQuery.isLoading = true;
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('HormoneInteractionsScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockInteractionsQuery.isError = true;
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockInteractionsQuery.isError = true;
    renderWithProviders(<HormoneInteractionsScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockInteractionsQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('HormoneInteractionsScreen 空状態', () => {
  it('items が空配列のとき空状態テキストが表示される', () => {
    mockInteractionsQuery.data = { items: [] };
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getByText('相互作用のデータはまだありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 正常データ
// ---------------------------------------------------------------------------

describe('HormoneInteractionsScreen 正常データ', () => {
  it('ホルモンペアが表示される', () => {
    mockInteractionsQuery.data = makeInteractionsData();
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getByLabelText('オーキシン と サイトカイニン の拮抗関係')).toBeTruthy();
  });

  it('ホルモン名が表示される', () => {
    mockInteractionsQuery.data = makeInteractionsData();
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getAllByText('オーキシン').length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// type バッジ
// ---------------------------------------------------------------------------

describe('HormoneInteractionsScreen type バッジ', () => {
  it('type=antagonistic のとき「拮抗」バッジが表示される', () => {
    mockInteractionsQuery.data = makeInteractionsData();
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getByText('拮抗')).toBeTruthy();
  });

  it('type=synergistic のとき「相乗」バッジが表示される', () => {
    mockInteractionsQuery.data = makeInteractionsData();
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getByText('相乗')).toBeTruthy();
  });

  it('type=modulatory のとき「調節」バッジが表示される', () => {
    mockInteractionsQuery.data = makeInteractionsData();
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getByText('調節')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 説明テキスト
// ---------------------------------------------------------------------------

describe('HormoneInteractionsScreen 説明テキスト', () => {
  it('description がある場合に表示される', () => {
    mockInteractionsQuery.data = makeInteractionsData();
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getByText('オーキシンとサイトカイニンは根と芽の比率を制御する')).toBeTruthy();
  });

  it('bonsaiRelevance がある場合に表示される', () => {
    mockInteractionsQuery.data = makeInteractionsData();
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getByText('植え替え時の発根促進に重要')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ダイアグラムリンク
// ---------------------------------------------------------------------------

describe('HormoneInteractionsScreen ダイアグラムリンク', () => {
  it('「ネットワーク図で見る」ボタンが表示される', () => {
    mockInteractionsQuery.data = makeInteractionsData();
    renderWithProviders(<HormoneInteractionsScreen />);
    expect(screen.getByLabelText('相互作用ダイアグラムへ移動')).toBeTruthy();
  });

  it('ダイアグラムボタンタップで /hormones/diagram へ push する', () => {
    mockInteractionsQuery.data = makeInteractionsData();
    renderWithProviders(<HormoneInteractionsScreen />);
    fireEvent.press(screen.getByLabelText('相互作用ダイアグラムへ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/diagram');
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('HormoneInteractionsScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockInteractionsQuery.data = makeInteractionsData();
    renderWithProviders(<HormoneInteractionsScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
