/**
 * app/pesticides/formulations/index のコンポーネントテスト。
 * ローディング・エラー・空状態・正常データ・製品数0の非活性表示・タップ遷移・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import FormulationsIndexScreen from '@/app/pesticides/formulations/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockFormulationTypesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/pesticides', () => ({
  useFormulationTypesQuery: () => mockFormulationTypesQuery,
  useSpreaderTypesQuery: jest.fn(),
  useSpreaderTypeDetailQuery: jest.fn(),
  useSpreaderProductsQuery: jest.fn(),
  usePesticideColumnsQuery: jest.fn(),
  usePesticideColumnDetailQuery: jest.fn(),
  useMixingDataQuery: jest.fn(),
  usePesticideDiseasePestsQuery: jest.fn(),
  usePesticideDiseasePestDetailQuery: jest.fn(),
  usePesticideProductsQuery: jest.fn(),
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientsQuery: jest.fn(),
  usePesticideIngredientDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

function makeFormulationItems() {
  return {
    items: [
      {
        id: 'ft1',
        code: 'L',
        name: '液剤',
        description: '水に溶けやすい液体製剤',
        pesticidesCount: 5,
      },
      {
        id: 'ft2',
        code: 'WP',
        name: '水和剤',
        description: '水に懸濁させて使う粉末製剤',
        pesticidesCount: 0,
      },
      {
        id: 'ft3',
        code: 'EC',
        name: '乳剤',
        description: null,
        pesticidesCount: 3,
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockFormulationTypesQuery.data = undefined;
  mockFormulationTypesQuery.isLoading = false;
  mockFormulationTypesQuery.isError = false;
  mockFormulationTypesQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('FormulationsIndexScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockFormulationTypesQuery.isLoading = true;
    renderWithProviders(<FormulationsIndexScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('FormulationsIndexScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockFormulationTypesQuery.isError = true;
    renderWithProviders(<FormulationsIndexScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockFormulationTypesQuery.isError = true;
    renderWithProviders(<FormulationsIndexScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockFormulationTypesQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('FormulationsIndexScreen 空状態', () => {
  it('items が空配列のとき空状態テキストが表示される', () => {
    mockFormulationTypesQuery.data = { items: [] };
    renderWithProviders(<FormulationsIndexScreen />);
    expect(screen.getByText('剤型データはまだ登録されていません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 正常データ
// ---------------------------------------------------------------------------

describe('FormulationsIndexScreen 正常データ', () => {
  it('剤型名が表示される', () => {
    mockFormulationTypesQuery.data = makeFormulationItems();
    renderWithProviders(<FormulationsIndexScreen />);
    expect(screen.getByText('液剤')).toBeTruthy();
    expect(screen.getByText('水和剤')).toBeTruthy();
    expect(screen.getByText('乳剤')).toBeTruthy();
  });

  it('コードバッジが表示される', () => {
    mockFormulationTypesQuery.data = makeFormulationItems();
    renderWithProviders(<FormulationsIndexScreen />);
    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.getByText('WP')).toBeTruthy();
    expect(screen.getByText('EC')).toBeTruthy();
  });

  it('製品数が表示される', () => {
    mockFormulationTypesQuery.data = makeFormulationItems();
    renderWithProviders(<FormulationsIndexScreen />);
    expect(screen.getByText('5製品')).toBeTruthy();
    expect(screen.getByText('0製品')).toBeTruthy();
  });

  it('description がある場合に表示される', () => {
    mockFormulationTypesQuery.data = makeFormulationItems();
    renderWithProviders(<FormulationsIndexScreen />);
    expect(screen.getByText('水に溶けやすい液体製剤')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 製品数0の非活性表示
// ---------------------------------------------------------------------------

describe('FormulationsIndexScreen 製品数0の非活性表示', () => {
  it('pesticidesCount=0 の剤型の accessibilityLabel に「製品なし」が含まれる', () => {
    mockFormulationTypesQuery.data = makeFormulationItems();
    renderWithProviders(<FormulationsIndexScreen />);
    expect(screen.getByLabelText('水和剤（WP）製品なし')).toBeTruthy();
  });

  it('pesticidesCount>0 の剤型はタップ可能ボタンとして表示される', () => {
    mockFormulationTypesQuery.data = makeFormulationItems();
    renderWithProviders(<FormulationsIndexScreen />);
    expect(screen.getByLabelText('液剤（L）5製品の一覧を見る')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ遷移
// ---------------------------------------------------------------------------

describe('FormulationsIndexScreen タップ遷移', () => {
  it('製品あり剤型タップで製品一覧へ push する', () => {
    mockFormulationTypesQuery.data = makeFormulationItems();
    renderWithProviders(<FormulationsIndexScreen />);
    fireEvent.press(screen.getByLabelText('液剤（L）5製品の一覧を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ params: { formulationTypeCode: 'L' } }),
    );
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('FormulationsIndexScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockFormulationTypesQuery.data = makeFormulationItems();
    renderWithProviders(<FormulationsIndexScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
