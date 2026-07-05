/**
 * app/hormones/diagram/index のコンポーネントテスト。
 * ローディング・エラー・空状態・ノード表示・ノードタップで相互作用パネル・
 * typeフィルタ・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import HormoneDiagramScreen from '@/app/hormones/diagram/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ノードは WebView 内インライン SVG（HormoneInteractionDiagramView）に描画されるため、
// ノードタップは postMessage 経由の nodeSelected イベントをシミュレートして検証する
// （components/shops/BonsaiMapView.test.tsx の WebView メッセージ検証パターンを踏襲）。
async function selectNode(nodeId: string | null) {
  const webview = screen.getByTestId('mock-webview');
  const msg = JSON.stringify({ type: 'nodeSelected', nodeId });
  await act(async () => {
    fireEvent(webview, 'message', { nativeEvent: { data: msg } });
  });
}

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockHormonesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

const mockInteractionsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/hormones', () => ({
  useHormonesQuery: () => mockHormonesQuery,
  useHormoneInteractionsQuery: () => mockInteractionsQuery,
  useHormoneDetailQuery: jest.fn(),
  useHormoneTechniquesQuery: jest.fn(),
  useHormoneSimulatorQuery: jest.fn(),
  useHormoneColumnsQuery: jest.fn(),
  useHormoneColumnDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

function makeHormones() {
  return [
    { id: 'h1', slug: 'auxin', name: 'オーキシン', category: 'major' },
    { id: 'h2', slug: 'cytokinin', name: 'サイトカイニン', category: 'major' },
    { id: 'h3', slug: 'gibberellin', name: 'ジベレリン', category: 'secondary' },
  ];
}

function makeInteractions() {
  return {
    items: [
      {
        id: 'i1',
        hormoneAId: 'h1',
        hormoneAName: 'オーキシン',
        hormoneBId: 'h2',
        hormoneBName: 'サイトカイニン',
        type: 'antagonistic',
        description: '拮抗関係の説明',
        bonsaiRelevance: null,
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
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockHormonesQuery.data = undefined;
  mockHormonesQuery.isLoading = false;
  mockHormonesQuery.isError = false;
  mockHormonesQuery.refetch = jest.fn();
  mockInteractionsQuery.data = undefined;
  mockInteractionsQuery.isLoading = false;
  mockInteractionsQuery.isError = false;
  mockInteractionsQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('HormoneDiagramScreen ローディング', () => {
  it('hormones がローディング中のとき ScreenLoading が表示される', () => {
    mockHormonesQuery.isLoading = true;
    renderWithProviders(<HormoneDiagramScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('interactions がローディング中のとき ScreenLoading が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.isLoading = true;
    renderWithProviders(<HormoneDiagramScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('HormoneDiagramScreen エラー', () => {
  it('hormones エラーのとき ScreenError が表示される', () => {
    mockHormonesQuery.isError = true;
    renderWithProviders(<HormoneDiagramScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('interactions エラーのとき ScreenError が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.isError = true;
    renderWithProviders(<HormoneDiagramScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockHormonesQuery.isError = true;
    renderWithProviders(<HormoneDiagramScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockHormonesQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('HormoneDiagramScreen 空状態', () => {
  it('ホルモンデータが空のとき空状態テキストが表示される', () => {
    mockHormonesQuery.data = [];
    mockInteractionsQuery.data = { items: [] };
    renderWithProviders(<HormoneDiagramScreen />);
    expect(screen.getByText('ダイアグラムデータがありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ノード表示
// ---------------------------------------------------------------------------

describe('HormoneDiagramScreen ノード表示', () => {
  it('ホルモンノードは WebView 内インライン SVG で描画される', () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    expect(screen.getByLabelText('ホルモン相互作用のネットワーク図')).toBeTruthy();
    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });

  it('イントロテキストが表示される', () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    expect(screen.getByText(/ノードをタップすると関連する相互作用が下部に表示されます/)).toBeTruthy();
  });

  it('凡例が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    expect(screen.getByText('凡例')).toBeTruthy();
    expect(screen.getByText('五大ホルモン')).toBeTruthy();
    expect(screen.getByText('二次ホルモン')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ノードタップで下部に相互作用パネル
// ---------------------------------------------------------------------------

describe('HormoneDiagramScreen ノードタップ', () => {
  it('ノードタップで相互作用パネルが表示される', async () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    await selectNode('h1');
    await waitFor(() => {
      expect(screen.getByText('オーキシン の相互作用')).toBeTruthy();
    });
  });

  it('パネルに相互作用パートナー名が表示される', async () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    await selectNode('h1');
    await waitFor(() => {
      expect(screen.getByLabelText('オーキシンとサイトカイニンの拮抗関係')).toBeTruthy();
    });
  });

  it('パネルの「詳細を見る」ボタンが表示される', async () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    await selectNode('h1');
    await waitFor(() => {
      expect(screen.getByLabelText('オーキシンの詳細を見る')).toBeTruthy();
    });
  });

  it('「詳細を見る」タップでホルモン詳細画面へ push する', async () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    await selectNode('h1');
    await waitFor(() => { expect(screen.getByLabelText('オーキシンの詳細を見る')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('オーキシンの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/auxin');
  });

  it('同じノードを再タップするとパネルが閉じる', async () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    await selectNode('h1');
    await waitFor(() => { expect(screen.getByText('オーキシン の相互作用')).toBeTruthy(); });
    await selectNode(null);
    await waitFor(() => {
      expect(screen.queryByText('オーキシン の相互作用')).toBeNull();
    });
  });

  it('ノード選択なし時に「ノードをタップすると相互作用が表示されます」ヒントが表示される', () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    expect(screen.getByText('ノードをタップすると相互作用が表示されます')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// typeフィルタ
// ---------------------------------------------------------------------------

describe('HormoneDiagramScreen typeフィルタ', () => {
  it('フィルタチップが表示される', () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    expect(screen.getByLabelText('拮抗の相互作用を非表示')).toBeTruthy();
    expect(screen.getByLabelText('相乗の相互作用を非表示')).toBeTruthy();
    expect(screen.getByLabelText('調節の相互作用を非表示')).toBeTruthy();
  });

  it('フィルタをオフにすると「表示」に変わる', async () => {
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    fireEvent.press(screen.getByLabelText('拮抗の相互作用を非表示'));
    await waitFor(() => {
      expect(screen.getByLabelText('拮抗の相互作用を表示')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('HormoneDiagramScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockHormonesQuery.data = makeHormones();
    mockInteractionsQuery.data = makeInteractions();
    renderWithProviders(<HormoneDiagramScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
