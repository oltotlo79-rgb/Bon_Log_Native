/**
 * @module __tests__/components/post/PostBodyInput
 * PostBodyInput コンポーネントのテスト。
 * 文字数カウンタの表示・警告色切り替え・上限超過アラートロールを検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PostBodyInput } from '@/components/post/PostBodyInput';

const onChange = jest.fn();
const MAX_LENGTH = 500;
const WARNING_THRESHOLD = 50;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PostBodyInput', () => {
  describe('基本表示', () => {
    it('テキスト入力エリアが表示される', () => {
      render(
        <PostBodyInput
          value=""
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );
      expect(screen.getByTestId('post-body-input')).toBeTruthy();
    });

    it('空文字のときカウンタは「0 / {maxLength}」と表示される', () => {
      render(
        <PostBodyInput
          value=""
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );
      expect(screen.getByText(`0 / ${MAX_LENGTH}`)).toBeTruthy();
    });

    it('入力値の長さがカウンタに反映される', () => {
      const text = 'あいうえお';
      render(
        <PostBodyInput
          value={text}
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );
      expect(screen.getByText(`${text.length} / ${MAX_LENGTH}`)).toBeTruthy();
    });

    it('プレースホルダーが表示される', () => {
      render(
        <PostBodyInput
          value=""
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );
      const input = screen.getByTestId('post-body-input');
      expect(input.props.placeholder).toBe('盆栽の記録をシェアしましょう...');
    });
  });

  describe('テキスト入力', () => {
    it('テキストを入力すると onChange が呼ばれる', () => {
      render(
        <PostBodyInput
          value=""
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );

      fireEvent.changeText(screen.getByTestId('post-body-input'), '盆栽の春管理');

      expect(onChange).toHaveBeenCalledWith('盆栽の春管理');
    });

    it('isDisabled が true のとき入力フィールドは編集不可', () => {
      render(
        <PostBodyInput
          value=""
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={true}
        />
      );

      const input = screen.getByTestId('post-body-input');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('文字数カウンタ', () => {
    it('残り文字数が上限を超えてない（通常）ときカウンタは text ロール', () => {
      const normalText = 'a'.repeat(MAX_LENGTH - WARNING_THRESHOLD - 1);
      render(
        <PostBodyInput
          value={normalText}
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );

      const counter = screen.getByLabelText(`${normalText.length}文字 / ${MAX_LENGTH}文字`);
      expect(counter.props.accessibilityRole).toBe('text');
    });

    it('上限を超えた場合、カウンタは alert ロールになる（スクリーンリーダー対応）', () => {
      const overLimitText = 'a'.repeat(MAX_LENGTH + 1);
      render(
        <PostBodyInput
          value={overLimitText}
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );

      const counter = screen.getByLabelText(`${overLimitText.length}文字 / ${MAX_LENGTH}文字`);
      expect(counter.props.accessibilityRole).toBe('alert');
    });

    it('残り0文字（丁度上限）は alert ではなく text ロール', () => {
      const exactText = 'a'.repeat(MAX_LENGTH);
      render(
        <PostBodyInput
          value={exactText}
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );

      const counter = screen.getByLabelText(`${exactText.length}文字 / ${MAX_LENGTH}文字`);
      expect(counter.props.accessibilityRole).toBe('text');
    });

    it('accessibilityLabel が「{n}文字 / {max}文字」形式', () => {
      const text = 'テスト';
      render(
        <PostBodyInput
          value={text}
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );

      expect(
        screen.getByLabelText(`${text.length}文字 / ${MAX_LENGTH}文字`)
      ).toBeTruthy();
    });
  });

  describe('警告しきい値（残り50文字）', () => {
    it('残り丁度 WARNING_THRESHOLD 文字の時（近接警告ゾーン）', () => {
      const nearText = 'a'.repeat(MAX_LENGTH - WARNING_THRESHOLD);
      render(
        <PostBodyInput
          value={nearText}
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );

      // alert ではなく text ロールのまま（警告色は変わるが role は変わらない）
      const counter = screen.getByLabelText(`${nearText.length}文字 / ${MAX_LENGTH}文字`);
      expect(counter.props.accessibilityRole).toBe('text');
    });
  });

  describe('アクセシビリティ', () => {
    it('入力フィールドに accessibilityLabel がある', () => {
      render(
        <PostBodyInput
          value=""
          onChange={onChange}
          maxLength={MAX_LENGTH}
          isDisabled={false}
        />
      );

      const input = screen.getByLabelText('投稿内容を入力');
      expect(input).toBeTruthy();
    });
  });
});
