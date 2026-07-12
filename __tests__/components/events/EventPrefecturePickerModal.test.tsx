/**
 * @module __tests__/components/events/EventPrefecturePickerModal
 * EventPrefecturePickerModal のコンポーネントテスト。
 * components/shops/PrefecturePickerModal と異なり「すべて」選択肢を持たない
 * 47 都道府県からの必須単一選択モーダルであることを検証する。
 *
 * FlatList の仮想化（initialNumToRender=20）により通常は後半の都道府県が DOM に
 * 存在しない。テスト環境では FlatList を ScrollView ベースの全件レンダリングに
 * 差し替えて全47件の検証を可能にする（components/shops/PrefecturePickerModal.test.tsx
 * と同一パターン）。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { EventPrefecturePickerModal } from '@/components/events/EventPrefecturePickerModal';
import { PREFECTURES } from '@/lib/constants/prefectures';
import type { PrefectureName } from '@/lib/constants/prefectures';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

type MockFlatListProps = {
  data: unknown[];
  renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
  keyExtractor?: (item: unknown, index: number) => string;
  accessibilityRole?: string;
};

jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  function MockFlatList(props: MockFlatListProps) {
    const { data, renderItem, keyExtractor, accessibilityRole } = props;
    return mockReact.createElement(
      mockRN.ScrollView,
      { accessibilityRole },
      (data ?? []).map((item: unknown, index: number) =>
        mockReact.createElement(
          mockRN.View,
          { key: keyExtractor ? keyExtractor(item, index) : String(index) },
          renderItem({ item, index })
        )
      )
    );
  }

  return { __esModule: true, default: MockFlatList };
});

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function renderModal(props: Partial<React.ComponentProps<typeof EventPrefecturePickerModal>> = {}) {
  const defaults = {
    visible: true,
    selectedPrefecture: null as PrefectureName | null,
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };
  return renderWithProviders(<EventPrefecturePickerModal {...defaults} {...props} />);
}

describe('EventPrefecturePickerModal — visible=true', () => {
  it('「都道府県を選択」タイトルが表示される', () => {
    renderModal({ visible: true });
    expect(screen.getByText('都道府県を選択')).toBeTruthy();
  });

  it('「すべて」行は存在しない（イベントフォームは必須単一選択のため）', () => {
    renderModal({ visible: true });
    expect(screen.queryByRole('radio', { name: 'すべて' })).toBeNull();
  });

  it('「北海道」が表示される', () => {
    renderModal({ visible: true });
    expect(screen.getByRole('radio', { name: '北海道' })).toBeTruthy();
  });

  it('「東京都」が表示される', () => {
    renderModal({ visible: true });
    expect(screen.getByRole('radio', { name: '東京都' })).toBeTruthy();
  });

  it('「沖縄県」が表示される', () => {
    renderModal({ visible: true });
    expect(screen.getByRole('radio', { name: '沖縄県' })).toBeTruthy();
  });

  it('PREFECTURES 全47件がすべて表示される', () => {
    renderModal({ visible: true });
    for (const pref of PREFECTURES) {
      expect(screen.getByRole('radio', { name: pref })).toBeTruthy();
    }
  });

  it('リスト行数がちょうど47件表示される（「すべて」を含まない）', () => {
    renderModal({ visible: true });
    expect(screen.getAllByRole('radio')).toHaveLength(47);
  });

  it('閉じるボタンが表示される', () => {
    renderModal({ visible: true });
    const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
    expect(closeBtns.length).toBeGreaterThanOrEqual(1);
  });
});

describe('EventPrefecturePickerModal — visible=false', () => {
  it('「都道府県を選択」が表示されない', () => {
    renderModal({ visible: false });
    expect(screen.queryByText('都道府県を選択')).toBeNull();
  });

  it('「北海道」が表示されない', () => {
    renderModal({ visible: false });
    expect(screen.queryByRole('radio', { name: '北海道' })).toBeNull();
  });
});

describe('EventPrefecturePickerModal — 都道府県タップ', () => {
  it('「北海道」をタップすると onSelect に「北海道」が渡される', () => {
    const onSelect = jest.fn();
    renderModal({ onSelect });
    fireEvent.press(screen.getByRole('radio', { name: '北海道' }));
    expect(onSelect).toHaveBeenCalledWith('北海道');
  });

  it('「北海道」をタップすると onClose も呼ばれる', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    renderModal({ onSelect, onClose });
    fireEvent.press(screen.getByRole('radio', { name: '北海道' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('「東京都」をタップすると onSelect に「東京都」が渡される', () => {
    const onSelect = jest.fn();
    renderModal({ onSelect });
    fireEvent.press(screen.getByRole('radio', { name: '東京都' }));
    expect(onSelect).toHaveBeenCalledWith('東京都');
  });

  it('「沖縄県」をタップすると onSelect に「沖縄県」が渡される', () => {
    const onSelect = jest.fn();
    renderModal({ onSelect });
    fireEvent.press(screen.getByRole('radio', { name: '沖縄県' }));
    expect(onSelect).toHaveBeenCalledWith('沖縄県');
  });

  it('都道府県タップ後 onSelect は 1 回のみ呼ばれる', () => {
    const onSelect = jest.fn();
    renderModal({ onSelect });
    fireEvent.press(screen.getByRole('radio', { name: '北海道' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('EventPrefecturePickerModal — selectedPrefecture による選択状態', () => {
  it('selectedPrefecture=null のときどの行も selected=false', () => {
    renderModal({ selectedPrefecture: null });
    const row = screen.getByRole('radio', { name: '北海道' });
    expect(row.props.accessibilityState?.selected).toBe(false);
  });

  it('selectedPrefecture=「東京都」のとき「東京都」行が selected=true', () => {
    renderModal({ selectedPrefecture: '東京都' });
    const row = screen.getByRole('radio', { name: '東京都' });
    expect(row.props.accessibilityState?.selected).toBe(true);
  });

  it('selectedPrefecture=「東京都」のとき「北海道」行は selected=false', () => {
    renderModal({ selectedPrefecture: '東京都' });
    const row = screen.getByRole('radio', { name: '北海道' });
    expect(row.props.accessibilityState?.selected).toBe(false);
  });

  it('selected=true の行は常に 1 行のみ', () => {
    renderModal({ selectedPrefecture: '京都府' });
    const rows = screen.getAllByRole('radio');
    const selectedRows = rows.filter((r) => r.props.accessibilityState?.selected === true);
    expect(selectedRows).toHaveLength(1);
  });
});

describe('EventPrefecturePickerModal — 閉じるボタン', () => {
  it('ヘッダーの閉じるボタンをタップすると onClose が呼ばれる', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
    // DOM 順序: backdrop → sheetHeader → closeButton のため最後（closeButton）を使う
    fireEvent.press(closeBtns[closeBtns.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop をタップすると onClose が呼ばれる', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
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
