/**
 * components/events/EventsViewToggleBar のコンポーネントテスト。
 * カレンダー/リスト切り替え・終了イベントトグル（Switch）・初期状態を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { EventsViewToggleBar } from '@/components/events/EventsViewToggleBar';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

type Props = React.ComponentProps<typeof EventsViewToggleBar>;

function renderBar(overrides?: Partial<Props>) {
  const defaults: Props = {
    viewMode: 'calendar',
    showPast: false,
    onViewModeChange: jest.fn(),
    onShowPastChange: jest.fn(),
  };
  return renderWithProviders(<EventsViewToggleBar {...defaults} {...overrides} />);
}

describe('EventsViewToggleBar', () => {
  describe('初期表示（カレンダーモード）', () => {
    it('「カレンダー表示」ボタンが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('カレンダー表示')).toBeTruthy();
    });

    it('「リスト表示」ボタンが表示される', () => {
      renderBar();
      expect(screen.getByLabelText('リスト表示')).toBeTruthy();
    });

    it('「終了したイベントも表示する」Switch が表示される', () => {
      renderBar();
      expect(screen.getByLabelText('終了したイベントも表示する')).toBeTruthy();
    });

    it('カレンダーモード時は「カレンダー表示」ボタンが selected=true', () => {
      renderBar({ viewMode: 'calendar' });
      const btn = screen.getByLabelText('カレンダー表示');
      expect(btn.props.accessibilityState?.selected).toBe(true);
    });

    it('カレンダーモード時は「リスト表示」ボタンが selected=false', () => {
      renderBar({ viewMode: 'calendar' });
      const btn = screen.getByLabelText('リスト表示');
      expect(btn.props.accessibilityState?.selected).toBe(false);
    });
  });

  describe('リストモード', () => {
    it('リストモード時は「リスト表示」ボタンが selected=true', () => {
      renderBar({ viewMode: 'list' });
      const btn = screen.getByLabelText('リスト表示');
      expect(btn.props.accessibilityState?.selected).toBe(true);
    });

    it('リストモード時は「カレンダー表示」ボタンが selected=false', () => {
      renderBar({ viewMode: 'list' });
      const btn = screen.getByLabelText('カレンダー表示');
      expect(btn.props.accessibilityState?.selected).toBe(false);
    });
  });

  describe('カレンダー/リスト切り替え', () => {
    it('「カレンダー表示」ボタンをタップすると onViewModeChange("calendar") が呼ばれる', () => {
      const onViewModeChange = jest.fn();
      renderBar({ viewMode: 'list', onViewModeChange });
      fireEvent.press(screen.getByLabelText('カレンダー表示'));
      expect(onViewModeChange).toHaveBeenCalledWith('calendar');
    });

    it('「リスト表示」ボタンをタップすると onViewModeChange("list") が呼ばれる', () => {
      const onViewModeChange = jest.fn();
      renderBar({ viewMode: 'calendar', onViewModeChange });
      fireEvent.press(screen.getByLabelText('リスト表示'));
      expect(onViewModeChange).toHaveBeenCalledWith('list');
    });
  });

  describe('終了イベントトグル（Switch）', () => {
    it('showPast=false のとき Switch の value が false', () => {
      renderBar({ showPast: false });
      const sw = screen.getByLabelText('終了したイベントも表示する');
      expect(sw.props.value).toBe(false);
    });

    it('showPast=true のとき Switch の value が true', () => {
      renderBar({ showPast: true });
      const sw = screen.getByLabelText('終了したイベントも表示する');
      expect(sw.props.value).toBe(true);
    });

    it('Switch を変更すると onShowPastChange が呼ばれる', () => {
      const onShowPastChange = jest.fn();
      renderBar({ showPast: false, onShowPastChange });
      const sw = screen.getByLabelText('終了したイベントも表示する');
      fireEvent(sw, 'valueChange', true);
      expect(onShowPastChange).toHaveBeenCalledWith(true);
    });

    it('Switch を OFF に戻すと onShowPastChange(false) が呼ばれる', () => {
      const onShowPastChange = jest.fn();
      renderBar({ showPast: true, onShowPastChange });
      const sw = screen.getByLabelText('終了したイベントも表示する');
      fireEvent(sw, 'valueChange', false);
      expect(onShowPastChange).toHaveBeenCalledWith(false);
    });

    it('「終了も表示」ラベルテキストが表示される', () => {
      renderBar();
      expect(screen.getByText('終了も表示')).toBeTruthy();
    });
  });
});
