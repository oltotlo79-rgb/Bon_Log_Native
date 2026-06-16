/**
 * @module __tests__/app/(auth)/register-google-auth
 * RegisterScreen の useGoogleAuth 結線テスト。
 * isAvailable/isLoading/error の各状態を検証する。
 * 既存の register.test.tsx / register-extended.test.tsx とは重複しないよう Google 認証専用ケースのみを扱う。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import RegisterScreen from '@/app/(auth)/register/index';
import { ERR_GOOGLE_SIGN_IN_FAILED } from '@/lib/constants/errors';
import { useGoogleAuth } from '@/lib/auth';

// useRegisterMutation のネットワーク呼び出しをモック（既存テストと同一パターン）
jest.mock('@/lib/queries/auth', () => ({
  ...jest.requireActual('@/lib/queries/auth'),
  useRegisterMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

// useGoogleAuth をモック
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

describe('RegisterScreen - useGoogleAuth 結線', () => {
  describe('isAvailable', () => {
    it('isAvailable=false のとき Google ボタンが disabled になる', () => {
      setGoogleAuthState({ isAvailable: false });
      renderWithProviders(<RegisterScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google で登録' });
      expect(googleButton.props.accessibilityState.disabled).toBe(true);
    });

    it('isAvailable=true のとき Google ボタンが有効になる', () => {
      setGoogleAuthState({ isAvailable: true });
      renderWithProviders(<RegisterScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google で登録' });
      expect(googleButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('isLoading', () => {
    it('isLoading=true のとき Google ボタンが loading 状態になる（busy が true）', () => {
      setGoogleAuthState({ isLoading: true, isAvailable: true });
      renderWithProviders(<RegisterScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google で登録' });
      expect(googleButton.props.accessibilityState.busy).toBe(true);
    });

    it('isLoading=false のとき Google ボタンの busy が false', () => {
      setGoogleAuthState({ isLoading: false, isAvailable: true });
      renderWithProviders(<RegisterScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google で登録' });
      expect(googleButton.props.accessibilityState.busy).toBe(false);
    });
  });

  describe('error 表示', () => {
    it('error が設定されているときボタン直下にエラー文言が表示される', () => {
      setGoogleAuthState({ error: new Error(ERR_GOOGLE_SIGN_IN_FAILED) });
      renderWithProviders(<RegisterScreen />);
      expect(screen.getByText(ERR_GOOGLE_SIGN_IN_FAILED)).toBeTruthy();
    });

    it('error が null のときエラー文言が表示されない', () => {
      setGoogleAuthState({ error: null });
      renderWithProviders(<RegisterScreen />);
      expect(screen.queryByText(ERR_GOOGLE_SIGN_IN_FAILED)).toBeNull();
    });
  });

  describe('signIn の呼び出し', () => {
    it('isAvailable=true のとき Google ボタンをタップすると signIn が呼ばれる', () => {
      setGoogleAuthState({ isAvailable: true });
      renderWithProviders(<RegisterScreen />);
      const googleButton = screen.getByRole('button', { name: 'Google で登録' });
      fireEvent.press(googleButton);
      expect(mockGoogleSignIn).toHaveBeenCalledTimes(1);
    });
  });
});
