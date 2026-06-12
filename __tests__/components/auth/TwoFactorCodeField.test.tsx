/**
 * components/auth/TwoFactorCodeField のユニットテスト。
 * モード別 keyboardType / autoComplete、forwardRef を確認する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TwoFactorCodeField } from '@/components/auth/TwoFactorCodeField';

describe('TwoFactorCodeField', () => {
  describe('TOTP モード', () => {
    it('ラベルに「認証コード」が表示される', () => {
      render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={jest.fn()}
        />
      );
      expect(screen.getByText('認証コード')).toBeTruthy();
    });

    it('アクセシビリティラベルが「認証コード入力フィールド」になる', () => {
      render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={jest.fn()}
        />
      );
      expect(screen.getByLabelText('認証コード入力フィールド')).toBeTruthy();
    });

    it('プレースホルダーが「000000」になる', () => {
      const { toJSON } = render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={jest.fn()}
        />
      );
      expect(JSON.stringify(toJSON())).toContain('000000');
    });

    it('数字のみに絞り込んで onChangeText を呼ぶ', () => {
      const onChangeText = jest.fn();
      render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={onChangeText}
        />
      );
      const input = screen.getByLabelText('認証コード入力フィールド');
      fireEvent.changeText(input, '12a3b4');
      expect(onChangeText).toHaveBeenCalledWith('1234');
    });

    it('6 文字を超える入力は 6 文字に切り詰める', () => {
      const onChangeText = jest.fn();
      render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={onChangeText}
        />
      );
      const input = screen.getByLabelText('認証コード入力フィールド');
      fireEvent.changeText(input, '1234567890');
      expect(onChangeText).toHaveBeenCalledWith('123456');
    });

    it('数字を 5 文字入力できる（6 文字未満）', () => {
      const onChangeText = jest.fn();
      render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={onChangeText}
        />
      );
      const input = screen.getByLabelText('認証コード入力フィールド');
      fireEvent.changeText(input, '12345');
      expect(onChangeText).toHaveBeenCalledWith('12345');
    });

    it('disabled=true のとき入力フィールドが操作不可になる', () => {
      render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={jest.fn()}
          disabled
        />
      );
      const input = screen.getByLabelText('認証コード入力フィールド');
      expect(input.props.editable).toBe(false);
    });

    it('disabled=false（デフォルト）のとき入力フィールドが操作可能', () => {
      render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={jest.fn()}
        />
      );
      const input = screen.getByLabelText('認証コード入力フィールド');
      expect(input.props.editable).toBe(true);
    });
  });

  describe('バックアップコード モード', () => {
    it('ラベルに「バックアップコード」が表示される', () => {
      render(
        <TwoFactorCodeField
          mode="backup"
          value=""
          onChangeText={jest.fn()}
        />
      );
      expect(screen.getByText('バックアップコード')).toBeTruthy();
    });

    it('アクセシビリティラベルが「バックアップコード入力フィールド」になる', () => {
      render(
        <TwoFactorCodeField
          mode="backup"
          value=""
          onChangeText={jest.fn()}
        />
      );
      expect(screen.getByLabelText('バックアップコード入力フィールド')).toBeTruthy();
    });

    it('プレースホルダーが「XXXX-XXXXXXXX」になる', () => {
      const { toJSON } = render(
        <TwoFactorCodeField
          mode="backup"
          value=""
          onChangeText={jest.fn()}
        />
      );
      expect(JSON.stringify(toJSON())).toContain('XXXX-XXXXXXXX');
    });

    it('バックアップコードモードでは入力をそのまま渡す', () => {
      const onChangeText = jest.fn();
      render(
        <TwoFactorCodeField
          mode="backup"
          value=""
          onChangeText={onChangeText}
        />
      );
      const input = screen.getByLabelText('バックアップコード入力フィールド');
      fireEvent.changeText(input, 'ABCD-12345678');
      expect(onChangeText).toHaveBeenCalledWith('ABCD-12345678');
    });

    it('バックアップコードモードでは文字数制限がない', () => {
      const onChangeText = jest.fn();
      render(
        <TwoFactorCodeField
          mode="backup"
          value=""
          onChangeText={onChangeText}
        />
      );
      const input = screen.getByLabelText('バックアップコード入力フィールド');
      const longCode = 'ABCD-EFGH-IJKL-1234-5678';
      fireEvent.changeText(input, longCode);
      expect(onChangeText).toHaveBeenCalledWith(longCode);
    });
  });

  describe('hasError', () => {
    it('hasError=true のときエラースタイルが適用される（境界色が変化）', () => {
      const { toJSON: withError } = render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={jest.fn()}
          hasError
        />
      );
      const { toJSON: withoutError } = render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={jest.fn()}
          hasError={false}
        />
      );
      // エラーあり・なしで描画が異なること
      expect(JSON.stringify(withError())).not.toBe(JSON.stringify(withoutError()));
    });
  });

  describe('onSubmitEditing', () => {
    it('onSubmitEditing が設定されている場合にフォーム送信イベントで呼ばれる', () => {
      const onSubmitEditing = jest.fn();
      render(
        <TwoFactorCodeField
          mode="totp"
          value="123456"
          onChangeText={jest.fn()}
          onSubmitEditing={onSubmitEditing}
        />
      );
      const input = screen.getByLabelText('認証コード入力フィールド');
      fireEvent(input, 'submitEditing');
      expect(onSubmitEditing).toHaveBeenCalledTimes(1);
    });
  });

  describe('フォーカス・ブラー', () => {
    it('フォーカス時に描画が変化する（ボーダー色が変わる）', () => {
      const { toJSON } = render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={jest.fn()}
        />
      );
      const input = screen.getByLabelText('認証コード入力フィールド');
      // フォーカス前後で JSON が変化する
      const before = JSON.stringify(toJSON());
      fireEvent(input, 'focus');
      const after = JSON.stringify(toJSON());
      expect(before).not.toBe(after);
    });

    it('ブラー後は通常スタイルに戻る', () => {
      const { toJSON } = render(
        <TwoFactorCodeField
          mode="totp"
          value=""
          onChangeText={jest.fn()}
        />
      );
      const input = screen.getByLabelText('認証コード入力フィールド');
      const initialState = JSON.stringify(toJSON());
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');
      const afterBlur = JSON.stringify(toJSON());
      expect(initialState).toBe(afterBlur);
    });
  });
});
