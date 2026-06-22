/**
 * app/legal/index のコンポーネントテスト。
 * 一覧表示・タップ遷移・ローディング・エラー・空状態・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import LegalListScreen from '@/app/legal/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockLegalQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  isFetching: false,
};

jest.mock('@/lib/queries/legal', () => ({
  useLegalListQuery: () => mockLegalQuery,
  useLegalDocumentQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeLegalList() {
  return {
    items: [
      { slug: 'tokushoho', title: '特定商取引法に基づく表記', updatedAt: '2025-01-01T00:00:00Z' },
      { slug: 'terms', title: '利用規約', updatedAt: '2025-03-15T00:00:00Z' },
      { slug: 'privacy', title: 'プライバシーポリシー', updatedAt: '2025-06-01T00:00:00Z' },
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockLegalQuery.data = undefined;
  mockLegalQuery.isLoading = false;
  mockLegalQuery.isError = false;
  mockLegalQuery.isFetching = false;
  mockLegalQuery.refetch = jest.fn().mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('LegalListScreen ローディング', () => {
  it('isLoading=true のとき読み込みインジケーターが表示される（ヘッダーは表示される）', () => {
    mockLegalQuery.isLoading = true;
    renderWithProviders(<LegalListScreen />);
    expect(screen.getByRole('header', { name: '法的情報' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 正常系
// ---------------------------------------------------------------------------

describe('LegalListScreen 正常表示', () => {
  beforeEach(() => {
    mockLegalQuery.data = makeLegalList();
  });

  it('ヘッダー「法的情報」が表示される', () => {
    renderWithProviders(<LegalListScreen />);
    expect(screen.getByRole('header', { name: '法的情報' })).toBeTruthy();
  });

  it('3件の法的文章タイトルが表示される', () => {
    renderWithProviders(<LegalListScreen />);
    expect(screen.getByText('特定商取引法に基づく表記')).toBeTruthy();
    expect(screen.getByText('利用規約')).toBeTruthy();
    expect(screen.getByText('プライバシーポリシー')).toBeTruthy();
  });

  it('各アイテムに更新日が表示される', () => {
    renderWithProviders(<LegalListScreen />);
    expect(screen.getByText('更新日: 2025/01/01')).toBeTruthy();
    expect(screen.getByText('更新日: 2025/03/15')).toBeTruthy();
  });

  it('「利用規約」タップで terms 詳細画面へ push する', () => {
    renderWithProviders(<LegalListScreen />);
    fireEvent.press(screen.getByLabelText('利用規約（更新日: 2025/03/15）'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/legal/[slug]',
      params: { slug: 'terms' },
    });
  });

  it('「プライバシーポリシー」タップで privacy 詳細画面へ push する', () => {
    renderWithProviders(<LegalListScreen />);
    fireEvent.press(screen.getByLabelText('プライバシーポリシー（更新日: 2025/06/01）'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/legal/[slug]',
      params: { slug: 'privacy' },
    });
  });

  it('「特定商取引法に基づく表記」タップで tokushoho 詳細画面へ push する', () => {
    renderWithProviders(<LegalListScreen />);
    fireEvent.press(screen.getByLabelText('特定商取引法に基づく表記（更新日: 2025/01/01）'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/legal/[slug]',
      params: { slug: 'tokushoho' },
    });
  });
});

// ---------------------------------------------------------------------------
// 不正 slug のガード（一覧からは通常到達しないが防御的テスト）
// ---------------------------------------------------------------------------

describe('LegalListScreen slug ガード', () => {
  it('不正 slug は router.push を呼ばない', () => {
    mockLegalQuery.data = {
      items: [
        { slug: 'invalid_slug', title: '不正なドキュメント', updatedAt: '2025-01-01T00:00:00Z' },
      ],
    };
    renderWithProviders(<LegalListScreen />);
    fireEvent.press(screen.getByLabelText('不正なドキュメント（更新日: 2025/01/01）'));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('LegalListScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockLegalQuery.isError = true;
    renderWithProviders(<LegalListScreen />);
    expect(screen.getByText('法的文章を読み込めませんでした。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockLegalQuery.isError = true;
    renderWithProviders(<LegalListScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockLegalQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('LegalListScreen 空状態', () => {
  it('items が空のとき ScreenEmpty が表示される', () => {
    mockLegalQuery.data = { items: [] };
    renderWithProviders(<LegalListScreen />);
    expect(screen.getByText('法的情報がありません')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('LegalListScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<LegalListScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 戻るボタン
// ---------------------------------------------------------------------------

describe('LegalListScreen 戻るボタン', () => {
  it('戻るボタンタップで router.back() が呼ばれる', () => {
    renderWithProviders(<LegalListScreen />);
    fireEvent.press(screen.getByLabelText('戻る'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});
