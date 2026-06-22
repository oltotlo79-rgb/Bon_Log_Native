/**
 * components/events/EventCard のコンポーネントテスト。
 * 日付表示・情報表示・タップ・入場料/販売フォールバックを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { EventCard } from '@/components/events/EventCard';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

function renderCard(overrides?: Partial<Parameters<typeof EventCard>[0]>) {
  const props = {
    id: 'event-1',
    title: '秋の盆栽展',
    startDate: '2025-09-15',
    venue: '東京都立庭園美術館',
    prefecture: '東京都',
    admissionFee: '無料',
    hasSales: false,
    onPress: jest.fn(),
    ...overrides,
  };
  return renderWithProviders(<EventCard {...props} />);
}

describe('EventCard', () => {
  describe('タイトル表示', () => {
    it('タイトルが表示される', () => {
      renderCard();
      expect(screen.getByText('秋の盆栽展')).toBeTruthy();
    });
  });

  describe('日付表示', () => {
    it('月が表示される', () => {
      renderCard({ startDate: '2025-09-15' });
      expect(screen.getByText('9月')).toBeTruthy();
    });

    it('日が表示される', () => {
      renderCard({ startDate: '2025-09-15' });
      expect(screen.getByText('15')).toBeTruthy();
    });

    it('曜日が「（月）」形式で表示される', () => {
      renderCard({ startDate: '2025-09-15' });
      expect(screen.getByText(/（.）/)).toBeTruthy();
    });
  });

  describe('会場・都道府県表示', () => {
    it('venue が表示される', () => {
      renderCard({ venue: '東京都立庭園美術館' });
      expect(screen.getByText('東京都立庭園美術館')).toBeTruthy();
    });

    it('venue が null のとき表示されない', () => {
      renderCard({ venue: null });
      expect(screen.queryByText('東京都立庭園美術館')).toBeNull();
    });

    it('prefecture が表示される', () => {
      renderCard({ prefecture: '東京都' });
      expect(screen.getByText('東京都')).toBeTruthy();
    });

    it('prefecture が null のとき表示されない', () => {
      renderCard({ prefecture: null });
      expect(screen.queryByText('東京都')).toBeNull();
    });
  });

  describe('入場料表示', () => {
    it('admissionFee がある場合はその値を表示する', () => {
      renderCard({ admissionFee: '1,000円', hasSales: false });
      expect(screen.getByText('1,000円')).toBeTruthy();
    });

    it('admissionFee が null かつ hasSales=true のとき「販売あり」を表示する', () => {
      renderCard({ admissionFee: null, hasSales: true });
      expect(screen.getByText('販売あり')).toBeTruthy();
    });

    it('admissionFee が null かつ hasSales=false のとき「無料」を表示する', () => {
      renderCard({ admissionFee: null, hasSales: false });
      expect(screen.getByText('無料')).toBeTruthy();
    });

    it('admissionFee が空文字かつ hasSales=false のとき「無料」を表示する', () => {
      renderCard({ admissionFee: '', hasSales: false });
      expect(screen.getByText('無料')).toBeTruthy();
    });
  });

  describe('アクセシビリティ', () => {
    it('accessibilityRole=button が設定される', () => {
      renderCard();
      expect(screen.getByRole('button', { name: /秋の盆栽展の詳細を見る/ })).toBeTruthy();
    });
  });

  describe('タップ操作', () => {
    it('タップすると onPress が呼ばれる', () => {
      const onPress = jest.fn();
      renderCard({ onPress });
      fireEvent.press(screen.getByRole('button', { name: /秋の盆栽展の詳細を見る/ }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
