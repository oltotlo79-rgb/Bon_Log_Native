/**
 * components/shops/ShopCard のコンポーネントテスト。
 * 店名・評価・レビュー数・住所・ジャンル表示・タップを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { ShopCard } from '@/components/shops/ShopCard';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

function renderCard(overrides?: Partial<Parameters<typeof ShopCard>[0]>) {
  const props = {
    id: 'shop-1',
    name: '松屋盆栽園',
    address: '東京都渋谷区1-1-1',
    genres: ['盆栽販売', '植木'],
    averageRating: 4.2,
    reviewCount: 10,
    onPress: jest.fn(),
    ...overrides,
  };
  return renderWithProviders(<ShopCard {...props} />);
}

describe('ShopCard', () => {
  describe('店名表示', () => {
    it('店名が表示される', () => {
      renderCard();
      expect(screen.getByText('松屋盆栽園')).toBeTruthy();
    });
  });

  describe('評価・レビュー', () => {
    it('評価が小数点1桁で表示される', () => {
      renderCard({ averageRating: 4.2 });
      expect(screen.getByText('4.2')).toBeTruthy();
    });

    it('averageRating が null のとき「-」が表示される', () => {
      renderCard({ averageRating: null });
      expect(screen.getByText('-')).toBeTruthy();
    });

    it('レビュー件数が表示される', () => {
      renderCard({ reviewCount: 10 });
      expect(screen.getByText('(10件)')).toBeTruthy();
    });

    it('レビュー0件のとき「(0件)」が表示される', () => {
      renderCard({ reviewCount: 0 });
      expect(screen.getByText('(0件)')).toBeTruthy();
    });
  });

  describe('住所表示', () => {
    it('住所が表示される', () => {
      renderCard({ address: '東京都渋谷区1-1-1' });
      expect(screen.getByText('東京都渋谷区1-1-1')).toBeTruthy();
    });

    it('住所が20文字超のとき省略表示になる', () => {
      renderCard({ address: 'あ'.repeat(25) });
      expect(screen.getByText('あ'.repeat(20) + '...')).toBeTruthy();
    });
  });

  describe('ジャンル表示', () => {
    it('2件までジャンルが「/」区切りで表示される', () => {
      renderCard({ genres: ['盆栽販売', '植木'] });
      expect(screen.getByText('盆栽販売 / 植木')).toBeTruthy();
    });

    it('3件以上あるとき最初の2件のみ表示される', () => {
      renderCard({ genres: ['盆栽販売', '植木', '消耗品'] });
      expect(screen.getByText('盆栽販売 / 植木')).toBeTruthy();
      expect(screen.queryByText(/消耗品/)).toBeNull();
    });

    it('ジャンルが空配列のとき表示されない', () => {
      renderCard({ genres: [] });
      expect(screen.queryByText(' / ')).toBeNull();
    });
  });

  describe('アクセシビリティ', () => {
    it('accessibilityRole=button が設定される', () => {
      renderCard();
      expect(
        screen.getByRole('button', { name: /松屋盆栽園の詳細を見る/ })
      ).toBeTruthy();
    });
  });

  describe('タップ操作', () => {
    it('タップすると onPress が呼ばれる', () => {
      const onPress = jest.fn();
      renderCard({ onPress });
      fireEvent.press(screen.getByRole('button', { name: /松屋盆栽園の詳細を見る/ }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
