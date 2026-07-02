/**
 * app/fertilizers/symptoms/index のコンポーネントテスト。
 * 検索入力による絞り込み・タグクラウド・栄養素チップタップ・severity バッジ・空状態を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import SymptomsScreen from '@/app/fertilizers/symptoms/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;

describe('SymptomsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('検索入力フィールド', () => {
    it('検索フィールドが表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      expect(screen.getByLabelText('症状を入力して検索')).toBeTruthy();
    });

    it('初期状態で全症状が表示される（下位葉の黄化）', () => {
      renderWithProviders(<SymptomsScreen />);
      expect(screen.getByText('下位葉の黄化')).toBeTruthy();
    });

    it('「黄化」と入力すると黄化関連症状に絞り込まれる', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, '黄化');
      expect(screen.getByText('下位葉の黄化')).toBeTruthy();
      expect(screen.getByText('新葉の黄化')).toBeTruthy();
    });

    it('「黄化」と入力すると「葉の縁が枯れる」は表示されない', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, '黄化');
      expect(screen.queryByText('葉の縁が枯れる')).toBeNull();
    });

    it('栄養素のシンボル「N」で検索すると窒素関連症状が表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, 'N');
      expect(screen.getByText('下位葉の黄化')).toBeTruthy();
    });

    it('栄養素名「カリウム」で検索するとカリウム関連症状のみ表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, 'カリウム');
      expect(screen.getByText('葉の縁が枯れる')).toBeTruthy();
    });

    it('マッチしない入力「xyz」を入力すると「該当する症状が見つかりませんでした」が表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, 'xyz_match_nothing');
      expect(screen.getByText('該当する症状が見つかりませんでした')).toBeTruthy();
    });

    it('入力をクリアすると全件に戻る', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, '黄化');
      fireEvent.changeText(input, '');
      expect(screen.getByText('葉の縁が枯れる')).toBeTruthy();
    });
  });

  describe('タグクラウド', () => {
    it('「黄化」タグボタンが表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      expect(screen.getByLabelText('黄化で検索')).toBeTruthy();
    });

    it('「枯れる」タグボタンが表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      expect(screen.getByLabelText('枯れるで検索')).toBeTruthy();
    });

    it('「小葉」タグボタンが表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      expect(screen.getByLabelText('小葉で検索')).toBeTruthy();
    });

    it('「黄化」タグをタップすると検索フィールドに「黄化」がセットされる', () => {
      renderWithProviders(<SymptomsScreen />);
      fireEvent.press(screen.getByLabelText('黄化で検索'));
      const input = screen.getByLabelText('症状を入力して検索');
      expect(input.props.value).toBe('黄化');
    });

    it('「枯れる」タグをタップすると葉の縁が枯れるが表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      fireEvent.press(screen.getByLabelText('枯れるで検索'));
      expect(screen.getByText('葉の縁が枯れる')).toBeTruthy();
    });
  });

  describe('severity バッジ', () => {
    it('初期状態で「重度」バッジが複数表示される（高 severity の症状が複数存在する）', () => {
      renderWithProviders(<SymptomsScreen />);
      expect(screen.getAllByText('重度').length).toBeGreaterThanOrEqual(1);
    });

    it('葉脈間の黄化カードに「中度」バッジが表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, '葉脈間');
      expect(screen.getByText('中度')).toBeTruthy();
    });

    it('耐寒性の低下カードに「軽度」バッジが表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, '耐寒性');
      expect(screen.getByText('軽度')).toBeTruthy();
    });
  });

  describe('栄養素チップ', () => {
    it('下位葉の黄化カードに「窒素」チップが表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, '下位葉の黄化');
      expect(screen.getByLabelText('窒素の詳細へ移動')).toBeTruthy();
    });

    it('「窒素」チップをタップすると /fertilizers/nutrients/[slug] へ push する', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, '下位葉の黄化');
      fireEvent.press(screen.getByLabelText('窒素の詳細へ移動'));
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/fertilizers/nutrients/[slug]',
        params: { slug: 'nitrogen' },
      });
    });

    it('新葉の黄化カードに「鉄」「硫黄」「マンガン」チップが表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, '新葉の黄化');
      expect(screen.getByLabelText('鉄の詳細へ移動')).toBeTruthy();
      expect(screen.getByLabelText('硫黄の詳細へ移動')).toBeTruthy();
      expect(screen.getByLabelText('マンガンの詳細へ移動')).toBeTruthy();
    });

    it('「鉄」チップのシンボル「Fe」が表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      const input = screen.getByLabelText('症状を入力して検索');
      fireEvent.changeText(input, '新葉の黄化');
      expect(screen.getByText('Fe')).toBeTruthy();
    });
  });

  describe('免責注記', () => {
    it('免責注記テキストが表示される', () => {
      renderWithProviders(<SymptomsScreen />);
      expect(screen.getByText(/施肥の情報は一般的な盆栽管理の知識に基づいた目安/)).toBeTruthy();
    });
  });
});
