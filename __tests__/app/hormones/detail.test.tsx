/**
 * app/hormones/[slug]/index のコンポーネントテスト。
 * slug ガード・ヘッダー・本文セクション・季節グラフ・エラー・オフラインを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import HormoneDetailScreen from '@/app/hormones/[slug]/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockDetailQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/lib/queries/hormones', () => ({
  useHormonesQuery: jest.fn(),
  useHormoneDetailQuery: () => mockDetailQuery,
}));

const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeHormoneDetail(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'h1',
    slug: 'auxin',
    name: 'オーキシン',
    nameEn: 'Auxin',
    chemicalFormula: 'C10H9NO2',
    category: '成長促進',
    description: '根の成長を促進するホルモン。',
    bonsaiRole: '根張りの強化に役立つ。',
    productionSite: '茎頂・若葉',
    effects: [
      { effectName: '根の伸長', isPromoting: true },
      { effectName: '頂芽優勢', isPromoting: true },
    ],
    seasonalLevels: [
      { month: 4, level: 'high' },
      { month: 5, level: 'moderate' },
    ],
    activationMethod: '光照射量を増やす。',
    practicalTips: '春先の管理に特に注意する。\n水やりの頻度を調整する。',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockDetailQuery.data = undefined;
  mockDetailQuery.isLoading = false;
  mockDetailQuery.isError = false;
  mockDetailQuery.refetch = jest.fn();
  mockUseLocalSearchParams.mockReturnValue({ slug: 'auxin' });
});

// ---------------------------------------------------------------------------
// slug ガード
// ---------------------------------------------------------------------------

describe('HormoneDetailScreen slug ガード', () => {
  it('空文字 slug のとき「このホルモンは見つかりません。」が表示される', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: '' });
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByText('このホルモンは見つかりません。')).toBeTruthy();
  });

  it('配列 slug のとき先頭要素を使用し、isError でなければエラーなし', () => {
    mockUseLocalSearchParams.mockReturnValue({ slug: ['auxin', 'other'] });
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.queryByText('このホルモンは見つかりません。')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ローディング
// ---------------------------------------------------------------------------

describe('HormoneDetailScreen ローディング', () => {
  it('isLoading=true のとき ScreenLoading が表示される', () => {
    mockDetailQuery.isLoading = true;
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー
// ---------------------------------------------------------------------------

describe('HormoneDetailScreen エラー', () => {
  it('isError=true のとき「このホルモンは見つかりません。」が表示される', () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByText('このホルモンは見つかりません。')).toBeTruthy();
  });

  it('エラー時の再試行ボタンが refetch を呼ぶ', async () => {
    mockDetailQuery.isError = true;
    renderWithProviders(<HormoneDetailScreen />);
    fireEvent.press(screen.getByLabelText('再試行する'));
    await waitFor(() => {
      expect(mockDetailQuery.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 正常表示
// ---------------------------------------------------------------------------

describe('HormoneDetailScreen 正常表示', () => {
  it('ホルモン名が表示される', () => {
    mockDetailQuery.data = makeHormoneDetail();
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByText('オーキシン')).toBeTruthy();
  });

  it('英名が表示される', () => {
    mockDetailQuery.data = makeHormoneDetail();
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByText('Auxin')).toBeTruthy();
  });

  it('化学式が表示される', () => {
    mockDetailQuery.data = makeHormoneDetail();
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByText('C10H9NO2')).toBeTruthy();
  });

  it('説明が表示される', () => {
    mockDetailQuery.data = makeHormoneDetail();
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByText('根の成長を促進するホルモン。')).toBeTruthy();
  });

  it('産生部位セクションが表示される', () => {
    mockDetailQuery.data = makeHormoneDetail();
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByText('産生部位')).toBeTruthy();
    expect(screen.getByText('茎頂・若葉')).toBeTruthy();
  });

  it('主な効果が箇条書きで表示される', () => {
    mockDetailQuery.data = makeHormoneDetail();
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByText('・根の伸長（促進）')).toBeTruthy();
    expect(screen.getByText('・頂芽優勢（促進）')).toBeTruthy();
  });

  it('活性化方法が表示される', () => {
    mockDetailQuery.data = makeHormoneDetail();
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByText('活性化方法')).toBeTruthy();
    expect(screen.getByText('光照射量を増やす。')).toBeTruthy();
  });

  it('実践のコツが複数行で表示される', () => {
    mockDetailQuery.data = makeHormoneDetail();
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.getByText('実践のコツ')).toBeTruthy();
    expect(screen.getByText('・春先の管理に特に注意する。')).toBeTruthy();
    expect(screen.getByText('・水やりの頻度を調整する。')).toBeTruthy();
  });

  it('英名が null のとき英名が表示されない', () => {
    mockDetailQuery.data = makeHormoneDetail({ nameEn: null });
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.queryByText('Auxin')).toBeNull();
  });

  it('seasonalLevels が空のとき「季節的変動」セクションが表示されない', () => {
    mockDetailQuery.data = makeHormoneDetail({ seasonalLevels: [] });
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.queryByText('季節的変動')).toBeNull();
  });

  it('effects が空のとき「主な効果」セクションが表示されない', () => {
    mockDetailQuery.data = makeHormoneDetail({ effects: [] });
    renderWithProviders(<HormoneDetailScreen />);
    expect(screen.queryByText('主な効果')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('HormoneDetailScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<HormoneDetailScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
