/**
 * app/legal/[slug]/index のコンポーネントテスト。
 * 型ガード（slug 不正値）・ローディング・エラー・正常表示・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import LegalDetailScreen from '@/app/legal/[slug]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

const mockLegalDocQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  isFetching: false,
};

jest.mock('@/lib/queries/legal', () => ({
  useLegalDocumentQuery: () => mockLegalDocQuery,
  useLegalListQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeLegalDoc(slug: string) {
  return {
    slug,
    title: slug === 'terms' ? '利用規約' : slug === 'privacy' ? 'プライバシーポリシー' : '特商法表記',
    updatedAt: '2025-06-01T00:00:00Z',
    sections: [
      { heading: '第1条', body: '本サービスの利用に際して...' },
      { heading: '第2条', body: '利用者は以下を遵守してください...' },
    ],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockLegalDocQuery.data = undefined;
  mockLegalDocQuery.isLoading = false;
  mockLegalDocQuery.isError = false;
  mockLegalDocQuery.isFetching = false;
  mockLegalDocQuery.refetch = jest.fn();
  mockUseLocalSearchParams.mockReturnValue({ slug: 'terms' });
});

// ---------------------------------------------------------------------------
// slug 型ガード
// ---------------------------------------------------------------------------

describe('LegalDetailScreen slug 型ガード', () => {
  it('不正 slug のとき「このページは見つかりません」が表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: 'invalid' });
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.getByText('このページは見つかりません')).toBeTruthy();
  });

  it('slug が配列のとき「このページは見つかりません」が表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: ['terms', 'privacy'] });
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.getByText('このページは見つかりません')).toBeTruthy();
  });

  it('slug が undefined のとき「このページは見つかりません」が表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({});
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.getByText('このページは見つかりません')).toBeTruthy();
  });

  it('不正 slug でも戻るボタンが表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: 'bad' });
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.getByLabelText('戻る')).toBeTruthy();
  });

  it('正しい slug（terms）では「このページは見つかりません」が表示されない', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: 'terms' });
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.queryByText('このページは見つかりません')).toBeNull();
  });

  it('privacy slug でも有効な slug として扱われる', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: 'privacy' });
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.queryByText('このページは見つかりません')).toBeNull();
  });

  it('tokushoho slug でも有効な slug として扱われる', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: 'tokushoho' });
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.queryByText('このページは見つかりません')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('LegalDetailScreen ローディング', () => {
  it('isLoading=true のとき戻るボタンが表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: 'terms' });
    mockLegalDocQuery.isLoading = true;
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.getByLabelText('戻る')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('LegalDetailScreen エラー', () => {
  it('isError=true のとき ScreenError が表示される', () => {
    mockLegalDocQuery.isError = true;
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.getByText('法的文章を読み込めませんでした。')).toBeTruthy();
  });

  it('エラー時の「再試行」ボタンが refetch を呼ぶ', () => {
    mockLegalDocQuery.isError = true;
    renderWithProviders(<LegalDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    expect(mockLegalDocQuery.refetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('LegalDetailScreen 正常表示', () => {
  beforeEach(() => {
    mockLegalDocQuery.data = makeLegalDoc('terms');
  });

  it('ドキュメントタイトルが表示される', () => {
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.getAllByText('利用規約').length).toBeGreaterThan(0);
  });

  it('更新日が表示される', () => {
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.getByText('更新日: 2025/06/01')).toBeTruthy();
  });

  it('セクション見出しが表示される', () => {
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.getByText('第1条')).toBeTruthy();
    expect(screen.getByText('第2条')).toBeTruthy();
  });

  it('セクション本文が表示される', () => {
    renderWithProviders(<LegalDetailScreen />);
    expect(screen.getByText('本サービスの利用に際して...')).toBeTruthy();
    expect(screen.getByText('利用者は以下を遵守してください...')).toBeTruthy();
  });

  it('sections が空でもクラッシュしない', () => {
    mockLegalDocQuery.data = { ...makeLegalDoc('terms'), sections: [] };
    expect(() => renderWithProviders(<LegalDetailScreen />)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('LegalDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<LegalDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 戻るボタン
// ---------------------------------------------------------------------------

describe('LegalDetailScreen 戻るボタン', () => {
  it('戻るボタンタップで router.back() が呼ばれる', () => {
    renderWithProviders(<LegalDetailScreen />);
    fireEvent.press(screen.getByLabelText('戻る'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});
