/**
 * app/pesticides/mixing-checker/index のコンポーネントテスト。
 * ローディング・エラー・空状態・農薬選択フロー・混用不可ペア警告・
 * 問題なしペア表示・双方向判定・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import MixingCheckerScreen from '@/app/pesticides/mixing-checker/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockMixingDataQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/pesticides', () => ({
  useMixingDataQuery: () => mockMixingDataQuery,
  useSpreaderTypesQuery: jest.fn(),
  useSpreaderTypeDetailQuery: jest.fn(),
  useSpreaderProductsQuery: jest.fn(),
  usePesticideColumnsQuery: jest.fn(),
  usePesticideColumnDetailQuery: jest.fn(),
  useFormulationTypesQuery: jest.fn(),
  usePesticideDiseasePestsQuery: jest.fn(),
  usePesticideDiseasePestDetailQuery: jest.fn(),
  usePesticideProductsQuery: jest.fn(),
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientsQuery: jest.fn(),
  usePesticideIngredientDetailQuery: jest.fn(),
}));

function makeMixingData(withIncompatibility = false) {
  const pesticides = [
    { id: 'p1', slug: 'pesticide-a', name: '農薬A', pesticideType: 'fungicide' as const },
    { id: 'p2', slug: 'pesticide-b', name: '農薬B', pesticideType: 'insecticide' as const },
    { id: 'p3', slug: 'pesticide-c', name: '農薬C', pesticideType: 'acaricide' as const },
  ];

  const incompatibilities = withIncompatibility
    ? [{ pesticideId: 'p1', incompatibleWithId: 'p2' }]
    : [];

  return { pesticides, incompatibilities };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockMixingDataQuery.data = undefined;
  mockMixingDataQuery.isLoading = false;
  mockMixingDataQuery.isError = false;
  mockMixingDataQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('MixingCheckerScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockMixingDataQuery.isLoading = true;
    renderWithProviders(<MixingCheckerScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('MixingCheckerScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockMixingDataQuery.isError = true;
    renderWithProviders(<MixingCheckerScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockMixingDataQuery.isError = true;
    renderWithProviders(<MixingCheckerScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockMixingDataQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態（農薬データなし）
// ---------------------------------------------------------------------------

describe('MixingCheckerScreen 空状態', () => {
  it('pesticides が空配列のとき空状態テキストが表示される', () => {
    mockMixingDataQuery.data = { pesticides: [], incompatibilities: [] };
    renderWithProviders(<MixingCheckerScreen />);
    expect(screen.getByText('農薬データがありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('MixingCheckerScreen 正常表示', () => {
  it('農薬1・農薬2の選択ボタンが表示される', () => {
    mockMixingDataQuery.data = makeMixingData();
    renderWithProviders(<MixingCheckerScreen />);
    expect(screen.getByLabelText('農薬 1を選択する')).toBeTruthy();
    expect(screen.getByLabelText('農薬 2を選択する')).toBeTruthy();
  });

  it('画面説明文が表示される', () => {
    mockMixingDataQuery.data = makeMixingData();
    renderWithProviders(<MixingCheckerScreen />);
    expect(
      screen.getByText('農薬の混用可否を確認できます。2剤の組み合わせをチェックしましょう。'),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 農薬選択フロー（モーダル）
// ---------------------------------------------------------------------------

describe('MixingCheckerScreen 農薬選択フロー', () => {
  it('「農薬 1を選択する」をタップするとモーダルが開く', async () => {
    mockMixingDataQuery.data = makeMixingData();
    renderWithProviders(<MixingCheckerScreen />);
    fireEvent.press(screen.getByLabelText('農薬 1を選択する'));
    await waitFor(() => {
      expect(screen.getByText('農薬 1 を選択')).toBeTruthy();
    });
  });

  it('モーダル内で農薬名が表示される', async () => {
    mockMixingDataQuery.data = makeMixingData();
    renderWithProviders(<MixingCheckerScreen />);
    fireEvent.press(screen.getByLabelText('農薬 1を選択する'));
    await waitFor(() => {
      expect(screen.getByText('農薬A')).toBeTruthy();
      expect(screen.getByText('農薬B')).toBeTruthy();
    });
  });

  it('モーダルで農薬を選択すると選択ボタンのラベルが変わる', async () => {
    mockMixingDataQuery.data = makeMixingData();
    renderWithProviders(<MixingCheckerScreen />);
    fireEvent.press(screen.getByLabelText('農薬 1を選択する'));
    await waitFor(() => {
      expect(screen.getByLabelText('農薬A（殺菌剤）を選択')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('農薬A（殺菌剤）を選択'));
    await waitFor(() => {
      expect(screen.getByLabelText('農薬 1: 農薬A（タップして変更）')).toBeTruthy();
    });
  });

  it('「農薬 2を選択する」をタップするとモーダルが開く', async () => {
    mockMixingDataQuery.data = makeMixingData();
    renderWithProviders(<MixingCheckerScreen />);
    fireEvent.press(screen.getByLabelText('農薬 2を選択する'));
    await waitFor(() => {
      expect(screen.getByText('農薬 2 を選択')).toBeTruthy();
    });
  });

  it('モーダルで「閉じる」をタップするとモーダルが閉じる', async () => {
    mockMixingDataQuery.data = makeMixingData();
    renderWithProviders(<MixingCheckerScreen />);
    fireEvent.press(screen.getByLabelText('農薬 1を選択する'));
    await waitFor(() => {
      expect(screen.getByText('農薬 1 を選択')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('閉じる'));
    await waitFor(() => {
      expect(screen.queryByText('農薬 1 を選択')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// 混用不可ペアの警告表示
// ---------------------------------------------------------------------------

describe('MixingCheckerScreen 混用不可ペア', () => {
  it('混用不可ペアを選択すると「混用不可」バッジが表示される', async () => {
    mockMixingDataQuery.data = makeMixingData(true);
    renderWithProviders(<MixingCheckerScreen />);

    // 農薬1を選択
    fireEvent.press(screen.getByLabelText('農薬 1を選択する'));
    await waitFor(() => {
      expect(screen.getByLabelText('農薬A（殺菌剤）を選択')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('農薬A（殺菌剤）を選択'));
    await waitFor(() => {
      expect(screen.getByLabelText('農薬 1: 農薬A（タップして変更）')).toBeTruthy();
    });

    // 農薬2を選択
    fireEvent.press(screen.getByLabelText('農薬 2を選択する'));
    await waitFor(() => {
      expect(screen.getByLabelText('農薬B（殺虫剤）を選択')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('農薬B（殺虫剤）を選択'));

    await waitFor(() => {
      expect(screen.getByText('混用不可')).toBeTruthy();
    });
  });

  it('混用不可時に注意メッセージが表示される', async () => {
    mockMixingDataQuery.data = makeMixingData(true);
    renderWithProviders(<MixingCheckerScreen />);

    fireEvent.press(screen.getByLabelText('農薬 1を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬A（殺菌剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬A（殺菌剤）を選択'));
    await waitFor(() => { expect(screen.getByLabelText('農薬 1: 農薬A（タップして変更）')).toBeTruthy(); });

    fireEvent.press(screen.getByLabelText('農薬 2を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬B（殺虫剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬B（殺虫剤）を選択'));

    await waitFor(() => {
      expect(
        screen.getByText('この組み合わせはデータベース上で混用不可として登録されています。'),
      ).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// 問題なしペアの表示
// ---------------------------------------------------------------------------

describe('MixingCheckerScreen 問題なしペア', () => {
  it('混用不可登録のないペアを選択すると「混用可能」バッジが表示される', async () => {
    mockMixingDataQuery.data = makeMixingData(false);
    renderWithProviders(<MixingCheckerScreen />);

    fireEvent.press(screen.getByLabelText('農薬 1を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬A（殺菌剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬A（殺菌剤）を選択'));
    await waitFor(() => { expect(screen.getByLabelText('農薬 1: 農薬A（タップして変更）')).toBeTruthy(); });

    fireEvent.press(screen.getByLabelText('農薬 2を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬B（殺虫剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬B（殺虫剤）を選択'));

    await waitFor(() => {
      expect(screen.getByText('混用可能')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// 双方向判定（id1 と id2 を逆にしても同じ判定）
// ---------------------------------------------------------------------------

describe('MixingCheckerScreen 双方向判定', () => {
  it('p2→p1 の順で選択しても混用不可と判定される', async () => {
    // incompatibilities は { pesticideId: p1, incompatibleWithId: p2 } のみ定義
    mockMixingDataQuery.data = makeMixingData(true);
    renderWithProviders(<MixingCheckerScreen />);

    // 農薬1に農薬B（p2）を選択
    fireEvent.press(screen.getByLabelText('農薬 1を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬B（殺虫剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬B（殺虫剤）を選択'));
    await waitFor(() => { expect(screen.getByLabelText('農薬 1: 農薬B（タップして変更）')).toBeTruthy(); });

    // 農薬2に農薬A（p1）を選択
    fireEvent.press(screen.getByLabelText('農薬 2を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬A（殺菌剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬A（殺菌剤）を選択'));

    await waitFor(() => {
      expect(screen.getByText('混用不可')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// 3剤対応（農薬3は任意。1-2, 1-3, 2-3 の全ペアを判定する）
// ---------------------------------------------------------------------------

describe('MixingCheckerScreen 3剤対応', () => {
  it('「農薬 3（任意）を選択する」をタップするとモーダルが開く', async () => {
    mockMixingDataQuery.data = makeMixingData();
    renderWithProviders(<MixingCheckerScreen />);
    fireEvent.press(screen.getByLabelText('農薬 3（任意）を選択する'));
    await waitFor(() => {
      expect(screen.getByText('農薬 3 を選択')).toBeTruthy();
    });
  });

  it('農薬1・2・3をすべて選択すると 1-2, 1-3, 2-3 の3ペア分の判定結果が表示される', async () => {
    mockMixingDataQuery.data = makeMixingData(true);
    renderWithProviders(<MixingCheckerScreen />);

    fireEvent.press(screen.getByLabelText('農薬 1を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬A（殺菌剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬A（殺菌剤）を選択'));
    await waitFor(() => { expect(screen.getByLabelText('農薬 1: 農薬A（タップして変更）')).toBeTruthy(); });

    fireEvent.press(screen.getByLabelText('農薬 2を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬B（殺虫剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬B（殺虫剤）を選択'));
    await waitFor(() => { expect(screen.getByLabelText('農薬 2: 農薬B（タップして変更）')).toBeTruthy(); });

    fireEvent.press(screen.getByLabelText('農薬 3（任意）を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬C（殺ダニ剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬C（殺ダニ剤）を選択'));

    await waitFor(() => {
      expect(screen.getByText('混用不可')).toBeTruthy(); // 農薬A × 農薬B
      expect(screen.getAllByText('混用可能')).toHaveLength(2); // 農薬A × 農薬C, 農薬B × 農薬C
    });
  });

  it('農薬3の選択解除ボタンをタップすると農薬3がクリアされ判定ペアから外れる', async () => {
    mockMixingDataQuery.data = makeMixingData(false);
    renderWithProviders(<MixingCheckerScreen />);

    fireEvent.press(screen.getByLabelText('農薬 1を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬A（殺菌剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬A（殺菌剤）を選択'));

    fireEvent.press(screen.getByLabelText('農薬 2を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬B（殺虫剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬B（殺虫剤）を選択'));

    fireEvent.press(screen.getByLabelText('農薬 3（任意）を選択する'));
    await waitFor(() => { expect(screen.getByLabelText('農薬C（殺ダニ剤）を選択')).toBeTruthy(); });
    fireEvent.press(screen.getByLabelText('農薬C（殺ダニ剤）を選択'));

    await waitFor(() => {
      expect(screen.getByLabelText('農薬 3（任意）: 農薬C（タップして変更）')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('農薬 3（任意）の選択を解除'));

    await waitFor(() => {
      expect(screen.getByLabelText('農薬 3（任意）を選択する')).toBeTruthy();
      expect(screen.getAllByText('混用可能')).toHaveLength(1); // 農薬A × 農薬B のみ
    });
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('MixingCheckerScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockMixingDataQuery.data = makeMixingData();
    renderWithProviders(<MixingCheckerScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
