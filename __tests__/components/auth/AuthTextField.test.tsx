/**
 * components/auth/AuthTextField のユニットテスト。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AuthTextField } from '@/components/auth/AuthTextField';

describe('AuthTextField', () => {
  it('ラベルが表示される', () => {
    render(<AuthTextField label="メールアドレス" />);
    expect(screen.getByText('メールアドレス')).toBeTruthy();
  });

  it('accessibilityLabel にラベルが設定される', () => {
    render(<AuthTextField label="メールアドレス" />);
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy();
  });

  it('error が null のときエラー行が描画されない', () => {
    render(<AuthTextField label="メールアドレス" error={null} />);
    const json = JSON.stringify(render(<AuthTextField label="メールアドレス" error={null} />).toJSON());
    expect(json).not.toContain('alert-circle-outline');
  });

  it('error が undefined のときエラー行が描画されない', () => {
    const { toJSON } = render(<AuthTextField label="メールアドレス" error={undefined} />);
    expect(JSON.stringify(toJSON())).not.toContain('alert-circle-outline');
  });

  it('error が空文字のときエラー行が描画されない', () => {
    const { toJSON } = render(<AuthTextField label="メールアドレス" error="" />);
    expect(JSON.stringify(toJSON())).not.toContain('alert-circle-outline');
  });

  it('error が文字列のときエラーテキストが表示される', () => {
    render(<AuthTextField label="メールアドレス" error="入力してください" />);
    expect(screen.getByText('入力してください')).toBeTruthy();
  });

  it('error があるとき accessibilityRole="alert" のコンテナが描画される', () => {
    const { toJSON } = render(
      <AuthTextField label="メールアドレス" error="入力してください" />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"accessibilityRole":"alert"');
  });

  it('blur 時に onBlur が呼ばれる', () => {
    const onBlur = jest.fn();
    render(<AuthTextField label="メールアドレス" onBlur={onBlur} />);
    const input = screen.getByLabelText('メールアドレス');
    fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('error が渡されているとき blur 後もエラーが表示される', () => {
    const onBlur = jest.fn();
    render(
      <AuthTextField
        label="メールアドレス"
        error="入力してください"
        onBlur={onBlur}
      />
    );
    const input = screen.getByLabelText('メールアドレス');
    fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(screen.getByText('入力してください')).toBeTruthy();
  });

  it('フォーカス時に onFocus が呼ばれる', () => {
    const onFocus = jest.fn();
    render(<AuthTextField label="メールアドレス" onFocus={onFocus} />);
    const input = screen.getByLabelText('メールアドレス');
    fireEvent(input, 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('disabled=true のとき editable が false になる', () => {
    render(<AuthTextField label="メールアドレス" disabled />);
    const input = screen.getByLabelText('メールアドレス');
    expect(input.props.editable).toBe(false);
  });

  it('disabled=false のとき editable が true になる', () => {
    render(<AuthTextField label="メールアドレス" disabled={false} />);
    const input = screen.getByLabelText('メールアドレス');
    expect(input.props.editable).toBe(true);
  });

  it('placeholder が TextInput に渡される', () => {
    render(<AuthTextField label="テスト" placeholder="入力してください" />);
    const input = screen.getByLabelText('テスト');
    expect(input.props.placeholder).toBe('入力してください');
  });

  it('error がある状態でフォーカスしてもエラーテキストが表示されたまま', () => {
    render(<AuthTextField label="テスト" error="エラーメッセージ" />);
    const input = screen.getByLabelText('テスト');
    fireEvent(input, 'focus');
    expect(screen.getByText('エラーメッセージ')).toBeTruthy();
  });
});
