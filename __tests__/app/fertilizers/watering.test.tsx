/**
 * app/fertilizers/watering/index の静的コンテンツテスト。
 * 各セクション（液肥・置き肥・季節別・よくある失敗）の表示を検証する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import WateringFertilizerScreen from '@/app/fertilizers/watering/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

describe('WateringFertilizerScreen', () => {
  describe('各セクション見出し', () => {
    it('「液肥の希釈と使い方」セクションが表示される', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText('液肥の希釈と使い方')).toBeTruthy();
    });

    it('「置き肥と灌水の関係」セクションが表示される', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText('置き肥と灌水の関係')).toBeTruthy();
    });

    it('「季節別の水やりと施肥の調整」セクションが表示される', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText('季節別の水やりと施肥の調整')).toBeTruthy();
    });

    it('「よくある失敗」セクションが表示される', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText('よくある失敗')).toBeTruthy();
    });
  });

  describe('各セクションの本文内容', () => {
    it('液肥セクションに「薄くて回数多め」の記述が含まれる', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText(/薄くて回数多め/)).toBeTruthy();
    });

    it('置き肥セクションに灌水と溶出についての記述が含まれる', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText(/灌水のたびに少しずつ成分が溶け出して/)).toBeTruthy();
    });

    it('季節別セクションに春の記述が含まれる', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText(/【春（3〜5月）】/)).toBeTruthy();
    });

    it('季節別セクションに夏の記述が含まれる', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText(/【夏（6〜8月）】/)).toBeTruthy();
    });

    it('季節別セクションに秋の記述が含まれる', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText(/【秋（9〜11月）】/)).toBeTruthy();
    });

    it('季節別セクションに冬の記述が含まれる', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText(/【冬（12〜2月）】/)).toBeTruthy();
    });

    it('よくある失敗に「過湿＋施肥＝根腐れ」の記述が含まれる', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText(/【過湿＋施肥＝根腐れ】/)).toBeTruthy();
    });

    it('よくある失敗に乾燥した用土への液肥についての記述が含まれる', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText(/【乾燥した用土への液肥】/)).toBeTruthy();
    });
  });

  describe('免責注記', () => {
    it('免責注記テキストが表示される', () => {
      renderWithProviders(<WateringFertilizerScreen />);
      expect(screen.getByText(/施肥の情報は一般的な盆栽管理の知識に基づいた目安/)).toBeTruthy();
    });
  });
});
