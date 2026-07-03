/**
 * app/hormones/index のコンポーネントテスト。
 * ScrollView 構成（major/secondary セクション）・バナー・HormoneCard・
 * 4状態（正常・ローディング・エラー・空）・タップ遷移・オフラインを検証する。
 *
 * routeHormoneDetail は文字列 `/hormones/${slug}` を返すため、
 * 遷移先の期待値は { pathname, params } ではなく文字列になる。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import HormonesScreen from '@/app/hormones/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
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

const mockHormoneColumnsQuery = {
  data: undefined as unknown,
};

jest.mock('@/lib/queries/hormones', () => ({
  useHormonesQuery: () => mockHormonesQuery,
  useHormoneDetailQuery: jest.fn(),
  useHormoneColumnsQuery: () => mockHormoneColumnsQuery,
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー（category は major/secondary の2種のみ）
// ---------------------------------------------------------------------------

function makeHormones() {
  return [
    {
      id: 'h1',
      slug: 'auxin',
      name: 'オーキシン',
      nameEn: 'Auxin',
      category: 'major',
      description: '根の成長を促進する',
      chemicalFormula: 'C10H9NO2',
      seasonalLevels: [],
    },
    {
      id: 'h2',
      slug: 'gibberellin',
      name: 'ジベレリン',
      nameEn: 'Gibberellin',
      category: 'major',
      description: '茎の伸長を促進する',
      chemicalFormula: 'C19H22O6',
      seasonalLevels: [],
    },
    {
      id: 'h3',
      slug: 'cytokinin',
      name: 'サイトカイニン',
      nameEn: null,
      category: 'major',
      description: null,
      chemicalFormula: null,
      seasonalLevels: [],
    },
  ];
}

function makeHormonesWithBothCategories() {
  return [
    {
      id: 'h1',
      slug: 'auxin',
      name: 'オーキシン',
      nameEn: 'Auxin',
      category: 'major',
      description: '根の成長を促進する',
      chemicalFormula: 'C10H9NO2',
      seasonalLevels: [],
    },
    {
      id: 'h4',
      slug: 'brassinolide',
      name: 'ブラシノライド',
      nameEn: 'Brassinolide',
      category: 'secondary',
      description: 'ストレス応答に関与するホルモン',
      chemicalFormula: null,
      seasonalLevels: [],
    },
  ];
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockHormonesQuery.data = undefined;
  mockHormonesQuery.isLoading = false;
  mockHormonesQuery.isError = false;
  mockHormonesQuery.refetch = jest.fn();
  mockHormoneColumnsQuery.data = undefined;
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('HormonesScreen 正常表示', () => {
  it('ホルモン一覧が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByText('オーキシン')).toBeTruthy();
    expect(screen.getByText('ジベレリン')).toBeTruthy();
    expect(screen.getByText('サイトカイニン')).toBeTruthy();
  });

  it('英名があるホルモンの accessibilityLabel に英名が含まれる', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByLabelText('オーキシン（Auxin）の詳細を見る')).toBeTruthy();
  });

  it('英名が null のホルモンは英名なし accessibilityLabel になる', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByLabelText('サイトカイニンの詳細を見る')).toBeTruthy();
  });

  it('ホルモン行タップで詳細画面へ push する（文字列ルート）', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('オーキシン（Auxin）の詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/auxin');
  });

  it('英名が null のホルモン行タップでも詳細画面へ push する', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('サイトカイニンの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/cytokinin');
  });
});

// ---------------------------------------------------------------------------
// セクション分け（major/secondary）
// ---------------------------------------------------------------------------

describe('HormonesScreen セクション分け', () => {
  it('major カテゴリのホルモンが「五大ホルモン」セクションに表示される', () => {
    mockHormonesQuery.data = makeHormonesWithBothCategories();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getAllByText('五大ホルモン').length).toBeGreaterThan(0);
    expect(screen.getByText('オーキシン')).toBeTruthy();
  });

  it('secondary カテゴリのホルモンが「二次ホルモン」セクションに表示される', () => {
    mockHormonesQuery.data = makeHormonesWithBothCategories();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getAllByText('二次ホルモン').length).toBeGreaterThan(0);
    expect(screen.getByText('ブラシノライド')).toBeTruthy();
  });

  it('major のみのとき「五大ホルモン」セクションタイトルが存在する', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getAllByText('五大ホルモン').length).toBeGreaterThan(0);
  });

  it('major のみのとき二次ホルモンサブタイトルは表示されない', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(
      screen.queryByText(
        '近年注目されているホルモンで、ストレス応答や成長調節に関与します。',
      ),
    ).toBeNull();
  });

  it('五大ホルモンセクションのサブタイトルが表示される', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(
      screen.getByText('植物の成長・分化・休眠を制御する主要な5つのホルモンです。'),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// NavCard（ハブナビゲーション）
// ---------------------------------------------------------------------------

describe('HormonesScreen NavCard', () => {
  it('「技法とホルモン」NavCard が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByLabelText('技法とホルモンへ移動')).toBeTruthy();
  });

  it('「ホルモン相互作用」NavCard が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByLabelText('ホルモン相互作用へ移動')).toBeTruthy();
  });

  it('「相互作用ダイアグラム」NavCard が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByLabelText('相互作用ダイアグラムへ移動')).toBeTruthy();
  });

  it('「年間活性カレンダー」NavCard が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByLabelText('年間活性カレンダーへ移動')).toBeTruthy();
  });

  it('「バランスシミュレーター」NavCard が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByLabelText('バランスシミュレーターへ移動')).toBeTruthy();
  });

  it('「コラム・読みもの」NavCard が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByLabelText('コラム・読みものへ移動')).toBeTruthy();
  });

  it('「技法とホルモン」タップで /hormones/techniques へ push する', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('技法とホルモンへ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/techniques');
  });

  it('「ホルモン相互作用」タップで /hormones/interactions へ push する', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('ホルモン相互作用へ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/interactions');
  });

  it('「相互作用ダイアグラム」タップで /hormones/diagram へ push する', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('相互作用ダイアグラムへ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/diagram');
  });

  it('「年間活性カレンダー」タップで /hormones/calendar へ push する', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('年間活性カレンダーへ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/calendar');
  });

  it('「バランスシミュレーター」タップで /hormones/simulator へ push する', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('バランスシミュレーターへ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/simulator');
  });

  it('「コラム・読みもの」タップで /hormones/columns へ push する', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('コラム・読みものへ移動'));
    expect(mockRouter.push).toHaveBeenCalledWith('/hormones/columns');
  });

  it('コラム件数が 0 のとき NavCard にバッジが表示されない', () => {
    mockHormonesQuery.data = makeHormones();
    mockHormoneColumnsQuery.data = undefined;
    renderWithProviders(<HormonesScreen />);
    expect(screen.queryByText(/件/)).toBeNull();
  });

  it('コラム件数が 1 以上のとき NavCard にバッジが表示される', () => {
    mockHormonesQuery.data = makeHormones();
    mockHormoneColumnsQuery.data = {
      pages: [{ items: [{ id: 'c1', slug: 'col1', title: 'コラム1' }], nextCursor: null }],
      pageParams: [undefined],
    };
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByText('1')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// バナーヘッダー
// ---------------------------------------------------------------------------

describe('HormonesScreen バナーヘッダー', () => {
  it('ヘッダー説明文が表示される', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    expect(
      screen.getByText('盆栽の成長・休眠・発根に関わる植物ホルモンの役割と相互作用を学べます'),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('HormonesScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockHormonesQuery.isLoading = true;
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('HormonesScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockHormonesQuery.isError = true;
    renderWithProviders(<HormonesScreen />);
    expect(
      screen.getAllByText('植物ホルモン情報を読み込めませんでした。').length,
    ).toBeGreaterThan(0);
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockHormonesQuery.isError = true;
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockHormonesQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('HormonesScreen 空状態', () => {
  it('data が空配列のとき「ホルモン情報はありません」が表示される', () => {
    mockHormonesQuery.data = [];
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByText('ホルモン情報はありません')).toBeTruthy();
  });

  it('data が undefined（初期状態）のとき空状態になる', () => {
    mockHormonesQuery.data = undefined;
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByText('ホルモン情報はありません')).toBeTruthy();
  });

  it('major/secondary に該当しないカテゴリのみのデータは空状態になる', () => {
    mockHormonesQuery.data = [
      {
        id: 'h99',
        slug: 'unknown-hormone',
        name: '未知のホルモン',
        nameEn: null,
        category: 'unknown',
        description: null,
        chemicalFormula: null,
        seasonalLevels: [],
      },
    ];
    renderWithProviders(<HormonesScreen />);
    expect(screen.getByText('ホルモン情報はありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('HormonesScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<HormonesScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
