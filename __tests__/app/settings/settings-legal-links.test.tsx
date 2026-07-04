/**
 * @module __tests__/app/settings/settings-legal-links
 * SettingsScreen の規約・プライバシーポリシーリンクが legal 画面へ遷移することを検証する。
 * settings-navigation.test.tsx は例外が発生しないことのみを確認しているため、
 * 遷移先の正しさ（routes.legalDocument 経由で /legal/{slug} へ渡ること）はこちらで担保する。
 */

import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react-native';
import SettingsScreen from '@/app/settings/index';
import { routes } from '@/lib/constants/routes';

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/lib/queries/auth', () => ({
  useLogoutMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SettingsScreen - 規約・プライバシーリンク', () => {
  it('「利用規約」を押すと legal の terms へ遷移する', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: '利用規約' }));

    expect(mockRouter.push).toHaveBeenCalledWith(routes.legalDocument('terms'));
    expect(mockRouter.push).toHaveBeenCalledWith('/legal/terms');
  });

  it('「プライバシーポリシー」を押すと legal の privacy へ遷移する', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'プライバシーポリシー' }));

    expect(mockRouter.push).toHaveBeenCalledWith(routes.legalDocument('privacy'));
    expect(mockRouter.push).toHaveBeenCalledWith('/legal/privacy');
  });

  it('利用規約とプライバシーポリシーは異なる遷移先を持つ', () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByRole('button', { name: '利用規約' }));
    fireEvent.press(screen.getByRole('button', { name: 'プライバシーポリシー' }));

    const calls = mockRouter.push.mock.calls.map((call: unknown[]) => call[0]);
    expect(calls).toContain('/legal/terms');
    expect(calls).toContain('/legal/privacy');
    expect(calls[0]).not.toBe(calls[1]);
  });
});
