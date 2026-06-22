/**
 * app/hormones/index のコンポーネントテスト。
 * 一覧表示・エラー・空状態・タップ遷移・オフラインを検証する。
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

jest.mock('@/lib/queries/hormones', () => ({
  useHormonesQuery: () => mockHormonesQuery,
  useHormoneDetailQuery: jest.fn(),
}));

const mockRouter = jest.requireMock('expo-router').router;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeHormones() {
  return [
    {
      id: 'h1',
      slug: 'auxin',
      name: 'オーキシン',
      nameEn: 'Auxin',
      category: '成長促進',
      description: '根の成長を促進する',
      seasonalLevels: [],
    },
    {
      id: 'h2',
      slug: 'gibberellin',
      name: 'ジベレリン',
      nameEn: 'Gibberellin',
      category: '成長促進',
      description: '茎の伸長を促進する',
      seasonalLevels: [],
    },
    {
      id: 'h3',
      slug: 'cytokinin',
      name: 'サイトカイニン',
      nameEn: null,
      category: '細胞分裂',
      description: null,
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

  it('ホルモン行タップで詳細画面へ push する', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('オーキシン（Auxin）の詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/hormones/[slug]',
      params: { slug: 'auxin' },
    });
  });

  it('英名が null のホルモン行タップでも詳細画面へ push する', () => {
    mockHormonesQuery.data = makeHormones();
    renderWithProviders(<HormonesScreen />);
    fireEvent.press(screen.getByLabelText('サイトカイニンの詳細を見る'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/hormones/[slug]',
      params: { slug: 'cytokinin' },
    });
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
    // title と description が同じ文字列なので getAllByText で確認する
    expect(screen.getAllByText('植物ホルモン情報を読み込めませんでした。').length).toBeGreaterThan(0);
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
