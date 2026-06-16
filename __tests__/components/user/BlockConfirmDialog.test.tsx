/**
 * @module __tests__/components/user/BlockConfirmDialog
 * BlockConfirmDialog コンポーネントのテスト。
 * Android パスでの確認ダイアログ（警告文言 / confirm / cancel / disabled）を検証する。
 * iOS パス（Alert.alert）は副作用チェックで最小限に留める。
 */

import React from 'react';
import { Alert, Platform } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { BlockConfirmDialog } from '@/components/user/BlockConfirmDialog';

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // テストは Android パスをデフォルトとする
  Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
});

// ---------------------------------------------------------------------------
// Android パステスト
// ---------------------------------------------------------------------------

describe('BlockConfirmDialog (Android)', () => {
  const defaultProps = {
    targetUserId: 'user-2',
    targetNickname: '盆栽花子',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    isBlocking: false,
  };

  it('ブロック確認のタイトルが表示される', () => {
    render(<BlockConfirmDialog {...defaultProps} />);
    expect(screen.getByText('@盆栽花子 をブロックしますか？')).toBeTruthy();
  });

  it('フォロー解除に関する警告文言が表示される', () => {
    render(<BlockConfirmDialog {...defaultProps} />);
    expect(
      screen.getByText(
        'ブロックすると、互いにフォローしている場合はフォロー関係が解除され、相手はあなたのプロフィールを検索・フォローできなくなります。'
      )
    ).toBeTruthy();
  });

  it('「ブロックする」ボタンを押すと onConfirm が呼ばれる', () => {
    const onConfirm = jest.fn();
    render(<BlockConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.press(screen.getByRole('button', { name: 'ブロックする' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('「キャンセル」ボタンを押すと onCancel が呼ばれる', () => {
    const onCancel = jest.fn();
    render(<BlockConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('isBlocking=true のとき「ブロックする」ボタンが disabled になる', () => {
    render(<BlockConfirmDialog {...defaultProps} isBlocking />);
    const confirmBtn = screen.getByRole('button', { name: 'ブロックする' });
    expect(confirmBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('isBlocking=true のとき「キャンセル」ボタンが disabled になる', () => {
    render(<BlockConfirmDialog {...defaultProps} isBlocking />);
    const cancelBtn = screen.getByRole('button', { name: 'キャンセル' });
    // disabled は Pressable の prop か accessibilityState のどちらかで表現される
    expect(
      cancelBtn.props.disabled === true ||
      cancelBtn.props.accessibilityState?.disabled === true
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// iOS パステスト
// ---------------------------------------------------------------------------

describe('BlockConfirmDialog (iOS)', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    alertSpy.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
  });

  it('iOS では Alert.alert が呼ばれカスタムモーダルは表示されない', () => {
    const { toJSON } = render(
      <BlockConfirmDialog
        targetUserId="user-2"
        targetNickname="盆栽花子"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isBlocking={false}
      />
    );
    expect(alertSpy).toHaveBeenCalled();
    expect(toJSON()).toBeNull();
  });
});
