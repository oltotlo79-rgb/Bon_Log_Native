/**
 * components/shops/RegionPickerModal のコンポーネントテスト。
 * visible/selectedRegion/onSelect/onClose の各 props と
 * すべて・8地方の表示・選択・アクセシビリティ状態・閉じ操作を網羅する。
 *
 * PrefecturePickerModal と同様に FlatList 仮想化を全件レンダリングに差し替え
 * 全9行（すべて + 8地方）を同期的に検証できるようにする。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { RegionPickerModal } from '@/components/shops/RegionPickerModal';
import { REGIONS } from '@/lib/constants/regions';
import type { RegionName } from '@/lib/constants/regions';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// FlatList 仮想化を無効化し、全件を同期レンダーする。
type MockFlatListProps = {
  data: unknown[];
  renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
  keyExtractor?: (item: unknown, index: number) => string;
  ItemSeparatorComponent?: React.ComponentType;
  accessibilityRole?: string;
};

jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  function MockFlatList(props: MockFlatListProps) {
    const { data, renderItem, keyExtractor, ItemSeparatorComponent, accessibilityRole } = props;
    return mockReact.createElement(
      mockRN.ScrollView,
      { accessibilityRole },
      (data ?? []).map((item: unknown, index: number) => {
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

function renderModal(props: Partial<React.ComponentProps<typeof RegionPickerModal>> = {}) {
  const defaults = {
    visible: true,
    selectedRegion: undefined as RegionName | undefined,
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };
  return renderWithProviders(
    <RegionPickerModal {...defaults} {...props} />
  );
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('RegionPickerModal', () => {
  describe('visible=true のとき', () => {
    it('「地方を選択」というタイトルが表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByText('地方を選択')).toBeTruthy();
    });

    it('「すべて」行が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: 'すべて' })).toBeTruthy();
    });

    it('「北海道」地方が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '北海道' })).toBeTruthy();
    });

    it('「東北」地方が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '東北' })).toBeTruthy();
    });

    it('「関東」地方が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '関東' })).toBeTruthy();
    });

    it('「近畿」地方が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '近畿' })).toBeTruthy();
    });

    it('「九州・沖縄」地方が表示される', () => {
      renderModal({ visible: true });
      expect(screen.getByRole('radio', { name: '九州・沖縄' })).toBeTruthy();
    });

    it(`REGIONS 全8地方がすべて表示される`, () => {
      renderModal({ visible: true });
      for (const region of REGIONS) {
        expect(screen.getByRole('radio', { name: region })).toBeTruthy();
      }
    });

    it('「すべて」を含めてリスト行数が 9 件（8地方 + 1）表示される', () => {
      renderModal({ visible: true });
      const rows = screen.getAllByRole('radio');
      expect(rows).toHaveLength(9);
    });

    it('閉じるボタンが表示される', () => {
      renderModal({ visible: true });
      const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
      expect(closeBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('visible=false のとき', () => {
    it('「地方を選択」が表示されない', () => {
      renderModal({ visible: false });
      expect(screen.queryByText('地方を選択')).toBeNull();
    });

    it('「すべて」行が表示されない', () => {
      renderModal({ visible: false });
      expect(screen.queryByRole('radio', { name: 'すべて' })).toBeNull();
    });

    it('「北海道」地方行が表示されない', () => {
      renderModal({ visible: false });
      expect(screen.queryByRole('radio', { name: '北海道' })).toBeNull();
    });

    it('「九州・沖縄」地方行が表示されない', () => {
      renderModal({ visible: false });
      expect(screen.queryByRole('radio', { name: '九州・沖縄' })).toBeNull();
    });
  });

  describe('地方タップ', () => {
    it('「北海道」をタップすると onSelect に「北海道」が渡される', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();
      renderModal({ onSelect, onClose });
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

    it('「関東」をタップすると onSelect に「関東」が渡される', () => {
      const onSelect = jest.fn();
      renderModal({ onSelect });
      fireEvent.press(screen.getByRole('radio', { name: '関東' }));
      expect(onSelect).toHaveBeenCalledWith('関東');
    });

    it('「九州・沖縄」をタップすると onSelect に「九州・沖縄」が渡される', () => {
      const onSelect = jest.fn();
      renderModal({ onSelect });
      fireEvent.press(screen.getByRole('radio', { name: '九州・沖縄' }));
      expect(onSelect).toHaveBeenCalledWith('九州・沖縄');
    });

    it('「近畿」をタップすると onSelect に「近畿」が渡される', () => {
      const onSelect = jest.fn();
      renderModal({ onSelect });
      fireEvent.press(screen.getByRole('radio', { name: '近畿' }));
      expect(onSelect).toHaveBeenCalledWith('近畿');
    });

    it('地方タップ後 onSelect は 1 回のみ呼ばれる', () => {
      const onSelect = jest.fn();
      renderModal({ onSelect });
      fireEvent.press(screen.getByRole('radio', { name: '東北' }));
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

    it('地方が選択中のときに「すべて」をタップすると onSelect に undefined が渡される', () => {
      const onSelect = jest.fn();
      renderModal({ selectedRegion: '関東', onSelect });
      fireEvent.press(screen.getByRole('radio', { name: 'すべて' }));
      expect(onSelect).toHaveBeenCalledWith(undefined);
    });
  });

  describe('selectedRegion による選択状態', () => {
    it('selectedRegion=undefined のとき「すべて」行が selected=true', () => {
      renderModal({ selectedRegion: undefined });
      const allRow = screen.getByRole('radio', { name: 'すべて' });
      expect(allRow.props.accessibilityState?.selected).toBe(true);
    });

    it('selectedRegion=undefined のとき「北海道」行は selected=false', () => {
      renderModal({ selectedRegion: undefined });
      const row = screen.getByRole('radio', { name: '北海道' });
      expect(row.props.accessibilityState?.selected).toBe(false);
    });

    it('selectedRegion=「関東」のとき「関東」行が selected=true', () => {
      renderModal({ selectedRegion: '関東' });
      const row = screen.getByRole('radio', { name: '関東' });
      expect(row.props.accessibilityState?.selected).toBe(true);
    });

    it('selectedRegion=「関東」のとき「すべて」行は selected=false', () => {
      renderModal({ selectedRegion: '関東' });
      const allRow = screen.getByRole('radio', { name: 'すべて' });
      expect(allRow.props.accessibilityState?.selected).toBe(false);
    });

    it('selectedRegion=「関東」のとき「北海道」行は selected=false', () => {
      renderModal({ selectedRegion: '関東' });
      const row = screen.getByRole('radio', { name: '北海道' });
      expect(row.props.accessibilityState?.selected).toBe(false);
    });

    it('selectedRegion=「九州・沖縄」のとき「九州・沖縄」行が selected=true', () => {
      renderModal({ selectedRegion: '九州・沖縄' });
      const row = screen.getByRole('radio', { name: '九州・沖縄' });
      expect(row.props.accessibilityState?.selected).toBe(true);
    });

    it('selectedRegion=「九州・沖縄」のとき「すべて」は selected=false', () => {
      renderModal({ selectedRegion: '九州・沖縄' });
      const allRow = screen.getByRole('radio', { name: 'すべて' });
      expect(allRow.props.accessibilityState?.selected).toBe(false);
    });

    it('selected=true の行は常に 1 行のみ（selectedRegion=「近畿」）', () => {
      renderModal({ selectedRegion: '近畿' });
      const rows = screen.getAllByRole('radio');
      const selectedRows = rows.filter((r) => r.props.accessibilityState?.selected === true);
      expect(selectedRows).toHaveLength(1);
    });

    it('selected=true の行は常に 1 行のみ（selectedRegion=undefined）', () => {
      renderModal({ selectedRegion: undefined });
      const rows = screen.getAllByRole('radio');
      const selectedRows = rows.filter((r) => r.props.accessibilityState?.selected === true);
      expect(selectedRows).toHaveLength(1);
    });
  });

  describe('閉じるボタン', () => {
    it('ヘッダーの閉じるボタンをタップすると onClose が呼ばれる', () => {
      const onClose = jest.fn();
      renderModal({ onClose });
      const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
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
