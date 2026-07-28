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

// モーダル内での再送後に発生した「別インスタンス」の 403 を表す。
// 同じ TERMS_ACCEPTANCE_REQUIRED でもメッセージを変えて、静的な modal 本文（ERR_TERMS_ACCEPTANCE_REQUIRED）
// と見分けが付くようにしている。
const termsRequiredErrorOnResend = new ApiError({
  code: 'TERMS_ACCEPTANCE_REQUIRED',
  status: 403,
  message: '同意内容の再送に失敗しました（テスト用の再送エラー）',
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

  describe('モーダル内での再送 403（modalOpenedForError による区別）', () => {
    it('初回の 403 ではモーダル内にエラーが表示されない', () => {
      renderWithGoogleErrorTransition(termsRequiredError);
      expect(screen.getByText('利用規約への同意')).toBeTruthy();
      // 静的な body 文言（ERR_TERMS_ACCEPTANCE_REQUIRED）以外に FormErrorMessage は描画されない
      expect(screen.getAllByText(ERR_TERMS_ACCEPTANCE_REQUIRED)).toHaveLength(1);
    });

    it('モーダル内で同意して再送し、再び 403 になった場合はモーダル内にエラーが表示される', async () => {
      // 再送が失敗する経路（.catch のみが呼ばれ、モーダルは閉じない）を模す
      mockGoogleSignIn.mockRejectedValueOnce(new Error('resend failed'));
      const utils = renderWithGoogleErrorTransition(termsRequiredError);

      fireEvent.press(screen.getByRole('checkbox'));
      fireEvent.press(screen.getByRole('button', { name: '同意して続行' }));

      await waitFor(() => {
        expect(mockGoogleSignIn).toHaveBeenCalledWith({
          termsAccepted: true,
          termsVersion: CURRENT_TERMS_VERSION,
        });
      });

      // フックの mutation.error が新しいインスタンスの 403 に更新されたことを模す
      setGoogleAuthState({ error: termsRequiredErrorOnResend });
      utils.rerender(<RegisterScreen />);

      expect(screen.getByText('利用規約への同意')).toBeTruthy();
      expect(screen.getByText(termsRequiredErrorOnResend.message)).toBeTruthy();
    });

    it('再送エラー表示中も画面下の生エラー表示は隠れたままになる', async () => {
      mockGoogleSignIn.mockRejectedValueOnce(new Error('resend failed'));
      const utils = renderWithGoogleErrorTransition(termsRequiredError);

      fireEvent.press(screen.getByRole('checkbox'));
      fireEvent.press(screen.getByRole('button', { name: '同意して続行' }));
      await waitFor(() => {
        expect(mockGoogleSignIn).toHaveBeenCalled();
      });

      setGoogleAuthState({ error: termsRequiredErrorOnResend });
      utils.rerender(<RegisterScreen />);

      // モーダル内・画面下の両方を合わせても再送エラーの文言は 1 箇所にしか出ない
      expect(screen.getAllByText(termsRequiredErrorOnResend.message)).toHaveLength(1);
    });

    it('キャンセルして閉じた後に再び 403 が起きた場合、新しい 403 は初回として扱われモーダル内にエラーが表示されない', () => {
      const utils = renderWithGoogleErrorTransition(termsRequiredError);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(screen.queryByText('利用規約への同意')).toBeNull();

      const secondFirstTimeError = new ApiError({
        code: 'TERMS_ACCEPTANCE_REQUIRED',
        status: 403,
        message: '2回目の登録試行での初回 403（テスト用）',
      });
      setGoogleAuthState({ error: secondFirstTimeError });
      utils.rerender(<RegisterScreen />);

      expect(screen.getByText('利用規約への同意')).toBeTruthy();
      expect(screen.queryByText(secondFirstTimeError.message)).toBeNull();
    });
  });
});
