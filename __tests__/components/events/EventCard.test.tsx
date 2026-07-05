/**
 * components/events/EventCard のコンポーネントテスト。
 * 日付表示・場所結合表示・開催状態バッジ分岐・opacity・タップを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { EventCard } from '@/components/events/EventCard';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// テストで使う過去・未来・進行中の日付をテスト実行時間基準で生成する。
// モジュールスコープの new Date() は実行タイミングによってズレるため関数として持つ。
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** renderCard: デフォルト props は「過去開催・単日・都道府県+会場あり」の最小セット。 */
function renderCard(overrides?: Partial<Parameters<typeof EventCard>[0]>) {
  const props = {
    id: 'event-1',
    title: '秋の盆栽展',
    // デフォルトは 2025-09-15（過去扱い）
    startDate: '2025-09-15',
    endDate: undefined,
    venue: null,
    prefecture: null,
    city: null,
    admissionFee: null,
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

    it('曜日が「（X）」形式で表示される', () => {
      renderCard({ startDate: '2025-09-15' });
      expect(screen.getByText(/（.）/)).toBeTruthy();
    });

    it('endDate がある場合は日付ブロックに終了日短縮形が表示される', () => {
      // 未来の複数日イベント（終了日あり・まだ終わっていない）
      const start = daysFromNow(-1);
      const end = daysFromNow(2);
      renderCard({ startDate: start, endDate: end });
      // 「〜M/D」形式
      expect(screen.getByText(/〜\d+\/\d+/)).toBeTruthy();
    });

    it('単日イベント（endDate なし）は終了日短縮形が表示されない', () => {
      renderCard({ startDate: daysFromNow(3), endDate: null });
      expect(screen.queryByText(/〜\d+\/\d+/)).toBeNull();
    });
  });

  describe('場所表示（prefecture / city / venue 結合）', () => {
    it('prefecture のみ渡した場合は prefecture が表示される', () => {
      renderCard({ prefecture: '東京都', city: null, venue: null });
      expect(screen.getByText('東京都')).toBeTruthy();
    });

    it('venue のみ渡した場合は「 / 会場」形式で venue が表示される（Web 版の会場区切りに準拠）', () => {
      renderCard({ prefecture: null, city: null, venue: '東京都立庭園美術館' });
      expect(screen.getByText('/ 東京都立庭園美術館')).toBeTruthy();
    });

    it('prefecture と venue が両方あるとスラッシュ区切りで結合される', () => {
      renderCard({ prefecture: '東京都', city: null, venue: '上野美術館' });
      expect(screen.getByText('東京都 / 上野美術館')).toBeTruthy();
    });

    it('prefecture・city・venue 全部あると「都道府県 市区町村 / 会場」形式で結合される', () => {
      renderCard({ prefecture: '東京都', city: '台東区', venue: '上野美術館' });
      expect(screen.getByText('東京都 台東区 / 上野美術館')).toBeTruthy();
    });

    it('city だけ渡した場合は city が表示される', () => {
      renderCard({ prefecture: null, city: '大阪市', venue: null });
      expect(screen.getByText('大阪市')).toBeTruthy();
    });

    it('全部 null のとき場所行は表示されない', () => {
      renderCard({ prefecture: null, city: null, venue: null });
      // location-outline アイコンが出ないことで確認
      expect(screen.queryByText('location-outline')).toBeNull();
    });
  });

  describe('入場料表示', () => {
    it('admissionFee がある場合はその値を表示する', () => {
      renderCard({ admissionFee: '1,000円', hasSales: false });
      expect(screen.getByText('1,000円')).toBeTruthy();
    });

    it('admissionFee が null のとき入場料行は表示されない', () => {
      renderCard({ admissionFee: null, hasSales: false });
      expect(screen.queryByText(/^(\d+円|無料)$/)).toBeNull();
    });

    it('admissionFee が空文字のとき入場料行は表示されない', () => {
      renderCard({ admissionFee: '', hasSales: false });
      expect(screen.queryByText(/^(\d+円|無料)$/)).toBeNull();
    });
  });

  describe('開催状態バッジ', () => {
    it('開始日が過去・endDate なし（単日終了）のとき「終了」バッジが表示される', () => {
      renderCard({ startDate: '2025-01-01', endDate: null });
      expect(screen.getByText('終了')).toBeTruthy();
    });

    it('開始日が過去・endDate も過去のとき「終了」バッジが表示される', () => {
      renderCard({ startDate: '2025-01-01', endDate: '2025-01-03' });
      expect(screen.getByText('終了')).toBeTruthy();
    });

    it('開始日が過去・endDate が未来のとき「開催中」バッジが表示される', () => {
      const start = daysFromNow(-1);
      const end = daysFromNow(2);
      renderCard({ startDate: start, endDate: end });
      expect(screen.getByText('開催中')).toBeTruthy();
    });

    it('単日イベント（endDate なし）が開始前のとき「開催中」バッジは表示されない', () => {
      // 終了日なし・開始が未来 → isEnded=false, isOngoing=false（endDate がないため）
      renderCard({ startDate: daysFromNow(3), endDate: null });
      expect(screen.queryByText('開催中')).toBeNull();
    });

    it('単日イベント（endDate なし）が開始後のとき「終了」バッジが表示される（開催中にならない）', () => {
      // 開始日 < now、endDate なし → isEnded=true（start < now）
      renderCard({ startDate: '2025-06-01', endDate: null });
      expect(screen.getByText('終了')).toBeTruthy();
      expect(screen.queryByText('開催中')).toBeNull();
    });

    it('hasSales=true のとき「即売あり」バッジが表示される', () => {
      renderCard({ hasSales: true });
      expect(screen.getByText('即売あり')).toBeTruthy();
    });

    it('hasSales=false のとき「即売あり」バッジは表示されない', () => {
      renderCard({ hasSales: false });
      expect(screen.queryByText('即売あり')).toBeNull();
    });

    it('開催中かつ即売ありのとき両バッジが同時表示される', () => {
      const start = daysFromNow(-1);
      const end = daysFromNow(2);
      renderCard({ startDate: start, endDate: end, hasSales: true });
      expect(screen.getByText('開催中')).toBeTruthy();
      expect(screen.getByText('即売あり')).toBeTruthy();
    });

    it('終了かつ即売ありのとき「終了」と「即売あり」が両方表示される', () => {
      renderCard({ startDate: '2025-01-01', endDate: '2025-01-03', hasSales: true });
      expect(screen.getByText('終了')).toBeTruthy();
      expect(screen.getByText('即売あり')).toBeTruthy();
    });

    it('未来の単日イベント（バッジなし）はバッジ行自体が表示されない', () => {
      renderCard({ startDate: daysFromNow(3), endDate: null, hasSales: false });
      expect(screen.queryByText('終了')).toBeNull();
      expect(screen.queryByText('開催中')).toBeNull();
      expect(screen.queryByText('即売あり')).toBeNull();
    });
  });

  describe('opacity（終了状態）', () => {
    it('終了イベントのカードは opacity: 0.6 スタイルが適用される', () => {
      const { toJSON } = renderCard({ startDate: '2025-01-01', endDate: null });
      const json = JSON.stringify(toJSON());
      // cardEnded スタイルの opacity:0.6 が反映されているか
      expect(json).toContain('"opacity":0.6');
    });

    it('未来の開催予定イベントは opacity: 0.6 が適用されない', () => {
      const { toJSON } = renderCard({ startDate: daysFromNow(3), endDate: null });
      const json = JSON.stringify(toJSON());
      // opacity:0.6 がなければ終了スタイルは非適用
      expect(json).not.toContain('"opacity":0.6');
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
