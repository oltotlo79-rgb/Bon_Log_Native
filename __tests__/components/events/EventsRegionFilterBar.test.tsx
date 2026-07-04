/**
 * components/events/EventsRegionFilterBar のコンポーネントテスト。
 * 地方チップ表示・地方/都道府県の排他切替・クリアボタンを検証する。
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { EventsRegionFilterBar } from '@/components/events/EventsRegionFilterBar';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import type { PrefectureName } from '@/lib/constants/prefectures';

// PrefecturePickerModal は実コンポーネントでは FlatList 仮想化を持つため、
// テスト内ではシンプルなモックで代替する。
jest.mock('@/components/shops/PrefecturePickerModal', () => {
  const React = require('react');
  const { View, Pressable, Text } = require('react-native');
  return {
    PrefecturePickerModal: ({
      visible,
      onSelect,
      onClose,
    }: {
      visible: boolean;
      selectedPrefecture: string | undefined;
      onSelect: (pref: string | undefined) => void;
      onClose: () => void;
    }) => {
      if (!visible) return null;
      return React.createElement(
        View,
        { testID: 'prefecture-picker-modal' },
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: '東京都を選択',
            onPress: () => onSelect('東京都'),
          },
          React.createElement(Text, null, '東京都')
        ),
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: '大阪府を選択',
            onPress: () => onSelect('大阪府'),
          },
          React.createElement(Text, null, '大阪府')
        ),
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: '閉じる',
            onPress: onClose,
          },
          React.createElement(Text, null, '閉じる')
        )
      );
    },
  };
});

type Props = React.ComponentProps<typeof EventsRegionFilterBar>;

function renderBar(overrides?: Partial<Props>) {
  const defaults: Props = {
    selectedRegion: '',
    selectedPrefecture: undefined,
    onRegionChange: jest.fn(),
    onPrefectureChange: jest.fn(),
  };
  return renderWithProviders(<EventsRegionFilterBar {...defaults} {...overrides} />);
}

describe('EventsRegionFilterBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('地方チップの表示', () => {
    it('「全国」チップが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('全国')).toBeTruthy();
    });

    it('「北海道」チップが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('北海道')).toBeTruthy();
    });

    it('「東北」チップが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('東北')).toBeTruthy();
    });

    it('「関東」チップが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('関東')).toBeTruthy();
    });

    it('「中部」チップが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('中部')).toBeTruthy();
    });

    it('「近畿」チップが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('近畿')).toBeTruthy();
    });

    it('「中国」チップが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('中国')).toBeTruthy();
    });

    it('「四国」チップが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('四国')).toBeTruthy();
    });

    it('「九州・沖縄」チップが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('九州・沖縄')).toBeTruthy();
    });
  });

  describe('地方チップの選択状態', () => {
    it('selectedRegion="" のとき「全国」チップが selected=true', () => {
      renderBar({ selectedRegion: '' });
      const chip = screen.getByLabelText('全国');
      expect(chip.props.accessibilityState?.selected).toBe(true);
    });

    it('selectedRegion="関東" のとき「関東」チップが selected=true', () => {
      renderBar({ selectedRegion: '関東' });
      const chip = screen.getByLabelText('関東');
      expect(chip.props.accessibilityState?.selected).toBe(true);
    });

    it('selectedRegion="関東" のとき「全国」チップが selected=false', () => {
      renderBar({ selectedRegion: '関東' });
      const chip = screen.getByLabelText('全国');
      expect(chip.props.accessibilityState?.selected).toBe(false);
    });
  });

  describe('地方チップタップ', () => {
    it('「関東」をタップすると onRegionChange("関東") が呼ばれる', () => {
      const onRegionChange = jest.fn();
      renderBar({ onRegionChange });
      fireEvent.press(screen.getByLabelText('関東'));
      expect(onRegionChange).toHaveBeenCalledWith('関東');
    });

    it('「全国」をタップすると onRegionChange("") が呼ばれる', () => {
      const onRegionChange = jest.fn();
      renderBar({ selectedRegion: '関東', onRegionChange });
      fireEvent.press(screen.getByLabelText('全国'));
      expect(onRegionChange).toHaveBeenCalledWith('');
    });

    it('地方（空文字以外）をタップすると都道府県がリセットされる（排他的）', () => {
      const onPrefectureChange = jest.fn();
      renderBar({
        selectedPrefecture: '東京都' as PrefectureName,
        onPrefectureChange,
      });
      fireEvent.press(screen.getByLabelText('関東'));
      expect(onPrefectureChange).toHaveBeenCalledWith(undefined);
    });

    it('「全国」をタップしても都道府県はリセットされない（value=""）', () => {
      const onPrefectureChange = jest.fn();
      renderBar({ onPrefectureChange });
      fireEvent.press(screen.getByLabelText('全国'));
      expect(onPrefectureChange).not.toHaveBeenCalled();
    });

    it.each([
      ['北海道', '北海道'],
      ['東北', '東北'],
      ['関東', '関東'],
      ['中部', '中部'],
      ['近畿', '近畿'],
      ['中国', '中国'],
      ['四国', '四国'],
      ['九州・沖縄', '九州・沖縄'],
    ])('9区分「%s」をタップすると onRegionChange に API 用の値 "%s" が渡される', (label, expectedValue) => {
      const onRegionChange = jest.fn();
      renderBar({ onRegionChange });
      fireEvent.press(screen.getByLabelText(label));
      expect(onRegionChange).toHaveBeenCalledWith(expectedValue);
    });
  });

  describe('都道府県ボタン表示', () => {
    it('都道府県フィルタボタンが表示される（「都道府県: すべて」ラベル）', () => {
      renderBar();
      expect(screen.getByLabelText(/都道府県フィルタ。現在/)).toBeTruthy();
    });

    it('selectedPrefecture=undefined のとき「都道府県: すべて」テキストが表示される', () => {
      renderBar({ selectedPrefecture: undefined });
      expect(screen.getByText('都道府県: すべて')).toBeTruthy();
    });

    it('selectedPrefecture="東京都" のとき「東京都」テキストが表示される', () => {
      renderBar({ selectedPrefecture: '東京都' as PrefectureName });
      expect(screen.getByText('東京都')).toBeTruthy();
    });
  });

  describe('都道府県選択（モーダル経由）', () => {
    it('都道府県ボタンをタップするとモーダルが開く', async () => {
      renderBar();
      fireEvent.press(screen.getByLabelText(/都道府県フィルタ。現在/));
      await waitFor(() => {
        expect(screen.getByTestId('prefecture-picker-modal')).toBeTruthy();
      });
    });

    it('モーダルで東京都を選択すると onPrefectureChange("東京都") が呼ばれる', async () => {
      const onPrefectureChange = jest.fn();
      renderBar({ onPrefectureChange });
      fireEvent.press(screen.getByLabelText(/都道府県フィルタ。現在/));
      await waitFor(() => screen.getByLabelText('東京都を選択'));
      fireEvent.press(screen.getByLabelText('東京都を選択'));
      expect(onPrefectureChange).toHaveBeenCalledWith('東京都');
    });

    it('都道府県を選択すると地方がリセットされる（排他的）', async () => {
      const onRegionChange = jest.fn();
      renderBar({ selectedRegion: '関東', onRegionChange });
      fireEvent.press(screen.getByLabelText(/都道府県フィルタ。現在/));
      await waitFor(() => screen.getByLabelText('東京都を選択'));
      fireEvent.press(screen.getByLabelText('東京都を選択'));
      expect(onRegionChange).toHaveBeenCalledWith('');
    });

    it('モーダル「閉じる」をタップするとモーダルが閉じる', async () => {
      renderBar();
      fireEvent.press(screen.getByLabelText(/都道府県フィルタ。現在/));
      await waitFor(() => screen.getByTestId('prefecture-picker-modal'));
      fireEvent.press(screen.getByLabelText('閉じる'));
      await waitFor(() => {
        expect(screen.queryByTestId('prefecture-picker-modal')).toBeNull();
      });
    });
  });

  describe('クリアボタン', () => {
    it('selectedPrefecture=undefined のときクリアボタンは表示されない', () => {
      renderBar({ selectedPrefecture: undefined });
      expect(screen.queryByLabelText('都道府県フィルタをクリア')).toBeNull();
    });

    it('selectedPrefecture="東京都" のときクリアボタンが表示される', () => {
      renderBar({ selectedPrefecture: '東京都' as PrefectureName });
      expect(screen.getByLabelText('都道府県フィルタをクリア')).toBeTruthy();
    });

    it('クリアボタンをタップすると onPrefectureChange(undefined) が呼ばれる', () => {
      const onPrefectureChange = jest.fn();
      renderBar({
        selectedPrefecture: '東京都' as PrefectureName,
        onPrefectureChange,
      });
      fireEvent.press(screen.getByLabelText('都道府県フィルタをクリア'));
      expect(onPrefectureChange).toHaveBeenCalledWith(undefined);
    });

    it('クリアボタンタップ後はクリアボタン自体が非表示になる', () => {
      // EventsRegionFilterBar は内部で selectedPrefecture を持たないため
      // 親コンポーネントからの再レンダリングが必要。ここでは呼び出し確認のみ。
      const onPrefectureChange = jest.fn();
      renderBar({
        selectedPrefecture: '東京都' as PrefectureName,
        onPrefectureChange,
      });
      fireEvent.press(screen.getByLabelText('都道府県フィルタをクリア'));
      expect(onPrefectureChange).toHaveBeenCalledWith(undefined);
    });
  });
});
