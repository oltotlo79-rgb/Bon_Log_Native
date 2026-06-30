/**
 * components/shops/PrefecturePickerModal のコンポーネントテスト。
 * visible/selectedPrefecture/onSelect/onClose の各 props と
 * すべて・47都道府県の表示・選択・アクセシビリティ状態・閉じ操作を網羅する。
 *
 * FlatList の仮想化（initialNumToRender=20）により通常は後半の都道府県が DOM に
 * 存在しない。テスト環境では FlatList を ScrollView ベースの全件レンダリングに
 * 差し替えて全47件の検証を可能にする。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { PrefecturePickerModal } from '@/components/shops/PrefecturePickerModal';
import { PREFECTURES } from '@/lib/constants/prefectures';
import type { PrefectureName } from '@/lib/constants/prefectures';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// FlatList 仮想化を無効化し、全件を同期レンダーする。
// data / renderItem / keyExtractor / ItemSeparatorComponent だけを取り出して
// ScrollView + map で全件描画するシンプルな代替実装に置き換える。
// jest.mock ファクトリ内の型注釈は TypeScript の制約により使えないため JS スタイルで記述する。
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  function MockFlatList(props) {
    const { data, renderItem, keyExtractor, ItemSeparatorComponent, accessibilityRole } = props;
    return mockReact.createElement(
      mockRN.ScrollView,
      { accessibilityRole },
      (data ?? []).map((item, index) => {
        const mockKey = keyExtractor ? keyExtractor(item, index) : String(index);
        const mockSeparator =
          ItemSeparatorComponent && index < data.length - 1
            ? mockReact.createElement(ItemSeparatorComponent, { key: `sep-${mockKey}` })
            : null;
        return mockReact.createElement(
          mockRN.View,
          { key: mockKey },
          renderItem({ item, index }),
          mockSeparator
        );
      })
    );
  }

  return { __esModule: true, default: MockFlatList };
});

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function renderModal(props: Partial<React.ComponentProps<typeof PrefecturePickerModal>> = {}) {
  const defaults = {
    visible: true,
    selectedPrefecture: undefined as PrefectureName | undefined,
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };
  return renderWithProviders(
    <PrefecturePickerModal {...defaults} {...props} />
  );
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('PrefecturePickerModal', () => {
  describe('visible=true のとき', () => {
    it('「都道府県を選択」というタイトルが表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByText('都道府県を選択')).toBeTruthy();
    });

    it('「すべて」行が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: 'すべて' })).toBeTruthy();
    });

    it('「北海道」が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '北海道' })).toBeTruthy();
    });

    it('「東京都」が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '東京都' })).toBeTruthy();
    });

    it('「大阪府」が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '大阪府' })).toBeTruthy();
    });

    it('「沖縄県」が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '沖縄県' })).toBeTruthy();
    });

    it('「青森県」が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '青森県' })).toBeTruthy();
    });

    it('「福岡県」が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '福岡県' })).toBeTruthy();
    });

    it(`PREFECTURES 全47件がすべて表示される`, () => {
      renderModal({ visible: true });
      for (const pref of PREFECTURES) {
        expect(screen.getByRole('radio', { name: pref })).toBeTruthy();
      }
    });

    it('「すべて」を含めてリスト行数が 48 件（47 + 1）表示される', () => {
      renderModal({ visible: true });
      const rows = screen.getAllByRole('radio');
      expect(rows).toHaveLength(48);
    });

    it('閉じるボタンが表示される', () => {
      renderModal({ visible: true });
      // closeButton と backdrop の 2 つが「閉じる」のため getAllByRole を使う
      const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
      expect(closeBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('visible=false のとき', () => {
    it('「都道府県を選択」が表示されない', () => {
      renderModal({ visible: false });
      expect(screen.queryByText('都道府県を選択')).toBeNull();
    });

    it('「すべて」行が表示されない', () => {
      renderModal({ visible: false });
      expect(screen.queryByRole('radio', { name: 'すべて' })).toBeNull();
    });

    it('「北海道」が表示されない', () => {
      renderModal({ visible: false });
      expect(screen.queryByRole('radio', { name: '北海道' })).toBeNull();
    });

    it('「沖縄県」が表示されない', () => {
      renderModal({ visible: false });
      expect(screen.queryByRole('radio', { name: '沖縄県' })).toBeNull();
    });
  });

  describe('都道府県タップ', () => {
    it('都道府県「北海道」をタップすると onSelect に「北海道」が渡される', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();
      renderModal({ onSelect, onClose });
      fireEvent.press(screen.getByRole('radio', { name: '北海道' }));
      expect(onSelect).toHaveBeenCalledWith('北海道');
    });

    it('都道府県「北海道」をタップすると onClose も呼ばれる', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();
      renderModal({ onSelect, onClose });
      fireEvent.press(screen.getByRole('radio', { name: '北海道' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('都道府県「沖縄県」をタップすると onSelect に「沖縄県」が渡される', () => {
      const onSelect = jest.fn();
      renderModal({ onSelect });
      fireEvent.press(screen.getByRole('radio', { name: '沖縄県' }));
      expect(onSelect).toHaveBeenCalledWith('沖縄県');
    });

    it('都道府県「東京都」をタップすると onSelect に「東京都」が渡される', () => {
      const onSelect = jest.fn();
      renderModal({ onSelect });
      fireEvent.press(screen.getByRole('radio', { name: '東京都' }));
      expect(onSelect).toHaveBeenCalledWith('東京都');
    });

    it('都道府県「大阪府」をタップすると onSelect に「大阪府」が渡される', () => {
      const onSelect = jest.fn();
      renderModal({ onSelect });
      fireEvent.press(screen.getByRole('radio', { name: '大阪府' }));
      expect(onSelect).toHaveBeenCalledWith('大阪府');
    });

    it('都道府県タップ後 onSelect は 1 回のみ呼ばれる', () => {
      const onSelect = jest.fn();
      renderModal({ onSelect });
      fireEvent.press(screen.getByRole('radio', { name: '北海道' }));
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('「すべて」タップ', () => {
    it('「すべて」をタップすると onSelect に undefined が渡される', () => {
      const onSelect = jest.fn();
      renderModal({ onSelect });
      fireEvent.press(screen.getByRole('radio', { name: 'すべて' }));
      expect(onSelect).toHaveBeenCalledWith(undefined);
    });

    it('「すべて」をタップすると onClose が呼ばれる', () => {
      const onClose = jest.fn();
      renderModal({ onClose });
      fireEvent.press(screen.getByRole('radio', { name: 'すべて' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('都道府県が選択中のときに「すべて」をタップすると onSelect に undefined が渡される', () => {
      const onSelect = jest.fn();
      renderModal({ selectedPrefecture: '東京都', onSelect });
      fireEvent.press(screen.getByRole('radio', { name: 'すべて' }));
      expect(onSelect).toHaveBeenCalledWith(undefined);
    });
  });

  describe('selectedPrefecture による選択状態', () => {
    it('selectedPrefecture=undefined のとき「すべて」行が selected=true', () => {
      renderModal({ selectedPrefecture: undefined });
      const allRow = screen.getByRole('radio', { name: 'すべて' });
      expect(allRow.props.accessibilityState?.selected).toBe(true);
    });

    it('selectedPrefecture=undefined のとき「北海道」行は selected=false', () => {
      renderModal({ selectedPrefecture: undefined });
      const row = screen.getByRole('radio', { name: '北海道' });
      expect(row.props.accessibilityState?.selected).toBe(false);
    });

    it('selectedPrefecture=「東京都」のとき「東京都」行が selected=true', () => {
      renderModal({ selectedPrefecture: '東京都' });
      const row = screen.getByRole('radio', { name: '東京都' });
      expect(row.props.accessibilityState?.selected).toBe(true);
    });

    it('selectedPrefecture=「東京都」のとき「すべて」行は selected=false', () => {
      renderModal({ selectedPrefecture: '東京都' });
      const allRow = screen.getByRole('radio', { name: 'すべて' });
      expect(allRow.props.accessibilityState?.selected).toBe(false);
    });

    it('selectedPrefecture=「東京都」のとき「大阪府」行は selected=false', () => {
      renderModal({ selectedPrefecture: '東京都' });
      const row = screen.getByRole('radio', { name: '大阪府' });
      expect(row.props.accessibilityState?.selected).toBe(false);
    });

    it('selectedPrefecture=「北海道」のとき「北海道」行が selected=true', () => {
      renderModal({ selectedPrefecture: '北海道' });
      const row = screen.getByRole('radio', { name: '北海道' });
      expect(row.props.accessibilityState?.selected).toBe(true);
    });

    it('selectedPrefecture=「沖縄県」のとき「沖縄県」行が selected=true', () => {
      renderModal({ selectedPrefecture: '沖縄県' });
      const row = screen.getByRole('radio', { name: '沖縄県' });
      expect(row.props.accessibilityState?.selected).toBe(true);
    });

    it('selectedPrefecture=「沖縄県」のとき「すべて」は selected=false', () => {
      renderModal({ selectedPrefecture: '沖縄県' });
      const allRow = screen.getByRole('radio', { name: 'すべて' });
      expect(allRow.props.accessibilityState?.selected).toBe(false);
    });

    it('selected=true の行は常に 1 行のみ（selectedPrefecture=「京都府」）', () => {
      renderModal({ selectedPrefecture: '京都府' });
      const rows = screen.getAllByRole('radio');
      const selectedRows = rows.filter((r) => r.props.accessibilityState?.selected === true);
      expect(selectedRows).toHaveLength(1);
    });

    it('selected=true の行は常に 1 行のみ（selectedPrefecture=undefined）', () => {
      renderModal({ selectedPrefecture: undefined });
      const rows = screen.getAllByRole('radio');
      const selectedRows = rows.filter((r) => r.props.accessibilityState?.selected === true);
      expect(selectedRows).toHaveLength(1);
    });
  });

  describe('閉じるボタン', () => {
    it('ヘッダーの閉じるボタンをタップすると onClose が呼ばれる', () => {
      const onClose = jest.fn();
      renderModal({ onClose });
      // closeButton と backdrop の 2 つが「閉じる」のため getAllByRole → 先頭（closeButton）
      const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
      // ヘッダーにある閉じるボタン（backdrop より後にレンダーされるシートのヘッダー）
      // DOM 順序: backdrop → sheetHeader → closeButton
      // 「閉じる」ラベルが 2 つある場合は最後（closeButton）を使う
      fireEvent.press(closeBtns[closeBtns.length - 1]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('backdrop をタップすると onClose が呼ばれる', () => {
      const onClose = jest.fn();
      renderModal({ onClose });
      const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
      // backdrop は最初の「閉じる」ロールを持つ要素
      fireEvent.press(closeBtns[0]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('閉じるボタンをタップしても onSelect は呼ばれない', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();
      renderModal({ onSelect, onClose });
      const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
      fireEvent.press(closeBtns[closeBtns.length - 1]);
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('各行に accessibilityRole="radio" が設定されている', () => {
      renderModal({ visible: true });
      const rows = screen.getAllByRole('radio');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('「すべて」の accessibilityLabel が「すべて」', () => {
      renderModal({ visible: true });
      const allRow = screen.getByRole('radio', { name: 'すべて' });
      expect(allRow.props.accessibilityLabel).toBe('すべて');
    });

    it('「北海道」の accessibilityLabel が「北海道」', () => {
      renderModal({ visible: true });
      const row = screen.getByRole('radio', { name: '北海道' });
      expect(row.props.accessibilityLabel).toBe('北海道');
    });
  });
});
