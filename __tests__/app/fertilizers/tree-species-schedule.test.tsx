/**
 * app/fertilizers/tree-species/[slug]/index のコンポーネントテスト。
 * slug ガード・月別グリッド・月選択詳細・エラー・空状態・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import TreeSpeciesScheduleScreen from '@/app/fertilizers/tree-species/[slug]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockScheduleQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/fertilizers', () => ({
  useFertilizerNutrientsQuery: jest.fn(),
  useFertilizerCategoriesQuery: jest.fn(),
  useFertilizerTreeSpeciesQuery: jest.fn(),
  useFertilizerNutrientDetailQuery: jest.fn(),
  useFertilizationScheduleQuery: () => mockScheduleQuery,
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeScheduleData(overrides?: Partial<Record<string, unknown>>) {
  return {
    treeSpeciesName: '黒松',
    treeSpeciesSlug: 'kuromatsu',
    nameEn: 'Japanese Black Pine',
    category: 'conifer',
    description: '松柏類の代表的な樹種。力強い樹形が特徴。',
    examples: '黒松、五葉松',
    fertilizingPolicy: '春と秋を中心に、油粕を主体とした施肥を行う。',
    months: [
      { month: 1, action: 'none', nitrogenLevel: null, phosphorusLevel: null, potassiumLevel: null, recommendedType: null, description: null, cautionNote: null },
      { month: 4, action: 'moderate', nitrogenLevel: 'medium', phosphorusLevel: null, potassiumLevel: null, recommendedType: '固形油粕', description: '芽出し前の施肥', cautionNote: null },
      { month: 7, action: 'light', nitrogenLevel: 'low', phosphorusLevel: null, potassiumLevel: null, recommendedType: null, description: null, cautionNote: '真夏の施肥は根を傷めるため控える' },
      { month: 10, action: 'heavy', nitrogenLevel: 'high', phosphorusLevel: 'high', potassiumLevel: 'medium', recommendedType: '玉肥', description: '充実した秋肥', cautionNote: null },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockScheduleQuery.data = undefined;
  mockScheduleQuery.isLoading = false;
  mockScheduleQuery.isError = false;
  mockScheduleQuery.refetch = jest.fn();
  mockUseLocalSearchParams.mockReturnValue({ slug: 'kuromatsu' });
});

// ---------------------------------------------------------------------------
// slug ガード
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen slug ガード', () => {
  it('空文字 slug のとき「施肥情報を読み込めませんでした。」が表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: '' });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('施肥情報を読み込めませんでした。')).toBeTruthy();
  });

  it('配列 slug のとき先頭要素を使用し、isError でなければエラーなし', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: ['kuromatsu', 'other'] });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.queryByText('施肥情報を読み込めませんでした。')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// name パラメータ（タイトル用ツリー名）
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen name パラメータ', () => {
  it('name パラメータがあるとき slug ガードを通過する（isError でなければエラーなし）', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: 'kuromatsu', name: '黒松' });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.queryByText('施肥情報を読み込めませんでした。')).toBeNull();
  });

  it('name パラメータが空文字のとき slug をフォールバックとして使用しエラーなし', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: 'kuromatsu', name: '' });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.queryByText('施肥情報を読み込めませんでした。')).toBeNull();
  });

  it('name パラメータが配列のとき slug をフォールバックとして使用しエラーなし', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: 'kuromatsu', name: ['黒松', 'other'] });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.queryByText('施肥情報を読み込めませんでした。')).toBeNull();
  });

  it('name パラメータがないとき slug をフォールバックとして使用しエラーなし', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: 'kuromatsu' });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.queryByText('施肥情報を読み込めませんでした。')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockScheduleQuery.isLoading = true;
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen エラー', () => {
  it('isError=true のとき「施肥情報を読み込めませんでした。」が表示される', () => {
    mockScheduleQuery.isError = true;
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('施肥情報を読み込めませんでした。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockScheduleQuery.isError = true;
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockScheduleQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen 空状態', () => {
  it('months が空配列のとき「スケジュール情報がありません」が表示される', () => {
    mockScheduleQuery.data = { treeSpeciesName: '黒松', treeSpeciesSlug: 'kuromatsu', months: [] };
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('スケジュール情報がありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen 正常表示', () => {
  it('月別施肥グリッドが表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByLabelText('月別施肥スケジュール')).toBeTruthy();
  });

  it('施肥なし月のセルが表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByLabelText('1月: 施肥なし（なし）')).toBeTruthy();
  });

  it('施肥あり月のセルが表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByLabelText('4月: 施肥あり（通常）')).toBeTruthy();
  });

  it('多め月のセルが表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByLabelText('10月: 施肥あり（たっぷり）')).toBeTruthy();
  });

  it('月セルをタップすると詳細が表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    fireEvent.press(screen.getByLabelText('4月: 施肥あり（通常）'));
    expect(screen.getByText('4月の詳細')).toBeTruthy();
    expect(screen.getByText('推奨肥料: 固形油粕')).toBeTruthy();
    // description は月グリッドのポイント列と詳細パネル両方に出るため getAllByText で確認
    expect(screen.getAllByText('芽出し前の施肥').length).toBeGreaterThanOrEqual(1);
  });

  it('選択済み月をもう一度タップすると詳細が閉じる', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    fireEvent.press(screen.getByLabelText('4月: 施肥あり（通常）'));
    fireEvent.press(screen.getByLabelText('4月: 施肥あり（通常）'));
    expect(screen.queryByText('4月の詳細')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 季節サマリー
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen 季節サマリー', () => {
  it('季節ラベル（春・夏・秋・冬）が表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    const summary = within(screen.getByLabelText('季節ごとの施肥傾向'));
    expect(summary.getByText('春')).toBeTruthy();
    expect(summary.getByText('夏')).toBeTruthy();
    expect(summary.getByText('秋')).toBeTruthy();
    expect(summary.getByText('冬')).toBeTruthy();
  });

  it('各季節の支配的な施肥量バッジが表示される（春=通常, 夏=控えめ, 秋=たっぷり, 冬=なし）', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    const summary = within(screen.getByLabelText('季節ごとの施肥傾向'));
    expect(summary.getByText('通常')).toBeTruthy();
    expect(summary.getByText('控えめ')).toBeTruthy();
    expect(summary.getByText('たっぷり')).toBeTruthy();
    expect(summary.getByText('なし')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 年間施肥タイムライン
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen 年間施肥タイムライン', () => {
  it('年間施肥タイムラインが表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByLabelText('年間施肥タイムライン')).toBeTruthy();
  });

  it('月別のアクションバーに施肥量ラベルが設定される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByLabelText('4月: 通常')).toBeTruthy();
    expect(screen.getByLabelText('10月: たっぷり')).toBeTruthy();
    expect(screen.getByLabelText('1月: なし')).toBeTruthy();
  });

  it('N・P の栄養素バーにレベルラベルが設定される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByLabelText('10月 N: 多め')).toBeTruthy();
    expect(screen.getByLabelText('10月 P: 多め')).toBeTruthy();
  });

  it('施肥量の凡例が表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('施肥量:')).toBeTruthy();
  });

  it('栄養素の凡例が表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('栄養素:')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// NPK 列（月別施肥カレンダー）
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen NPK 列', () => {
  it('10月の行で N・P が「多め」、K が「—」バッジで表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    const row = within(screen.getByLabelText('10月: 施肥あり（たっぷり）'));
    expect(row.getByLabelText('N: 多め')).toBeTruthy();
    expect(row.getByLabelText('P: 多め')).toBeTruthy();
    expect(row.getByLabelText('K: —')).toBeTruthy();
  });

  it('7月の行で N が「控えめ」、P・K が「—」バッジで表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    const row = within(screen.getByLabelText('7月: 施肥あり（控えめ）'));
    expect(row.getByLabelText('N: 控えめ')).toBeTruthy();
    expect(row.getByLabelText('P: —')).toBeTruthy();
    expect(row.getByLabelText('K: —')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 樹種メタ情報（英名・カテゴリバッジ・概要・施肥方針・代表的な樹種）
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen 樹種メタ情報', () => {
  it('英名副題が表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('Japanese Black Pine')).toBeTruthy();
  });

  it('nameEn が null のとき英名副題が表示されない', () => {
    mockScheduleQuery.data = makeScheduleData({ nameEn: null });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.queryByText('Japanese Black Pine')).toBeNull();
  });

  it('カテゴリバッジが表示される（松柏類）', () => {
    mockScheduleQuery.data = makeScheduleData({ category: 'conifer' });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('松柏類')).toBeTruthy();
  });

  it('未知のカテゴリのとき「その他」バッジが表示される', () => {
    mockScheduleQuery.data = makeScheduleData({ category: 'unknown-category' });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('その他')).toBeTruthy();
  });

  it('概要が表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('概要')).toBeTruthy();
    expect(screen.getByText('松柏類の代表的な樹種。力強い樹形が特徴。')).toBeTruthy();
  });

  it('description が null のとき概要セクションが表示されない', () => {
    mockScheduleQuery.data = makeScheduleData({ description: null });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.queryByText('概要')).toBeNull();
  });

  it('施肥方針が表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('施肥方針')).toBeTruthy();
    expect(screen.getByText('春と秋を中心に、油粕を主体とした施肥を行う。')).toBeTruthy();
  });

  it('fertilizingPolicy が null のとき施肥方針セクションが表示されない', () => {
    mockScheduleQuery.data = makeScheduleData({ fertilizingPolicy: null });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.queryByText('施肥方針')).toBeNull();
  });

  it('代表的な樹種が表示される', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.getByText('代表的な樹種')).toBeTruthy();
    expect(screen.getByText('黒松、五葉松')).toBeTruthy();
  });

  it('examples が null のとき代表的な樹種セクションが表示されない', () => {
    mockScheduleQuery.data = makeScheduleData({ examples: null });
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.queryByText('代表的な樹種')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// cautionNote（月別施肥カレンダーの注意表示）
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen cautionNote', () => {
  it('cautionNote があるとき注意表示がカレンダー行に出る', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(
      screen.getByLabelText('注意: 真夏の施肥は根を傷めるため控える')
    ).toBeTruthy();
  });

  it('cautionNote があるとき詳細パネルにも注意表示が出る', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    fireEvent.press(screen.getByLabelText('7月: 施肥あり（控えめ）'));
    expect(screen.getByText('7月の詳細')).toBeTruthy();
    // cautionNote はカレンダー行と詳細パネル両方に出るため getAllByText で確認
    expect(screen.getAllByText('真夏の施肥は根を傷めるため控える').length).toBeGreaterThanOrEqual(2);
  });

  it('cautionNote が null の月では注意表示が出ない', () => {
    mockScheduleQuery.data = makeScheduleData();
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    expect(screen.queryByLabelText('注意: 芽出し前の施肥')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('TreeSpeciesScheduleScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<TreeSpeciesScheduleScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
