/**
 * components/post/RepostIndicator のコンポーネントテスト。
 * リポストヘッダー表示・アクセシビリティ・ニックネームタップ遷移を網羅する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { RepostIndicator } from '@/components/post/RepostIndicator';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

describe('RepostIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示', () => {
    it('reposterNickname が表示される', () => {
      renderWithProviders(
        <RepostIndicator reposterUserId="user-1" reposterNickname="松の匠" />
      );
      expect(screen.getByText('松の匠')).toBeTruthy();
    });

    it('「がリポスト」テキストが表示される', () => {
      renderWithProviders(
        <RepostIndicator reposterUserId="user-1" reposterNickname="松の匠" />
      );
      expect(screen.getByText('がリポスト')).toBeTruthy();
    });

    it('リピートアイコンが表示される', () => {
      renderWithProviders(
        <RepostIndicator reposterUserId="user-1" reposterNickname="松の匠" />
      );
      expect(screen.getByTestId('icon-repeat', { includeHiddenElements: true })).toBeTruthy();
    });

    it('accessibilityLabel に「がリポスト」を含むラベルが設定される', () => {
      renderWithProviders(
        <RepostIndicator reposterUserId="user-1" reposterNickname="松の匠" />
      );
      expect(screen.getByLabelText('松の匠がリポスト')).toBeTruthy();
    });

    it('ニックネームボタンに accessibilityRole="link" が設定される', () => {
      renderWithProviders(
        <RepostIndicator reposterUserId="user-1" reposterNickname="松の匠" />
      );
      expect(screen.getByRole('link', { name: '松の匠のプロフィールを表示' })).toBeTruthy();
    });

    it('ニックネームボタンに正しい accessibilityLabel が設定される', () => {
      renderWithProviders(
        <RepostIndicator reposterUserId="user-2" reposterNickname="盆栽花子" />
      );
      expect(screen.getByLabelText('盆栽花子のプロフィールを表示')).toBeTruthy();
    });
  });

  describe('タップ遷移', () => {
    it('ニックネームをタップするとユーザー詳細画面に遷移する', () => {
      renderWithProviders(
        <RepostIndicator reposterUserId="user-42" reposterNickname="松の匠" />
      );
      fireEvent.press(screen.getByRole('link', { name: '松の匠のプロフィールを表示' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/users/user-42');
    });

    it('異なるユーザー ID のとき正しいルートに遷移する', () => {
      renderWithProviders(
        <RepostIndicator reposterUserId="abc-xyz" reposterNickname="盆栽花子" />
      );
      fireEvent.press(screen.getByRole('link', { name: '盆栽花子のプロフィールを表示' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/users/abc-xyz');
    });

    it('ニックネームタップで router.push が1回だけ呼ばれる', () => {
      renderWithProviders(
        <RepostIndicator reposterUserId="user-1" reposterNickname="松の匠" />
      );
      fireEvent.press(screen.getByRole('link', { name: '松の匠のプロフィールを表示' }));
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
    });
  });

  describe('長いニックネーム', () => {
    it('長いニックネームが切り捨てられずに props として渡される', () => {
      const longNickname = '非常に長い盆栽ユーザーのニックネームです';
      renderWithProviders(
        <RepostIndicator reposterUserId="user-1" reposterNickname={longNickname} />
      );
      expect(screen.getByText(longNickname)).toBeTruthy();
    });
  });
});
