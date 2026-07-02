/**
 * app/fertilizers/soil/index の静的コンテンツテスト。
 * 用土タイプ（CEC バッジ）・配合レシピ・免責注記の表示を検証する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import SoilFertilizerScreen from '@/app/fertilizers/soil/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

describe('SoilFertilizerScreen', () => {
  describe('CEC 説明セクション', () => {
    it('「CEC（陽イオン交換容量）とは」セクションタイトルが表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('CEC（陽イオン交換容量）とは')).toBeTruthy();
    });

    it('CEC の説明文が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText(/CEC.*Cation Exchange Capacity/)).toBeTruthy();
    });
  });

  describe('用土一覧', () => {
    it('「主な盆栽用土の特性」セクション見出しが表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('主な盆栽用土の特性')).toBeTruthy();
    });

    it('赤玉土が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('赤玉土')).toBeTruthy();
    });

    it('赤玉土の英語名 Akadama が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('Akadama')).toBeTruthy();
    });

    it('赤玉土の CEC バッジ「CEC: 中〜高」が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('CEC: 中〜高')).toBeTruthy();
    });

    it('鹿沼土が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('鹿沼土')).toBeTruthy();
    });

    it('鹿沼土の CEC バッジ「CEC: 中」が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getAllByText('CEC: 中').length).toBeGreaterThanOrEqual(1);
    });

    it('桐生砂が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('桐生砂')).toBeTruthy();
    });

    it('桐生砂の CEC バッジ「CEC: 低」が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('CEC: 低')).toBeTruthy();
    });

    it('富士砂と軽石の CEC バッジ「CEC: 極低」が2件表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getAllByText('CEC: 極低').length).toBe(2);
    });

    it('日向土が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('日向土')).toBeTruthy();
    });

    it('軽石が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('軽石')).toBeTruthy();
    });

    it('「施肥のポイント」ラベルが複数表示される（各用土カードに1つずつ）', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      const labels = screen.getAllByText('施肥のポイント');
      expect(labels.length).toBe(6);
    });

    it('pH 範囲が表示される（赤玉土の例）', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('6.0〜6.5')).toBeTruthy();
    });
  });

  describe('推奨用土配合セクション', () => {
    it('「樹種別の推奨用土配合」見出しが表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('樹種別の推奨用土配合')).toBeTruthy();
    });

    it('松柏類の配合レシピ「赤玉土 6：桐生砂 3：富士砂 1」が表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('赤玉土 6：桐生砂 3：富士砂 1')).toBeTruthy();
    });

    it('雑木類の配合レシピが表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('赤玉土 7：桐生砂 2：腐葉土 1')).toBeTruthy();
    });

    it('皐月・ツツジ類の配合レシピが表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('鹿沼土 8：日向土 2')).toBeTruthy();
    });

    it('花物・実物の配合レシピが表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('赤玉土 6：日向土 2：腐葉土 2')).toBeTruthy();
    });

    it('樹種別レシピのツリータイプラベルが表示される（松柏類）', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText('松柏類（黒松・赤松・真柏等）')).toBeTruthy();
    });
  });

  describe('免責注記', () => {
    it('免責注記テキストが表示される', () => {
      renderWithProviders(<SoilFertilizerScreen />);
      expect(screen.getByText(/施肥の情報は一般的な盆栽管理の知識に基づいた目安/)).toBeTruthy();
    });
  });
});
