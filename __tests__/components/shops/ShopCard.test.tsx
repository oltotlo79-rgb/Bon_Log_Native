/**
 * components/shops/ShopCard のコンポーネントテスト。
 * 新構造（店名+星評価横並び / アイコン付き情報行 / ジャンルタグチップ）を検証する。
 * phone / businessHours / closedDays が optional であることも網羅する。
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
    phone: undefined,
    businessHours: undefined,
    closedDays: undefined,
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

  describe('星評価', () => {
    it('averageRating=4.2 のとき数値が小数点1桁で表示される', () => {
      renderCard({ averageRating: 4.2 });
      expect(screen.getByText('4.2')).toBeTruthy();
    });

    it('averageRating が null のとき「レビューなし」が表示される', () => {
      renderCard({ averageRating: null });
      expect(screen.getByText('レビューなし')).toBeTruthy();
    });

    it('averageRating が null のとき星数値テキストが存在しない', () => {
      renderCard({ averageRating: null });
      expect(screen.queryByText(/^\d+\.\d+$/)).toBeNull();
    });

    it('averageRating=5.0 のとき「5.0」が表示される', () => {
      renderCard({ averageRating: 5.0 });
      expect(screen.getByText('5.0')).toBeTruthy();
    });

    it('averageRating=1.0 のとき「1.0」が表示される', () => {
      renderCard({ averageRating: 1.0 });
      expect(screen.getByText('1.0')).toBeTruthy();
    });

    it('レビュー件数が「(10件)」形式で表示される', () => {
      renderCard({ reviewCount: 10 });
      expect(screen.getByText('(10件)')).toBeTruthy();
    });

    it('レビュー0件のとき「(0件)」が表示される', () => {
      renderCard({ reviewCount: 0 });
      expect(screen.getByText('(0件)')).toBeTruthy();
    });

    it('averageRating が null のときはレビュー件数が表示されない', () => {
      renderCard({ averageRating: null, reviewCount: 5 });
      expect(screen.queryByText('(5件)')).toBeNull();
    });
  });

  describe('アイコン付き情報行', () => {
    it('住所が表示される', () => {
      renderCard({ address: '東京都渋谷区1-1-1' });
      expect(screen.getByText('東京都渋谷区1-1-1')).toBeTruthy();
    });

    it('phone が指定されているとき電話番号が表示される', () => {
      renderCard({ phone: '03-1234-5678' });
      expect(screen.getByText('03-1234-5678')).toBeTruthy();
    });

    it('phone が null のとき電話番号行が表示されない', () => {
      renderCard({ phone: null });
      expect(screen.queryByText(/^\d{2,4}-\d{4}-\d{4}$/)).toBeNull();
    });

    it('phone が undefined のとき電話番号行が表示されない', () => {
      renderCard({ phone: undefined });
      expect(screen.queryByText('03-1234-5678')).toBeNull();
    });

    it('phone が空文字のとき電話番号行が表示されない', () => {
      renderCard({ phone: '' });
      expect(screen.queryByText('')).toBeNull();
    });

    it('businessHours が指定されているとき営業時間が表示される', () => {
      renderCard({ businessHours: '9:00〜18:00' });
      expect(screen.getByText('9:00〜18:00')).toBeTruthy();
    });

    it('businessHours が null のとき営業時間行が表示されない', () => {
      renderCard({ businessHours: null });
      expect(screen.queryByText('9:00〜18:00')).toBeNull();
    });

    it('businessHours が undefined のとき営業時間行が表示されない', () => {
      renderCard({ businessHours: undefined });
      expect(screen.queryByText('9:00〜18:00')).toBeNull();
    });

    it('closedDays が指定されているとき定休日が「定休日: 月曜」形式で表示される', () => {
      renderCard({ closedDays: '月曜' });
      expect(screen.getByText('定休日: 月曜')).toBeTruthy();
    });

    it('closedDays が null のとき定休日行が表示されない', () => {
      renderCard({ closedDays: null });
      expect(screen.queryByText(/^定休日:/)).toBeNull();
    });

    it('closedDays が undefined のとき定休日行が表示されない', () => {
      renderCard({ closedDays: undefined });
      expect(screen.queryByText(/^定休日:/)).toBeNull();
    });
  });

  describe('optional フィールド無しの場合（最小構成）', () => {
    it('phone / businessHours / closedDays が全て未指定でもクラッシュしない', () => {
      expect(() =>
        renderCard({
          phone: undefined,
          businessHours: undefined,
          closedDays: undefined,
          genres: [],
        })
      ).not.toThrow();
    });

    it('最小構成で店名と住所が表示される', () => {
      renderCard({
        phone: undefined,
        businessHours: undefined,
        closedDays: undefined,
        genres: [],
      });
      expect(screen.getByText('松屋盆栽園')).toBeTruthy();
      expect(screen.getByText('東京都渋谷区1-1-1')).toBeTruthy();
    });
  });

  describe('ジャンルチップ', () => {
    it('ジャンルが各タグチップとして表示される', () => {
      renderCard({ genres: ['盆栽販売', '植木'] });
      expect(screen.getByText('盆栽販売')).toBeTruthy();
      expect(screen.getByText('植木')).toBeTruthy();
    });

    it('3件のジャンルが全て表示される', () => {
      renderCard({ genres: ['盆栽販売', '植木', '消耗品'] });
      expect(screen.getByText('盆栽販売')).toBeTruthy();
      expect(screen.getByText('植木')).toBeTruthy();
      expect(screen.getByText('消耗品')).toBeTruthy();
    });

    it('4件以上のジャンルは最初の3件のみ表示される（slice(0, 3)）', () => {
      renderCard({ genres: ['盆栽販売', '植木', '消耗品', '道具'] });
      expect(screen.getByText('盆栽販売')).toBeTruthy();
      expect(screen.getByText('植木')).toBeTruthy();
      expect(screen.getByText('消耗品')).toBeTruthy();
      expect(screen.queryByText('道具')).toBeNull();
    });

    it('ジャンルが空配列のときジャンルタグ行が表示されない', () => {
      renderCard({ genres: [] });
      expect(screen.queryByText('盆栽販売')).toBeNull();
    });

    it('1件のジャンルが表示される', () => {
      renderCard({ genres: ['松柏類'] });
      expect(screen.getByText('松柏類')).toBeTruthy();
    });
  });

  describe('全フィールドあり（フル構成）', () => {
    it('全情報が正しく表示される', () => {
      renderCard({
        name: '緑松園',
        address: '大阪府大阪市1-2-3',
        phone: '06-9999-8888',
        businessHours: '10:00〜17:00',
        closedDays: '水曜・木曜',
        genres: ['松柏類', '雑木類'],
        averageRating: 3.7,
        reviewCount: 25,
      });
      expect(screen.getByText('緑松園')).toBeTruthy();
      expect(screen.getByText('大阪府大阪市1-2-3')).toBeTruthy();
      expect(screen.getByText('06-9999-8888')).toBeTruthy();
      expect(screen.getByText('10:00〜17:00')).toBeTruthy();
      expect(screen.getByText('定休日: 水曜・木曜')).toBeTruthy();
      expect(screen.getByText('3.7')).toBeTruthy();
      expect(screen.getByText('(25件)')).toBeTruthy();
      expect(screen.getByText('松柏類')).toBeTruthy();
      expect(screen.getByText('雑木類')).toBeTruthy();
    });
  });

  describe('アクセシビリティ', () => {
    it('accessibilityRole=button が設定される', () => {
      renderCard();
      expect(
        screen.getByRole('button', { name: /松屋盆栽園の詳細を見る/ })
      ).toBeTruthy();
    });

    it('accessibilityLabel に評価値が含まれる', () => {
      renderCard({ averageRating: 4.2 });
      const btn = screen.getByRole('button', { name: /評価 4.2 点/ });
      expect(btn).toBeTruthy();
    });

    it('averageRating が null のとき accessibilityLabel に「なし」が含まれる', () => {
      renderCard({ averageRating: null });
      const btn = screen.getByRole('button', { name: /評価 なし 点/ });
      expect(btn).toBeTruthy();
    });

    it('accessibilityLabel にレビュー件数が含まれる', () => {
      renderCard({ reviewCount: 10 });
      const btn = screen.getByRole('button', { name: /レビュー 10 件/ });
      expect(btn).toBeTruthy();
    });
  });

  describe('タップ操作', () => {
    it('タップすると onPress が呼ばれる', () => {
      const onPress = jest.fn();
      renderCard({ onPress });
      fireEvent.press(screen.getByRole('button', { name: /松屋盆栽園の詳細を見る/ }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('複数回タップすると複数回 onPress が呼ばれる', () => {
      const onPress = jest.fn();
      renderCard({ onPress });
      const btn = screen.getByRole('button', { name: /松屋盆栽園の詳細を見る/ });
      fireEvent.press(btn);
      fireEvent.press(btn);
      expect(onPress).toHaveBeenCalledTimes(2);
    });
  });
});
