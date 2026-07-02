/**
 * app/fertilizers/index のコンポーネントテスト。
 * 単一スクロールのハブ構成（NavCard + 栄養素セクション + 季節TIPS）を検証する。
 * 旧タブ構成は廃止済みのためタブ関連テストを削除し、現実装に追従する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import FertilizersScreen from '@/app/fertilizers/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockNutrientsQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
const mockTreeSpeciesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/fertilizers', () => ({
  useFertilizerNutrientsQuery: () => mockNutrientsQuery,
  useFertilizerTreeSpeciesQuery: () => mockTreeSpeciesQuery,
  useFertilizerCategoriesQuery: jest.fn(),
  useFertilizerNutrientDetailQuery: jest.fn(),
  useFertilizationScheduleQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー — 実際のクエリフックが返す配列型データ
// ---------------------------------------------------------------------------

function makeNutrients() {
  return [
    {
      id: 'n1',
      slug: 'nitrogen',
      name: '窒素',
      symbol: 'N',
      description: '葉の成長を促す',
      category: 'primary',
      bonsaiRole: '葉と枝の生長を促進する',
    },
    {
      id: 'n2',
      slug: 'phosphorus',
      name: 'リン',
      symbol: 'P',
      description: '開花を促す',
      category: 'primary',
      bonsaiRole: '花芽と根の発達を助ける',
    },
    {
      id: 'n3',
      slug: 'calcium',
      name: 'カルシウム',
      symbol: 'Ca',
      description: '細胞壁を強化する',
      category: 'secondary',
      bonsaiRole: '細胞壁を強化する',
    },
  ];
}

function makeTreeSpecies() {
  return [
    {
      id: 'ts1',
      slug: 'kuromatsu',
      name: '黒松',
      category: 'conifer',
      description: null,
      fertilizingPolicy: '春と秋に施肥する',
    },
    {
      id: 'ts2',
      slug: 'keyaki',
      name: '欅',
      category: 'deciduous',
      description: null,
      fertilizingPolicy: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockNutrientsQuery.data = undefined;
  mockNutrientsQuery.isLoading = false;
  mockNutrientsQuery.isError = false;
  mockNutrientsQuery.refetch = jest.fn();
  mockTreeSpeciesQuery.data = undefined;
  mockTreeSpeciesQuery.isLoading = false;
  mockTreeSpeciesQuery.isError = false;
  mockTreeSpeciesQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('FertilizersScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockNutrientsQuery.isLoading = true;
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('FertilizersScreen エラー', () => {
  it('栄養素エラー時に ScreenError が表示される', () => {
    mockNutrientsQuery.isError = true;
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('施肥情報を読み込めませんでした。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockNutrientsQuery.isError = true;
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockNutrientsQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('FertilizersScreen 空状態', () => {
  it('栄養素が空（[]）のとき「データがありません」が表示される', () => {
    mockNutrientsQuery.data = [];
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('データがありません')).toBeTruthy();
  });

  it('primaryNutrients が空（secondary のみ）でも空状態になる', () => {
    mockNutrientsQuery.data = [
      {
        id: 'n3',
        slug: 'calcium',
        name: 'カルシウム',
        symbol: 'Ca',
        description: '細胞壁を強化する',
        category: 'secondary',
        bonsaiRole: '細胞壁を強化する',
      },
    ];
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('データがありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// NavCard（ナビゲーションカード）
// ---------------------------------------------------------------------------

describe('FertilizersScreen NavCard', () => {
  it('「栄養素辞典」NavCard が表示される', () => {
    mockNutrientsQuery.data = makeNutrients();
    mockTreeSpeciesQuery.data = makeTreeSpecies();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByLabelText('栄養素辞典へ移動')).toBeTruthy();
  });

  it('「肥料カテゴリ比較」NavCard が表示される', () => {
    mockNutrientsQuery.data = makeNutrients();
    mockTreeSpeciesQuery.data = makeTreeSpecies();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByLabelText('肥料カテゴリ比較へ移動')).toBeTruthy();
  });

  it('「用土と施肥の関係」NavCard が表示される', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByLabelText('用土と施肥の関係へ移動')).toBeTruthy();
  });

  it('「水やりと施肥の関係」NavCard が表示される', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByLabelText('水やりと施肥の関係へ移動')).toBeTruthy();
  });

  it('「症状から探す栄養素」NavCard が表示される', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByLabelText('症状から探す栄養素へ移動')).toBeTruthy();
  });

  it('「栄養素辞典」NavCard タップで /fertilizers/nutrients へ push する', () => {
    mockNutrientsQuery.data = makeNutrients();
    mockTreeSpeciesQuery.data = makeTreeSpecies();
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('栄養素辞典へ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/fertilizers/nutrients');
  });

  it('「用土と施肥の関係」NavCard タップで /fertilizers/soil へ push する', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('用土と施肥の関係へ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/fertilizers/soil');
  });

  it('「水やりと施肥の関係」NavCard タップで /fertilizers/watering へ push する', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('水やりと施肥の関係へ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/fertilizers/watering');
  });

  it('「症状から探す栄養素」NavCard タップで /fertilizers/symptoms へ push する', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getByLabelText('症状から探す栄養素へ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/fertilizers/symptoms');
  });
});

// ---------------------------------------------------------------------------
// 栄養素セクション（primary/secondary）
// ---------------------------------------------------------------------------

describe('FertilizersScreen 栄養素セクション', () => {
  it('primary 栄養素が「三大栄養素（N・P・K）」セクションに表示される', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('三大栄養素（N・P・K）')).toBeTruthy();
    expect(screen.getByText('窒素')).toBeTruthy();
    expect(screen.getByText('リン')).toBeTruthy();
  });

  it('secondary 栄養素が「二次要素（Ca・Mg・S）」セクションに表示される', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('二次要素（Ca・Mg・S）')).toBeTruthy();
    expect(screen.getByText('カルシウム')).toBeTruthy();
  });

  it('「すべて見る」タップで /fertilizers/nutrients へ push する', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    fireEvent.press(screen.getAllByLabelText('栄養素一覧をすべて見る')[0]);
    expect(mockRouter.push).toHaveBeenCalledWith('/fertilizers/nutrients');
  });

  it('secondary 栄養素がない場合は二次要素セクションが表示されない', () => {
    mockNutrientsQuery.data = [
      {
        id: 'n1',
        slug: 'nitrogen',
        name: '窒素',
        symbol: 'N',
        description: '葉の成長を促す',
        category: 'primary',
        bonsaiRole: '葉と枝の生長を促進する',
      },
    ];
    renderWithProviders(<FertilizersScreen />);
    expect(screen.queryByText('二次要素（Ca・Mg・S）')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ヘッダー説明文
// ---------------------------------------------------------------------------

describe('FertilizersScreen ヘッダー', () => {
  it('説明文が表示される', () => {
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(
      screen.getByText('盆栽の健康を支える施肥の基礎知識・樹種別スケジュールを確認できます'),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('FertilizersScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 季節TIPS — 日付をモックして全季節を決定的にテストする
// フレークを防ぐため Date.prototype.getMonth を各テストで固定する。
// ---------------------------------------------------------------------------

describe('FertilizersScreen 季節TIPS', () => {
  let dateSpy: jest.SpyInstance;

  afterEach(() => {
    dateSpy?.mockRestore();
  });

  function mockMonth(month: number) {
    dateSpy = jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(month - 1);
  }

  it('3月（春）は春のTIPSタイトルが表示される', () => {
    mockMonth(3);
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('春の施肥 — 成長期の始まり')).toBeTruthy();
  });

  it('6月（夏）は夏のTIPSタイトルが表示される', () => {
    mockMonth(6);
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('夏の施肥 — 控えめに管理')).toBeTruthy();
  });

  it('9月（秋）は秋のTIPSタイトルが表示される', () => {
    mockMonth(9);
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('秋の施肥 — 冬越し準備')).toBeTruthy();
  });

  it('12月（冬）は冬のTIPSタイトルが表示される', () => {
    mockMonth(12);
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('冬の施肥 — 休眠期は原則不要')).toBeTruthy();
  });

  it('2月（冬）は冬のTIPSタイトルが表示される', () => {
    mockMonth(2);
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('冬の施肥 — 休眠期は原則不要')).toBeTruthy();
  });

  it('8月（夏）は夏のTIPSタイトルが表示される', () => {
    mockMonth(8);
    mockNutrientsQuery.data = makeNutrients();
    renderWithProviders(<FertilizersScreen />);
    expect(screen.getByText('夏の施肥 — 控えめに管理')).toBeTruthy();
  });
});
