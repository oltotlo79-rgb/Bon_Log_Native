/**
 * components/common/OfflineBanner のコンポーネントテスト。
 * isVisible=true/false、accessibilityRole="alert"、accessibilityLiveRegion を確認する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ERR_OFFLINE } from '@/lib/constants/errors';

// Animated.Value のタイマーによる act 警告を抑制する
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('OfflineBanner', () => {
  describe('accessibilityRole', () => {
    it('accessibilityRole="alert" が属性として設定される', () => {
      const { toJSON } = render(<OfflineBanner isVisible={true} />);
      expect(JSON.stringify(toJSON())).toContain('"alert"');
    });
  });

  describe('accessibilityLiveRegion', () => {
    it('accessibilityLiveRegion="assertive" が属性として設定される', () => {
      const { toJSON } = render(<OfflineBanner isVisible={true} />);
      expect(JSON.stringify(toJSON())).toContain('"assertive"');
    });
  });

  describe('isVisible=true（オフライン）', () => {
    it('デフォルトメッセージ（ERR_OFFLINE）が表示される', () => {
      render(<OfflineBanner isVisible={true} />);
      expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
    });

    it('accessibilityLabel に ERR_OFFLINE が設定される', () => {
      render(<OfflineBanner isVisible={true} />);
      expect(screen.getByLabelText(ERR_OFFLINE)).toBeTruthy();
    });

    it('カスタムメッセージを表示できる', () => {
      render(<OfflineBanner isVisible={true} message="接続できません" />);
      expect(screen.getByText('接続できません')).toBeTruthy();
    });

    it('カスタムメッセージが accessibilityLabel に設定される', () => {
      render(<OfflineBanner isVisible={true} message="接続できません" />);
      expect(screen.getByLabelText('接続できません')).toBeTruthy();
    });
  });

  describe('isVisible=false（オンライン）', () => {
    it('メッセージテキストは DOM に存在する（アニメーションで非表示）', () => {
      render(<OfflineBanner isVisible={false} />);
      // テキスト自体は DOM にあるが accessibilityLabel は undefined
      expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
    });

    it('isVisible=false のとき accessibilityLabel が設定されない', () => {
      render(<OfflineBanner isVisible={false} />);
      expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
    });
  });
});
