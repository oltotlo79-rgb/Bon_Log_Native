/**
 * components/auth/GoogleTermsAgreementModal のユニットテスト。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { GoogleTermsAgreementModal } from '@/components/auth/GoogleTermsAgreementModal';
import { ERR_TERMS_ACCEPTANCE_REQUIRED } from '@/lib/constants/errors';

jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

describe('GoogleTermsAgreementModal', () => {
  it('visible=false のとき本文が表示されない', () => {
    render(
      <GoogleTermsAgreementModal
        visible={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isSubmitting={false}
        error={null}
      />
    );
    expect(screen.queryByText(ERR_TERMS_ACCEPTANCE_REQUIRED)).toBeNull();
  });

  it('visible=true のとき説明文とチェックボックスが表示される', () => {
    render(
      <GoogleTermsAgreementModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isSubmitting={false}
        error={null}
      />
    );
    expect(screen.getByText(ERR_TERMS_ACCEPTANCE_REQUIRED)).toBeTruthy();
    expect(screen.getByRole('checkbox')).toBeTruthy();
  });

  it('未チェックのとき同意ボタンが disabled になる', () => {
    render(
      <GoogleTermsAgreementModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isSubmitting={false}
        error={null}
      />
    );
    const confirmButton = screen.getByRole('button', { name: '同意して続行' });
    expect(confirmButton.props.accessibilityState.disabled).toBe(true);
  });

  it('未チェックのまま同意ボタンを押しても onConfirm は呼ばれない', () => {
    const onConfirm = jest.fn();
    render(
      <GoogleTermsAgreementModal
        visible
        onConfirm={onConfirm}
        onCancel={jest.fn()}
        isSubmitting={false}
        error={null}
      />
    );
    fireEvent.press(screen.getByRole('button', { name: '同意して続行' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('チェックしてから同意ボタンを押すと onConfirm が呼ばれる', () => {
    const onConfirm = jest.fn();
    render(
      <GoogleTermsAgreementModal
        visible
        onConfirm={onConfirm}
        onCancel={jest.fn()}
        isSubmitting={false}
        error={null}
      />
    );
    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByRole('button', { name: '同意して続行' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('キャンセルボタンを押すと onCancel が呼ばれる', () => {
    const onCancel = jest.fn();
    render(
      <GoogleTermsAgreementModal
        visible
        onConfirm={jest.fn()}
        onCancel={onCancel}
        isSubmitting={false}
        error={null}
      />
    );
    fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('isSubmitting=true のときキャンセルボタンが disabled になり onCancel が呼ばれない', () => {
    const onCancel = jest.fn();
    render(
      <GoogleTermsAgreementModal
        visible
        onConfirm={jest.fn()}
        onCancel={onCancel}
        isSubmitting
        error={null}
      />
    );
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    expect(cancelButton.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(cancelButton);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('isSubmitting=true のとき同意ボタンが busy かつ disabled になる', () => {
    render(
      <GoogleTermsAgreementModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isSubmitting
        error={null}
      />
    );
    const confirmButton = screen.getByRole('button', { name: '同意して続行' });
    expect(confirmButton.props.accessibilityState.disabled).toBe(true);
    expect(confirmButton.props.accessibilityState.busy).toBe(true);
  });

  it('error が設定されているときモーダル内にエラー文言が表示される', () => {
    render(
      <GoogleTermsAgreementModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isSubmitting={false}
        error="サーバーエラーが発生しました"
      />
    );
    expect(screen.getByText('サーバーエラーが発生しました')).toBeTruthy();
  });

  it('再度 visible になったとき未同意状態にリセットされる（前回チェック済みが持ち越されない）', () => {
    const { rerender } = render(
      <GoogleTermsAgreementModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isSubmitting={false}
        error={null}
      />
    );
    fireEvent.press(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(true);

    rerender(
      <GoogleTermsAgreementModal
        visible={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isSubmitting={false}
        error={null}
      />
    );
    rerender(
      <GoogleTermsAgreementModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isSubmitting={false}
        error={null}
      />
    );

    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(false);
  });
});
