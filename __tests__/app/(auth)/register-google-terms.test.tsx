/**
 * @module __tests__/app/(auth)/register-google-terms
 * RegisterScreen の Google 規約同意フロー（TERMS_ACCEPTANCE_REQUIRED）結線テスト。
 * 既存の register-google-auth.test.tsx とは重複しない、モーダル表示・再試行・キャンセルのケースのみを扱う。
 *
 * useGoogleAuth の error 検知は「前回値との参照比較」で行われる（RegisterScreen 実装）ため、
 * 初回レンダーで error を渡しただけではモーダルは開かない。null → エラー への遷移を
 * rerender で再現してからアサーションする。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../utils/test-utils';
import RegisterScreen from '@/app/(auth)/register/index';
import { ApiError } from '@/lib/api/errors';
import { ERR_TERMS_ACCEPTANCE_REQUIRED, ERR_GOOGLE_SIGN_IN_FAILED } from '@/lib/constants/errors';
import { CURRENT_TERMS_VERSION } from '@/lib/constants/terms';
import { useGoogleAuth } from '@/lib/auth';

const mockGoogleSignIn = jest.fn();

jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  useGoogleAuth: jest.fn(() => ({
    signIn: mockGoogleSignIn,
    isLoading: false,
    isAvailable: true,
    error: null,
  })),
}));

const mockUseGoogleAuth = useGoogleAuth as jest.MockedFunction<typeof useGoogleAuth>;

function setGoogleAuthState(overrides: Partial<ReturnType<typeof useGoogleAuth>>) {
  mockUseGoogleAuth.mockReturnValue({
    signIn: mockGoogleSignIn,
    isLoading: false,
    isAvailable: true,
    error: null,
    ...overrides,
  });
}

const termsRequiredError = new ApiError({
  code: 'TERMS_ACCEPTANCE_REQUIRED',
  status: 403,
  message: ERR_TERMS_ACCEPTANCE_REQUIRED,
});

/**
 * RegisterScreen を error: null でマウントしてから error を差し替えて rerender する。
 * useGoogleAuth の error は前回値との参照比較で検知されるため、初回マウント時の
 * error 指定だけではモーダルが開かない実装（画面側の派生 state 調整パターン）。
 */
function renderWithGoogleErrorTransition(error: Error) {
  setGoogleAuthState({ error: null });
  const utils = renderWithProviders(<RegisterScreen />);
  setGoogleAuthState({ error });
  utils.rerender(<RegisterScreen />);
  return utils;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGoogleSignIn.mockResolvedValue(undefined);
  setGoogleAuthState({});
});

describe('RegisterScreen - Google 規約同意フロー', () => {
  it('TERMS_ACCEPTANCE_REQUIRED エラーへの遷移で同意モーダルが表示される', () => {
    renderWithGoogleErrorTransition(termsRequiredError);
    expect(screen.getByText('利用規約への同意')).toBeTruthy();
    expect(screen.getByRole('checkbox')).toBeTruthy();
  });

  it('モーダル表示中はボタン下の生エラー表示が隠れる', () => {
    renderWithGoogleErrorTransition(termsRequiredError);
    expect(screen.getAllByText(ERR_TERMS_ACCEPTANCE_REQUIRED)).toHaveLength(1);
  });

  it('他のエラー（TERMS_ACCEPTANCE_REQUIRED 以外）ではモーダルが表示されない', () => {
    renderWithGoogleErrorTransition(new Error(ERR_GOOGLE_SIGN_IN_FAILED));
    expect(screen.queryByText('利用規約への同意')).toBeNull();
    expect(screen.getByText(ERR_GOOGLE_SIGN_IN_FAILED)).toBeTruthy();
  });

  it('他の 403 エラー（別コード）ではモーダルが表示されない', () => {
    const otherForbiddenError = new ApiError({
      code: 'ACCOUNT_SUSPENDED',
      status: 403,
      message: 'アカウントが停止されています',
    });
    renderWithGoogleErrorTransition(otherForbiddenError);
    expect(screen.queryByText('利用規約への同意')).toBeNull();
    expect(screen.getByText('アカウントが停止されています')).toBeTruthy();
  });

  it('同意してモーダルの同意ボタンを押すと termsAccepted 付きで signIn が呼ばれる', async () => {
    renderWithGoogleErrorTransition(termsRequiredError);

    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByRole('button', { name: '同意して続行' }));

    await waitFor(() => {
      expect(mockGoogleSignIn).toHaveBeenCalledWith({
        termsAccepted: true,
        termsVersion: CURRENT_TERMS_VERSION,
      });
    });
  });

  it('モーダルのキャンセルボタンを押すとモーダルが閉じる（signIn は呼ばれない）', async () => {
    renderWithGoogleErrorTransition(termsRequiredError);

    expect(screen.getByText('利用規約への同意')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));

    await waitFor(() => {
      expect(screen.queryByText('利用規約への同意')).toBeNull();
    });
    expect(mockGoogleSignIn).not.toHaveBeenCalled();
  });
});
