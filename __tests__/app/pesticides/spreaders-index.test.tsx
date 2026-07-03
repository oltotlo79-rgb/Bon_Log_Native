/**
 * app/pesticides/spreaders/index のコンポーネントテスト。
 * ローディング・エラー・空状態・正常データ・タップ遷移・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import SpreadersIndexScreen from '@/app/pesticides/spreaders/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockSpreaderTypesQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/pesticides', () => ({
  useSpreaderTypesQuery: () => mockSpreaderTypesQuery,
  useSpreaderTypeDetailQuery: jest.fn(),
  useSpreaderProductsQuery: jest.fn(),
  usePesticideColumnsQuery: jest.fn(),
  usePesticideColumnDetailQuery: jest.fn(),
  useFormulationTypesQuery: jest.fn(),
  useMixingDataQuery: jest.fn(),
  usePesticideDiseasePestsQuery: jest.fn(),
  usePesticideDiseasePestDetailQuery: jest.fn(),
  usePesticideProductsQuery: jest.fn(),
  usePesticideProductDetailQuery: jest.fn(),
  usePesticideIngredientsQuery: jest.fn(),
  usePesticideIngredientDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

function makeSpreaderTypes() {
  return {
    items: [
      {
        id: 'st1',
        slug: 'silicone',
        name: 'シリコーン系',
        description: 'シリコーン由来の展着剤',
      },
      {
        id: 'st2',
        slug: 'polyoxyethylene',
        name: 'ポリオキシエチレン系',
        description: null,
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockSpreaderTypesQuery.data = undefined;
  mockSpreaderTypesQuery.isLoading = false;
  mockSpreaderTypesQuery.isError = false;
  mockSpreaderTypesQuery.refetch = jest.fn();
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('SpreadersIndexScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockSpreaderTypesQuery.isLoading = true;
    renderWithProviders(<SpreadersIndexScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('SpreadersIndexScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockSpreaderTypesQuery.isError = true;
    renderWithProviders(<SpreadersIndexScreen />);
    expect(screen.getByText('データを読み込めませんでした')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockSpreaderTypesQuery.isError = true;
    renderWithProviders(<SpreadersIndexScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockSpreaderTypesQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('SpreadersIndexScreen 空状態', () => {
  it('items が空配列のとき空状態テキストが表示される', () => {
    mockSpreaderTypesQuery.data = { items: [] };
    renderWithProviders(<SpreadersIndexScreen />);
    expect(screen.getByText('展着剤データはまだ登録されていません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 正常データ
// ---------------------------------------------------------------------------

describe('SpreadersIndexScreen 正常データ', () => {
  it('展着剤タイプ名が表示される', () => {
    mockSpreaderTypesQuery.data = makeSpreaderTypes();
    renderWithProviders(<SpreadersIndexScreen />);
    expect(screen.getByText('シリコーン系')).toBeTruthy();
    expect(screen.getByText('ポリオキシエチレン系')).toBeTruthy();
  });

  it('description がある場合に表示される', () => {
    mockSpreaderTypesQuery.data = makeSpreaderTypes();
    renderWithProviders(<SpreadersIndexScreen />);
    expect(screen.getByText('シリコーン由来の展着剤')).toBeTruthy();
  });

  it('accessibilityLabel が正しく付与される', () => {
    mockSpreaderTypesQuery.data = makeSpreaderTypes();
    renderWithProviders(<SpreadersIndexScreen />);
    expect(screen.getByLabelText('シリコーン系の展着剤一覧を見る')).toBeTruthy();
  });

  it('ヒントテキストが表示される', () => {
    mockSpreaderTypesQuery.data = makeSpreaderTypes();
    renderWithProviders(<SpreadersIndexScreen />);
    expect(screen.getByText('タップすると該当する展着剤一覧が表示されます')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ遷移
// ---------------------------------------------------------------------------

describe('SpreadersIndexScreen タップ遷移', () => {
  it('タイプ行タップで詳細画面へ push する', () => {
    mockSpreaderTypesQuery.data = makeSpreaderTypes();
    renderWithProviders(<SpreadersIndexScreen />);
    fireEvent.press(screen.getByLabelText('シリコーン系の展着剤一覧を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pesticides/spreaders/[slug]',
      params: { slug: 'silicone' },
    });
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('SpreadersIndexScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockSpreaderTypesQuery.data = makeSpreaderTypes();
    renderWithProviders(<SpreadersIndexScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
