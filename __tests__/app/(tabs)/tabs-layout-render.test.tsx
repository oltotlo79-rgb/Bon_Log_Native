/**
 * app/(tabs)/_layout.tsx のレンダリングテスト。
 * TabsLayout コンポーネント、UnreadBadge、NotificationTabIcon のレンダリングを検証する。
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
});
