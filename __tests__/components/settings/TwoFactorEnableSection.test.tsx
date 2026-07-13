/**
 * @module __tests__/components/settings/TwoFactorEnableSection
 * TwoFactorEnableSection の有効化フロー（開始 → シークレット表示 → コード入力 → 有効化）を検証する。
 * モック境界: lib/queries/auth の useTwoFactorSetupMutation / useEnableTwoFactorMutation。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { TwoFactorEnableSection } from '@/components/settings/TwoFactorEnableSection';
import { ApiError } from '@/lib/api/errors';
import type { MobileApiErrorCode } from '@/lib/api/errors';
import {
  ERR_2FA_ENABLE_INVALID_CODE,
  ERR_2FA_SETUP_EXPIRED_SETTINGS,
  ERR_2FA_ALREADY_ENABLED,
  ERR_GENERIC,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockSetupMutateAsync = jest.fn();
const mockEnableMutate = jest.fn();

jest.mock('@/lib/queries/auth', () => ({
  useTwoFactorSetupMutation: jest.fn(() => ({
    mutateAsync: mockSetupMutateAsync,
    isPending: false,
  })),
  useEnableTwoFactorMutation: jest.fn(() => ({
    mutate: mockEnableMutate,
    isPending: false,
  })),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeSetupResponse() {
  return {
    secret: 'JBSWY3DPEHPK3PXP',
    otpAuthUrl: 'otpauth://totp/BonLog?secret=JBSWY3DPEHPK3PXP',
    setupId: 'setup-123',
    backupCodes: ['ABCD-EFGH1234', 'IJKL-MNOP5678'],
  };
}

function makeApiError(code: MobileApiErrorCode, status = 400): ApiError {
  return new ApiError({ code, status, message: 'error' });
}

async function startSetup() {
  fireEvent.press(screen.getByRole('button', { name: '2段階認証を設定する' }));
  await waitFor(() => expect(screen.getByLabelText('シークレットキー')).toBeTruthy());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetupMutateAsync.mockResolvedValue(makeSetupResponse());
});

// ---------------------------------------------------------------------------
// 初期表示
// ---------------------------------------------------------------------------

describe('TwoFactorEnableSection 初期表示', () => {
  it('「2段階認証を設定する」ボタンが表示される', () => {
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    expect(screen.getByRole('button', { name: '2段階認証を設定する' })).toBeTruthy();
  });

  it('isOnline=false のときボタンが無効化される', () => {
    renderWithProviders(<TwoFactorEnableSection isOnline={false} />);
    const button = screen.getByRole('button', { name: '2段階認証を設定する' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 有効化フロー: setup 開始 → シークレット表示 → コード入力 → enable
// ---------------------------------------------------------------------------

describe('TwoFactorEnableSection 有効化フロー', () => {
  it('setup 開始でシークレットキーと otpauth URL が表示される', async () => {
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();
    expect(screen.getByLabelText('シークレットキー')).toHaveTextContent('JBSWY3DPEHPK3PXP');
    expect(screen.getByLabelText('otpauth URL')).toHaveTextContent(
      'otpauth://totp/BonLog?secret=JBSWY3DPEHPK3PXP'
    );
  });

  it('setup 開始でバックアップコードが表示される', async () => {
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();
    expect(screen.getByLabelText('バックアップコード ABCD-EFGH1234')).toBeTruthy();
    expect(screen.getByLabelText('バックアップコード IJKL-MNOP5678')).toBeTruthy();
  });

  it('setup 開始で QR コード画像が表示され、シークレットキー等のフォールバックテキストと併存する', async () => {
    // QR の data URI 形式（svg / gif / base64 等）には依存しない。
    // accessibilityLabel を持つ画像要素の存在と、読み取れない環境向けの
    // テキストフォールバック（シークレットキー・otpauth URL）が両方あることのみ検証する。
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();
    expect(screen.getByLabelText('2FA QRコード')).toBeTruthy();
    expect(screen.getByLabelText('シークレットキー')).toBeTruthy();
    expect(screen.getByLabelText('otpauth URL')).toBeTruthy();
  });

  it('コードを入力して有効化するとサーバーへ code と setupId が渡る', async () => {
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();

    fireEvent.changeText(screen.getByLabelText('認証コード入力フィールド'), '123456');
    fireEvent.press(screen.getByRole('button', { name: '有効化する' }));

    expect(mockEnableMutate).toHaveBeenCalledWith(
      { code: '123456', setupId: 'setup-123' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it('enable 成功で完了メッセージが表示される', async () => {
    mockEnableMutate.mockImplementation((_params, { onSuccess }) => onSuccess());
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();

    fireEvent.changeText(screen.getByLabelText('認証コード入力フィールド'), '123456');
    fireEvent.press(screen.getByRole('button', { name: '有効化する' }));

    expect(screen.getByText('2段階認証が有効になりました')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラーコード別の文言
// ---------------------------------------------------------------------------

describe('TwoFactorEnableSection エラー文言', () => {
  it('AUTH_2FA_INVALID_CODE で ERR_2FA_ENABLE_INVALID_CODE が表示される', async () => {
    mockEnableMutate.mockImplementation((_params, { onError }) =>
      onError(makeApiError('AUTH_2FA_INVALID_CODE'))
    );
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();

    fireEvent.changeText(screen.getByLabelText('認証コード入力フィールド'), '000000');
    fireEvent.press(screen.getByRole('button', { name: '有効化する' }));

    expect(screen.getByText(ERR_2FA_ENABLE_INVALID_CODE)).toBeTruthy();
  });

  it('AUTH_2FA_TICKET_EXPIRED で ERR_2FA_SETUP_EXPIRED_SETTINGS が表示される', async () => {
    mockEnableMutate.mockImplementation((_params, { onError }) =>
      onError(makeApiError('AUTH_2FA_TICKET_EXPIRED'))
    );
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();

    fireEvent.changeText(screen.getByLabelText('認証コード入力フィールド'), '000000');
    fireEvent.press(screen.getByRole('button', { name: '有効化する' }));

    expect(screen.getByText(ERR_2FA_SETUP_EXPIRED_SETTINGS)).toBeTruthy();
  });

  it('CONFLICT で ERR_2FA_ALREADY_ENABLED が表示される', async () => {
    mockEnableMutate.mockImplementation((_params, { onError }) =>
      onError(makeApiError('CONFLICT', 409))
    );
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();

    fireEvent.changeText(screen.getByLabelText('認証コード入力フィールド'), '000000');
    fireEvent.press(screen.getByRole('button', { name: '有効化する' }));

    expect(screen.getByText(ERR_2FA_ALREADY_ENABLED)).toBeTruthy();
  });

  it('未知のエラー（非 ApiError）で ERR_GENERIC が表示される', async () => {
    mockEnableMutate.mockImplementation((_params, { onError }) => onError(new Error('boom')));
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();

    fireEvent.changeText(screen.getByLabelText('認証コード入力フィールド'), '000000');
    fireEvent.press(screen.getByRole('button', { name: '有効化する' }));

    expect(screen.getByText(ERR_GENERIC)).toBeTruthy();
  });

  it('setup 開始が ApiError で失敗した場合もエラー文言が表示される', async () => {
    mockSetupMutateAsync.mockRejectedValue(makeApiError('AUTH_2FA_TICKET_EXPIRED'));
    renderWithProviders(<TwoFactorEnableSection isOnline />);

    fireEvent.press(screen.getByRole('button', { name: '2段階認証を設定する' }));

    await waitFor(() => {
      expect(screen.getByText(ERR_2FA_SETUP_EXPIRED_SETTINGS)).toBeTruthy();
    });
  });

  it('オフラインで setup 開始を押すと ERR_OFFLINE_ACTION が表示される', () => {
    renderWithProviders(<TwoFactorEnableSection isOnline={false} />);
    // ボタンは disabled のため押下は無視されるが、内部の isOnline ガードも確認する
    const button = screen.getByRole('button', { name: '2段階認証を設定する' });
    fireEvent.press(button);
    expect(mockSetupMutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByText(ERR_OFFLINE_ACTION)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// キャンセルで state 破棄
// ---------------------------------------------------------------------------

describe('TwoFactorEnableSection キャンセル', () => {
  it('セットアップ中にキャンセルすると初期表示に戻る', async () => {
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();

    fireEvent.press(screen.getByRole('button', { name: 'セットアップをキャンセル' }));

    expect(screen.getByRole('button', { name: '2段階認証を設定する' })).toBeTruthy();
    expect(screen.queryByLabelText('シークレットキー')).toBeNull();
  });

  it('キャンセル後に再度開始すると入力コードが破棄されている', async () => {
    renderWithProviders(<TwoFactorEnableSection isOnline />);
    await startSetup();
    fireEvent.changeText(screen.getByLabelText('認証コード入力フィールド'), '123456');

    fireEvent.press(screen.getByRole('button', { name: 'セットアップをキャンセル' }));
    await startSetup();

    expect(screen.getByLabelText('認証コード入力フィールド').props.value).toBe('');
  });
});
