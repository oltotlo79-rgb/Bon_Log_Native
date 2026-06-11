/**
 * components/common/TabBarIcon のユニットテスト。
 * focused 状態に応じたアイコン名の切り替えを検証する。
 *
 * Ionicons には accessibilityElementsHidden={true} が設定されているため、
 * RNTL のアクセシビリティツリー検索（getByTestId）ではなく
 * UNSAFE_getByProps でモックのテキストコンテンツを検証する。
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { TabBarIcon } from '@/components/common/TabBarIcon';

describe('TabBarIcon', () => {
  describe('focused=true（アクティブ状態）', () => {
    it('home: 塗りアイコン（home）を表示する', () => {
      const { UNSAFE_getByProps } = render(
        <TabBarIcon name="home" color="#000" focused={true} />
      );
      expect(UNSAFE_getByProps({ testID: 'icon-home' })).toBeTruthy();
    });

    it('search: 塗りアイコン（search）を表示する', () => {
      const { UNSAFE_getByProps } = render(
        <TabBarIcon name="search" color="#000" focused={true} />
      );
      expect(UNSAFE_getByProps({ testID: 'icon-search' })).toBeTruthy();
    });

    it('bell: 塗りアイコン（notifications）を表示する', () => {
      const { UNSAFE_getByProps } = render(
        <TabBarIcon name="bell" color="#000" focused={true} />
      );
      expect(UNSAFE_getByProps({ testID: 'icon-notifications' })).toBeTruthy();
    });

    it('user: 塗りアイコン（person）を表示する', () => {
      const { UNSAFE_getByProps } = render(
        <TabBarIcon name="user" color="#000" focused={true} />
      );
      expect(UNSAFE_getByProps({ testID: 'icon-person' })).toBeTruthy();
    });
  });

  describe('focused=false（非アクティブ状態）', () => {
    it('home: アウトラインアイコン（home-outline）を表示する', () => {
      const { UNSAFE_getByProps } = render(
        <TabBarIcon name="home" color="#888" focused={false} />
      );
      expect(UNSAFE_getByProps({ testID: 'icon-home-outline' })).toBeTruthy();
    });

    it('search: アウトラインアイコン（search-outline）を表示する', () => {
      const { UNSAFE_getByProps } = render(
        <TabBarIcon name="search" color="#888" focused={false} />
      );
      expect(UNSAFE_getByProps({ testID: 'icon-search-outline' })).toBeTruthy();
    });

    it('bell: アウトラインアイコン（notifications-outline）を表示する', () => {
      const { UNSAFE_getByProps } = render(
        <TabBarIcon name="bell" color="#888" focused={false} />
      );
      expect(UNSAFE_getByProps({ testID: 'icon-notifications-outline' })).toBeTruthy();
    });

    it('user: アウトラインアイコン（person-outline）を表示する', () => {
      const { UNSAFE_getByProps } = render(
        <TabBarIcon name="user" color="#888" focused={false} />
      );
      expect(UNSAFE_getByProps({ testID: 'icon-person-outline' })).toBeTruthy();
    });
  });

  describe('props の適用', () => {
    it('size を省略した場合はデフォルト 20 で表示できる', () => {
      expect(() =>
        render(<TabBarIcon name="home" color="#000" focused={true} />)
      ).not.toThrow();
    });

    it('size を明示的に指定できる', () => {
      expect(() =>
        render(<TabBarIcon name="home" color="#000" focused={true} size={24} />)
      ).not.toThrow();
    });

    it('focused が切り替わると異なるアイコンが表示される', () => {
      const { UNSAFE_getByProps, rerender } = render(
        <TabBarIcon name="home" color="#000" focused={true} />
      );
      expect(UNSAFE_getByProps({ testID: 'icon-home' })).toBeTruthy();

      rerender(<TabBarIcon name="home" color="#000" focused={false} />);
      expect(UNSAFE_getByProps({ testID: 'icon-home-outline' })).toBeTruthy();
    });
  });
});
