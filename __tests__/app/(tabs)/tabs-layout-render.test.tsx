/**
 * app/(tabs)/_layout.tsx のレンダリングテスト。
 * TabsLayout コンポーネント、UnreadBadge、NotificationTabIcon のレンダリングを検証する。
 * 5タブ構成（ホーム/検索/通知/プロフィール/もっと見る）をすべて確認する。
 * ロジック単体テストは tabs-layout.test.tsx を参照。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import TabsLayout from '@/app/(tabs)/_layout';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockUseUnreadCountQuery = jest.fn();

jest.mock('@/lib/queries/notifications', () => ({
  useUnreadCountQuery: () => mockUseUnreadCountQuery(),
}));

describe('TabsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 0 } });
  });

  it('レンダリングされる（Tabs が表示される）', () => {
    renderWithProviders(<TabsLayout />);
    expect(screen.getByTestId('tabs')).toBeTruthy();
  });

  it('未読カウント 0 のとき正常にレンダリングされる', () => {
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 0 } });
    renderWithProviders(<TabsLayout />);
    expect(screen.getByTestId('tabs')).toBeTruthy();
  });

  it('未読カウント > 0 のとき正常にレンダリングされる', () => {
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 5 } });
    renderWithProviders(<TabsLayout />);
    expect(screen.getByTestId('tabs')).toBeTruthy();
  });

  it('未読カウントが BADGE_OVERFLOW_THRESHOLD を超えるとき正常にレンダリングされる', () => {
    mockUseUnreadCountQuery.mockReturnValue({ data: { count: 999 } });
    renderWithProviders(<TabsLayout />);
    expect(screen.getByTestId('tabs')).toBeTruthy();
  });

  it('data が undefined のときも正常にレンダリングされる', () => {
    mockUseUnreadCountQuery.mockReturnValue({ data: undefined });
    renderWithProviders(<TabsLayout />);
    expect(screen.getByTestId('tabs')).toBeTruthy();
  });

  describe('5タブ構成のレンダリング確認', () => {
    it('feed/index タブスクリーンが存在する', () => {
      renderWithProviders(<TabsLayout />);
      expect(screen.getByTestId('tab-screen-feed/index')).toBeTruthy();
    });

    it('search/index タブスクリーンが存在する', () => {
      renderWithProviders(<TabsLayout />);
      expect(screen.getByTestId('tab-screen-search/index')).toBeTruthy();
    });

    it('notifications/index タブスクリーンが存在する', () => {
      renderWithProviders(<TabsLayout />);
      expect(screen.getByTestId('tab-screen-notifications/index')).toBeTruthy();
    });

    it('profile/index タブスクリーンが存在する', () => {
      renderWithProviders(<TabsLayout />);
      expect(screen.getByTestId('tab-screen-profile/index')).toBeTruthy();
    });

    it('more/index タブスクリーンが存在する（5タブ目）', () => {
      renderWithProviders(<TabsLayout />);
      expect(screen.getByTestId('tab-screen-more/index')).toBeTruthy();
    });

    it('5つすべてのタブスクリーンが同時にレンダリングされる', () => {
      renderWithProviders(<TabsLayout />);
      const tabScreenNames = [
        'feed/index',
        'search/index',
        'notifications/index',
        'profile/index',
        'more/index',
      ];
      for (const name of tabScreenNames) {
        expect(screen.getByTestId(`tab-screen-${name}`)).toBeTruthy();
      }
    });
  });

  describe('タブバーの墨筆装飾（和紙ノイズ・波線ボーダー）', () => {
    it('和紙ノイズ（washi-noise）画像が背景に描画される', () => {
      const { toJSON } = renderWithProviders(<TabsLayout />);
      expect(JSON.stringify(toJSON())).toContain('washi-noise.svg');
    });

    it('波線ボーダー（ink-stroke-top）画像が背景に描画される', () => {
      const { toJSON } = renderWithProviders(<TabsLayout />);
      expect(JSON.stringify(toJSON())).toContain('ink-stroke-top.svg');
    });

    it('装飾が描画されても5タブすべてが引き続き表示される（タブ動作が壊れない）', () => {
      renderWithProviders(<TabsLayout />);
      const tabScreenNames = [
        'feed/index',
        'search/index',
        'notifications/index',
        'profile/index',
        'more/index',
      ];
      for (const name of tabScreenNames) {
        expect(screen.getByTestId(`tab-screen-${name}`)).toBeTruthy();
      }
    });
  });
});
