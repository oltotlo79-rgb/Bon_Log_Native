/**
 * @module __tests__/components/post/PollAttachment
 * PollAttachment コンポーネントのユニットテスト。
 * 選択肢の追加・削除・最小件数バリデーション・投票期間選択を検証する。
 * モックは不要（純粋な UI コンポーネント）。
 */

import React, { useState } from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import {
  PollAttachment,
  createDefaultPollValue,
  type PollAttachmentValue,
} from '@/components/post/PollAttachment';
import {
  MIN_POLL_OPTIONS,
  MAX_POLL_OPTIONS,
} from '@/lib/constants/limits/post';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

type Props = React.ComponentProps<typeof PollAttachment>;

/**
 * PollAttachment を onChange が state に反映されるコンテナで wrap してレンダーする。
 * onChange を直接テストするため、実際の state 変化を伴う Wrapper を使う。
 */
function ControlledPollAttachment(
  props: Omit<Props, 'value' | 'onChange'>
) {
  const [value, setValue] = useState<PollAttachmentValue>(
    createDefaultPollValue()
  );
  return (
    <PollAttachment
      {...props}
      value={value}
      onChange={setValue}
    />
  );
}

function renderPollAttachment(
  onRemove = jest.fn(),
  isDisabled = false
) {
  return renderWithProviders(
    <ControlledPollAttachment
      onRemove={onRemove}
      isDisabled={isDisabled}
    />
  );
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('PollAttachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 初期表示
  // -------------------------------------------------------------------------

  describe('初期表示', () => {
    it('「アンケート」ヘッダーが表示される', () => {
      renderPollAttachment();
      expect(screen.getByText('アンケート')).toBeTruthy();
    });

    it('初期状態で選択肢が MIN_POLL_OPTIONS（2）件表示される', () => {
      renderPollAttachment();
      // placeholder text "選択肢 N" で選択肢数を確認
      expect(
        screen.getByLabelText('アンケート選択肢 1')
      ).toBeTruthy();
      expect(
        screen.getByLabelText('アンケート選択肢 2')
      ).toBeTruthy();
    });

    it('「アンケートを削除」ボタンが表示される', () => {
      renderPollAttachment();
      expect(
        screen.getByRole('button', { name: 'アンケートを削除' })
      ).toBeTruthy();
    });

    it('「選択肢を追加」ボタンが表示される', () => {
      renderPollAttachment();
      expect(
        screen.getByRole('button', { name: '選択肢を追加' })
      ).toBeTruthy();
    });

    it('初期状態で選択肢削除ボタンが非表示（MIN_POLL_OPTIONS のとき）', () => {
      renderPollAttachment();
      // MIN=2 のとき削除ボタンは非表示
      expect(
        screen.queryByRole('button', { name: '選択肢 1 を削除' })
      ).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 選択肢の追加
  // -------------------------------------------------------------------------

  describe('選択肢の追加', () => {
    it('「選択肢を追加」を押すと選択肢が1件増える', () => {
      renderPollAttachment();
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '選択肢を追加' }));
      });
      // 3件になっているはず
      expect(
        screen.getByLabelText('アンケート選択肢 3')
      ).toBeTruthy();
    });

    it('選択肢が MAX_POLL_OPTIONS 件になると追加ボタンが消える', () => {
      renderPollAttachment();
      const addTimes = MAX_POLL_OPTIONS - MIN_POLL_OPTIONS;
      for (let i = 0; i < addTimes; i++) {
        act(() => {
          fireEvent.press(screen.getByRole('button', { name: '選択肢を追加' }));
        });
      }
      expect(
        screen.queryByRole('button', { name: '選択肢を追加' })
      ).toBeNull();
    });

    it('MAX_POLL_OPTIONS になったとき選択肢が MAX_POLL_OPTIONS 件ある', () => {
      renderPollAttachment();
      const addTimes = MAX_POLL_OPTIONS - MIN_POLL_OPTIONS;
      for (let i = 0; i < addTimes; i++) {
        act(() => {
          fireEvent.press(screen.getByRole('button', { name: '選択肢を追加' }));
        });
      }
      expect(
        screen.getByLabelText(`アンケート選択肢 ${MAX_POLL_OPTIONS}`)
      ).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 選択肢の削除
  // -------------------------------------------------------------------------

  describe('選択肢の削除', () => {
    it('選択肢が MIN_POLL_OPTIONS より多いとき削除ボタンが表示される', () => {
      renderPollAttachment();
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '選択肢を追加' }));
      });
      // 3件になった → 削除ボタンが現れる
      expect(
        screen.getByRole('button', { name: '選択肢 1 を削除' })
      ).toBeTruthy();
    });

    it('選択肢が3件のとき1件削除すると2件に戻る', () => {
      renderPollAttachment();
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '選択肢を追加' }));
      });
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '選択肢 1 を削除' }));
      });
      // 2件に戻っているはず
      expect(
        screen.getByLabelText('アンケート選択肢 1')
      ).toBeTruthy();
      expect(
        screen.getByLabelText('アンケート選択肢 2')
      ).toBeTruthy();
      expect(
        screen.queryByLabelText('アンケート選択肢 3')
      ).toBeNull();
    });

    it('選択肢が MIN_POLL_OPTIONS のとき削除ボタンが再び非表示になる', () => {
      renderPollAttachment();
      // 3件に増やす
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '選択肢を追加' }));
      });
      // 1件削除して2件に戻す
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '選択肢 1 を削除' }));
      });
      // MIN 件数に戻ったので削除ボタンは非表示
      expect(
        screen.queryByRole('button', { name: '選択肢 1 を削除' })
      ).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // テキスト入力
  // -------------------------------------------------------------------------

  describe('選択肢テキスト入力', () => {
    it('選択肢1のテキスト入力が反映される', () => {
      renderPollAttachment();
      act(() => {
        fireEvent.changeText(
          screen.getByLabelText('アンケート選択肢 1'),
          '松柏類'
        );
      });
      expect(
        screen.getByLabelText('アンケート選択肢 1').props.value
      ).toBe('松柏類');
    });

    it('選択肢2のテキスト入力が反映される', () => {
      renderPollAttachment();
      act(() => {
        fireEvent.changeText(
          screen.getByLabelText('アンケート選択肢 2'),
          '雑木類'
        );
      });
      expect(
        screen.getByLabelText('アンケート選択肢 2').props.value
      ).toBe('雑木類');
    });
  });

  // -------------------------------------------------------------------------
  // アンケート削除
  // -------------------------------------------------------------------------

  describe('アンケート削除', () => {
    it('「アンケートを削除」を押すと onRemove が呼ばれる', () => {
      const mockOnRemove = jest.fn();
      renderPollAttachment(mockOnRemove);
      act(() => {
        fireEvent.press(
          screen.getByRole('button', { name: 'アンケートを削除' })
        );
      });
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // isDisabled 状態
  // -------------------------------------------------------------------------

  describe('isDisabled=true', () => {
    it('isDisabled=true のとき「アンケートを削除」ボタンが disabled', () => {
      renderPollAttachment(jest.fn(), true);
      const deleteButton = screen.getByRole('button', {
        name: 'アンケートを削除',
      });
      expect(deleteButton.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('isDisabled=true のとき「選択肢を追加」ボタンが disabled', () => {
      renderPollAttachment(jest.fn(), true);
      const addButton = screen.getByRole('button', {
        name: '選択肢を追加',
      });
      expect(addButton.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });
  });

  // -------------------------------------------------------------------------
  // 投票期間選択
  // -------------------------------------------------------------------------

  describe('投票期間選択', () => {
    it('「1時間」の投票期間ボタンが表示される', () => {
      renderPollAttachment();
      expect(
        screen.getByRole('radio', { name: '投票期間: 1時間' })
      ).toBeTruthy();
    });

    it('「7日」の投票期間ボタンが表示される', () => {
      renderPollAttachment();
      expect(
        screen.getByRole('radio', { name: '投票期間: 7日' })
      ).toBeTruthy();
    });

    it('「1日」が初期選択（DEFAULT_POLL_DURATION_SECONDS=86400）', () => {
      renderPollAttachment();
      const oneDayButton = screen.getByRole('radio', { name: '投票期間: 1日' });
      expect(oneDayButton.props.accessibilityState).toEqual(
        expect.objectContaining({ checked: true })
      );
    });

    it('「1時間」を選ぶと checked になる', () => {
      renderPollAttachment();
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '投票期間: 1時間' }));
      });
      const oneHourButton = screen.getByRole('radio', { name: '投票期間: 1時間' });
      expect(oneHourButton.props.accessibilityState).toEqual(
        expect.objectContaining({ checked: true })
      );
    });

    it('「1時間」を選ぶと「1日」の checked が false になる', () => {
      renderPollAttachment();
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '投票期間: 1時間' }));
      });
      const oneDayButton = screen.getByRole('radio', { name: '投票期間: 1日' });
      expect(oneDayButton.props.accessibilityState).toEqual(
        expect.objectContaining({ checked: false })
      );
    });
  });

  // -------------------------------------------------------------------------
  // createDefaultPollValue ファクトリ
  // -------------------------------------------------------------------------

  describe('createDefaultPollValue', () => {
    it('options が MIN_POLL_OPTIONS 件の空文字で初期化される', () => {
      const val = createDefaultPollValue();
      expect(val.options.length).toBe(MIN_POLL_OPTIONS);
      expect(val.options.every((o) => o === '')).toBe(true);
    });

    it('durationSeconds が DEFAULT_POLL_DURATION_SECONDS（86400）で初期化される', () => {
      const val = createDefaultPollValue();
      expect(val.durationSeconds).toBe(86400);
    });
  });
});
