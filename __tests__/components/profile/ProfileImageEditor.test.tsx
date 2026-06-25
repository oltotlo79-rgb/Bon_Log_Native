/**
 * @module __tests__/components/profile/ProfileImageEditor
 * ProfileImageEditor コンポーネントのテスト。
 * 画像選択の Alert 呼び出しとコールバックのルーティングを検証する。
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { ProfileImageEditor, type ProfileImageEditorProps } from '@/components/profile/ProfileImageEditor';

const defaultProps: ProfileImageEditorProps = {
  avatarUrl: null,
  headerUrl: null,
  avatarLocalUri: null,
  headerLocalUri: null,
  nickname: 'テストユーザー',
  onAvatarChange: jest.fn(),
  onHeaderChange: jest.fn(),
  onAvatarRemove: jest.fn(),
  onHeaderRemove: jest.fn(),
  isDisabled: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileImageEditor', () => {
  it('アバターエリアに enso 画像が表示される（avatarUrl=null 時）', () => {
    render(<ProfileImageEditor {...defaultProps} />);
    // UserAvatar は avatarUrl=null のとき enso 画像を表示する
    // accessibilityLabel "プロフィール写真" を持つ Image が存在することを確認
    expect(screen.getByLabelText('プロフィール写真')).toBeTruthy();
  });

  it('ヘッダーボタンの accessibilityLabel に「未設定」が含まれる（画像なし）', () => {
    const { getByLabelText } = render(<ProfileImageEditor {...defaultProps} />);
    expect(getByLabelText(/ヘッダー画像を変更。現在未設定/)).toBeTruthy();
  });

  it('avatarUrl がある場合は uri ベースの画像が表示される', () => {
    const { toJSON } = render(
      <ProfileImageEditor {...defaultProps} avatarUrl="https://cdn.bon-log.com/avatar.jpg" />
    );
    // uri 指定の Image が表示されることを JSON ツリーで確認
    expect(JSON.stringify(toJSON())).toContain('https://cdn.bon-log.com/avatar.jpg');
  });

  it('ヘッダーボタンの accessibilityLabel に「設定済み」が含まれる（画像あり）', () => {
    const { getByLabelText } = render(
      <ProfileImageEditor {...defaultProps} headerUrl="https://cdn.bon-log.com/header.jpg" />
    );
    expect(getByLabelText(/ヘッダー画像を変更。現在設定済み/)).toBeTruthy();
  });

  it('ヘッダー画像エリアを押すと Alert.alert が呼ばれる', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = render(<ProfileImageEditor {...defaultProps} />);

    fireEvent.press(getByLabelText(/ヘッダー画像を変更/));
    expect(alertSpy).toHaveBeenCalledWith(
      'ヘッダー画像を変更',
      undefined,
      expect.any(Array)
    );
  });

  it('アバター画像エリアを押すと Alert.alert が呼ばれる', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = render(<ProfileImageEditor {...defaultProps} />);

    fireEvent.press(getByLabelText(/プロフィール写真を変更/));
    expect(alertSpy).toHaveBeenCalledWith(
      'プロフィール写真を変更',
      undefined,
      expect.any(Array)
    );
  });

  it('isDisabled=true のときヘッダーボタンが disabled 状態になる', () => {
    const { getByLabelText } = render(
      <ProfileImageEditor {...defaultProps} isDisabled />
    );

    const headerBtn = getByLabelText(/ヘッダー画像を変更/);
    // TouchableOpacity では disabled は accessibilityState.disabled に反映される
    const isDisabled =
      headerBtn.props.disabled === true ||
      headerBtn.props.accessibilityState?.disabled === true;
    expect(isDisabled).toBe(true);
  });

  it('isDisabled=true のときアバターボタンが disabled 状態になる', () => {
    const { getByLabelText } = render(
      <ProfileImageEditor {...defaultProps} isDisabled />
    );

    const avatarBtn = getByLabelText(/プロフィール写真を変更/);
    const isDisabled =
      avatarBtn.props.disabled === true ||
      avatarBtn.props.accessibilityState?.disabled === true;
    expect(isDisabled).toBe(true);
  });

  it('isDisabled=true のとき押しても Alert が表示されない', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = render(
      <ProfileImageEditor {...defaultProps} isDisabled />
    );

    fireEvent.press(getByLabelText(/ヘッダー画像を変更/));
    // disabled 状態では Alert が呼ばれない
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('既存画像がある場合 Alert に「現在の画像を削除」オプションが含まれる', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = render(
      <ProfileImageEditor {...defaultProps} headerUrl="https://cdn.bon-log.com/header.jpg" />
    );

    fireEvent.press(getByLabelText(/ヘッダー画像を変更/));
    const alertButtons: AlertButton[] = alertSpy.mock.calls[0]?.[2] ?? [];
    const hasDeleteOption = alertButtons.some(
      (btn) => btn.text === '現在の画像を削除'
    );
    expect(hasDeleteOption).toBe(true);
  });

  it('既存画像がない場合 Alert に「現在の画像を削除」オプションが含まれない', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = render(
      <ProfileImageEditor {...defaultProps} headerUrl={null} />
    );

    fireEvent.press(getByLabelText(/ヘッダー画像を変更/));
    const alertButtons: AlertButton[] = alertSpy.mock.calls[0]?.[2] ?? [];
    const hasDeleteOption = alertButtons.some(
      (btn) => btn.text === '現在の画像を削除'
    );
    expect(hasDeleteOption).toBe(false);
  });
});
