/**
 * app/fertilizers/absorption/index のコンポーネントテスト。
 * 基本レンダリング・栄養素カード・移動性バッジ・分類表を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import FertilizersAbsorptionScreen from '@/app/fertilizers/absorption/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

describe('FertilizersAbsorptionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('ページ説明テキストが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(
        screen.getByText('根から吸収された栄養素が植物体内をどのように移動するかを、段階図と栄養素ごとの解説で確認できます。')
      ).toBeTruthy();
    });

    it('「吸収と輸送の流れ」セクションヘッダーが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('吸収と輸送の流れ')).toBeTruthy();
    });

    it('「再転流できる栄養素」セクションヘッダーが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('再転流できる栄養素')).toBeTruthy();
    });

    it('「移動しにくい栄養素」セクションヘッダーが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('移動しにくい栄養素')).toBeTruthy();
    });

    it('「移動性分類表」セクションヘッダーが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('移動性分類表')).toBeTruthy();
    });
  });

  describe('栄養素カードの表示', () => {
    it('移動性栄養素のカードが表示される（N・P・K・Mg）', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('窒素（N）')).toBeTruthy();
      expect(screen.getByText('リン酸（P）')).toBeTruthy();
      expect(screen.getByText('カリウム（K）')).toBeTruthy();
      expect(screen.getByText('マグネシウム（Mg）')).toBeTruthy();
    });

    it('非移動性栄養素のカードが表示される（Ca・Fe）', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('カルシウム（Ca）')).toBeTruthy();
      expect(screen.getByText('鉄（Fe）')).toBeTruthy();
    });
  });

  describe('移動性バッジの表示', () => {
    it('「移動性」表記が表示される（セクション見出し・栄養素カード4件・分類表見出しとセル）', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      const mobileBadges = screen.getAllByText('移動性');
      expect(mobileBadges.length).toBe(7);
    });

    it('「非移動性」表記が表示される（セクション見出し・栄養素カード2件・分類表セル）', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      const immobileBadges = screen.getAllByText('非移動性');
      expect(immobileBadges.length).toBe(4);
    });
  });

  describe('分類表の表示', () => {
    it('分類表のヘッダーが表示される（移動性・栄養素・欠乏症状の出る葉）', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('栄養素')).toBeTruthy();
      expect(screen.getByText('欠乏症状の出る葉')).toBeTruthy();
    });

    it('「下位葉・古葉から」が分類表に表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('下位葉・古葉から')).toBeTruthy();
    });

    it('「新葉・生長点から」が分類表に表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('新葉・生長点から')).toBeTruthy();
    });
  });

  describe('道管・師管の補足説明', () => {
    it('「道管（木部）と師管（篩部）の役割」セクションが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('道管（木部）と師管（篩部）の役割')).toBeTruthy();
    });

    it('「道管（木部）」タイトルが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('道管（木部）')).toBeTruthy();
    });

    it('「師管（篩部）」タイトルが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('師管（篩部）')).toBeTruthy();
    });
  });

  describe('詳細ページリンクのナビゲーション', () => {
    it('「窒素の詳細ページへ移動」ボタンタップで詳細画面に push する', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      fireEvent.press(screen.getByLabelText('窒素の詳細ページへ移動'));
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/fertilizers/nutrients/[slug]',
        params: { slug: 'nitrogen' },
      });
    });

    it('「カルシウムの詳細ページへ移動」ボタンタップで詳細画面に push する', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      fireEvent.press(screen.getByLabelText('カルシウムの詳細ページへ移動'));
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/fertilizers/nutrients/[slug]',
        params: { slug: 'calcium' },
      });
    });

    it('「施肥ガイドに戻る」ボタンが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByLabelText('施肥ガイドに戻る')).toBeTruthy();
    });

    it('「施肥ガイドに戻る」タップで /fertilizers に push する', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      fireEvent.press(screen.getByLabelText('施肥ガイドに戻る'));
      expect(mockRouter.push).toHaveBeenCalledWith('/fertilizers');
    });
  });

  describe('輸送経路ステップの表示', () => {
    it('「土壌溶液からの溶出」ステップが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('土壌溶液からの溶出')).toBeTruthy();
    });

    it('「根毛での吸収」ステップが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('根毛での吸収')).toBeTruthy();
    });

    it('「道管（木部）を経由した上昇」ステップが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('道管（木部）を経由した上昇')).toBeTruthy();
    });

    it('「師管（篩部）を経由した再転流」ステップが表示される', () => {
      renderWithProviders(<FertilizersAbsorptionScreen />);
      expect(screen.getByText('師管（篩部）を経由した再転流')).toBeTruthy();
    });
  });
});
