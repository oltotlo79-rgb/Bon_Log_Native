/**
 * @module __tests__/app/(auth)/login-google-auth
 * LoginScreen の useGoogleAuth 結線テスト。
 * isAvailable/isLoading/error の各状態を検証する。
 * 既存の login.test.tsx / login-extended.test.tsx とは重複しないよう Google 認証専用ケースのみを扱う。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import LoginScreen from '@/app/(auth)/login/index';
import { ERR_GOOGLE_SIGN_IN_FAILED } from '@/lib/constants/errors';
import { useGoogleAuth } from '@/lib/auth';

// useGoogleAuth をモック。各テストで上書き可能にするため jest.fn() で管理する
const mockGoogleSignIn = jest.fn();

jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  useGoogleAuth: jest.fn(() => ({
    signIn: mockGoogleSignIn,
    isLoading: false,
    isAvailable: false,
    error: null,
  })),
}));

const mockUseGoogleAuth = useGoogleAuth as jest.MockedFunction<typeof useGoogleAuth>;

function setGoogleAuthState(overrides: Partial<ReturnType<typeof useGoogleAuth>>) {
  mockUseGoogleAuth.mockReturnValue({
    signIn: mockGoogleSignIn,
    isLoading: false,
    isAvailable: false,
    error: null,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setGoogleAuthState({});
});

describe('LoginScreen - useGoogleAuth 結線', () => {
  describe('isAvailable', () => {
    it('isAvailable=false のとき Google ボタンが disabled になる', () => {
      setGoogleAuthState({ isAvailable: false });
      renderWithProviders(<LoginScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google でログイン' });
      expect(googleButton.props.accessibilityState.disabled).toBe(true);
    });

    it('isAvailable=true のとき Google ボタンが有効になる', () => {
      setGoogleAuthState({ isAvailable: true });
      renderWithProviders(<LoginScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google でログイン' });
      expect(googleButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('isLoading', () => {
    it('isLoading=true のとき Google ボタンが loading 状態になる（busy が true）', () => {
      setGoogleAuthState({ isLoading: true, isAvailable: true });
      renderWithProviders(<LoginScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google でログイン' });
      expect(googleButton.props.accessibilityState.busy).toBe(true);
    });

    it('isLoading=false のとき Google ボタンの busy が false', () => {
      setGoogleAuthState({ isLoading: false, isAvailable: true });
      renderWithProviders(<LoginScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google でログイン' });
      expect(googleButton.props.accessibilityState.busy).toBe(false);
    });
  });

  describe('error 表示', () => {
    it('error が設定されているときボタン直下にエラー文言が表示される', () => {
      setGoogleAuthState({ error: new Error(ERR_GOOGLE_SIGN_IN_FAILED) });
      renderWithProviders(<LoginScreen />);
      expect(screen.getByText(ERR_GOOGLE_SIGN_IN_FAILED)).toBeTruthy();
    });

    it('error が null のときエラー文言が表示されない', () => {
      setGoogleAuthState({ error: null });
      renderWithProviders(<LoginScreen />);
      expect(screen.queryByText(ERR_GOOGLE_SIGN_IN_FAILED)).toBeNull();
    });
  });

  describe('signIn の呼び出し', () => {
    it('isAvailable=true のとき Google ボタンをタップすると signIn が呼ばれる', () => {
      setGoogleAuthState({ isAvailable: true });
      renderWithProviders(<LoginScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google でログイン' });
      fireEvent.press(googleButton);
      expect(mockGoogleSignIn).toHaveBeenCalledTimes(1);
    });
  });
});
