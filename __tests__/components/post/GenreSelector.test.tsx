/**
 * @module __tests__/components/post/GenreSelector
 * GenreSelector コンポーネントのテスト。
 * トリガーボタン（ジャンルを選択（任意））→モーダルでチップを選ぶ新UIフローを検証する。
 * トリガーの選択済み表示（カンマ区切り）・N/MAX 選択中カウンタ・最大3選択・disabled 状態を網羅する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { GenreSelector } from '@/components/post/GenreSelector';
import { MAX_GENRES_PER_POST, GENRE_CATEGORY_ORDER } from '@/lib/constants/limits/post';

const GENRE_PLACEHOLDER = 'ジャンルを選択（任意）';

const onChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// トリガーはモーダルが閉じている間、画面上で唯一の button ロール要素になる
function openModal() {
  fireEvent.press(screen.getByRole('button'));
}

describe('GenreSelector', () => {
  describe('トリガー表示', () => {
    it('未選択時、トリガーに「ジャンルを選択（任意）」が表示される', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      expect(screen.getByText(GENRE_PLACEHOLDER)).toBeTruthy();
    });

    it('「ジャンル」ラベルが表示される', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      expect(screen.getByText('ジャンル')).toBeTruthy();
    });

    it('選択済み1件のとき、トリガーにジャンル名がそのまま表示される', () => {
      render(<GenreSelector selectedGenres={['松柏類']} onChange={onChange} isDisabled={false} />);
      expect(screen.getByText('松柏類')).toBeTruthy();
    });

    it('選択済み2件以上のとき、トリガーにカンマ区切りで表示される', () => {
      render(
        <GenreSelector
          selectedGenres={['松柏類', '雑木類']}
          onChange={onChange}
          isDisabled={false}
        />
      );
      expect(screen.getByText('松柏類, 雑木類')).toBeTruthy();
    });

    it('モーダルを開く前はチップ（checkbox）が存在しない', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });

  describe('トリガー下のカウンタ', () => {
    it('未選択のときカウンタが表示されない', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      expect(screen.queryByText(`0/${MAX_GENRES_PER_POST} 選択中`)).toBeNull();
    });

    it('選択が1件以上のとき「N/3 選択中」カウンタが表示される', () => {
      render(
        <GenreSelector
          selectedGenres={['松柏類', '雑木類']}
          onChange={onChange}
          isDisabled={false}
        />
      );
      expect(screen.getByText(`2/${MAX_GENRES_PER_POST} 選択中`)).toBeTruthy();
    });
  });

  describe('モーダルの開閉', () => {
    it('トリガーを押すとモーダルが開き、全ジャンルのチップが表示される', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      openModal();

      for (const genre of GENRE_CATEGORY_ORDER) {
        expect(screen.getByText(genre)).toBeTruthy();
      }
      expect(screen.getAllByRole('checkbox')).toHaveLength(GENRE_CATEGORY_ORDER.length);
    });

    it('モーダルのタイトル「ジャンルを選択」が表示される', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      openModal();
      expect(screen.getByText('ジャンルを選択')).toBeTruthy();
    });

    it('ヘッダーの閉じるボタンを押すとモーダルが閉じてチップが非表示になる', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      openModal();

      const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
      fireEvent.press(closeButtons[closeButtons.length - 1]);

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('backdrop をタップしてもモーダルが閉じる', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      openModal();

      const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
      fireEvent.press(closeButtons[0]);

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });

  describe('チップの選択・解除', () => {
    it('未選択チップを押すと onChange が選択追加後の配列で呼ばれる', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      openModal();

      fireEvent.press(screen.getByLabelText('松柏類を選択'));

      expect(onChange).toHaveBeenCalledWith(['松柏類']);
    });

    it('選択済みチップを押すと onChange が選択解除後の配列で呼ばれる', () => {
      render(<GenreSelector selectedGenres={['松柏類']} onChange={onChange} isDisabled={false} />);
      openModal();

      fireEvent.press(screen.getByLabelText('松柏類の選択を解除'));

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('選択済みチップの accessibilityLabel は「○の選択を解除」', () => {
      render(<GenreSelector selectedGenres={['松柏類']} onChange={onChange} isDisabled={false} />);
      openModal();

      expect(screen.getByLabelText('松柏類の選択を解除')).toBeTruthy();
    });

    it('未選択チップの accessibilityLabel は「○を選択」', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      openModal();

      expect(screen.getByLabelText('松柏類を選択')).toBeTruthy();
    });

    it('選択済みチップは accessibilityState.checked が true', () => {
      render(<GenreSelector selectedGenres={['松柏類']} onChange={onChange} isDisabled={false} />);
      openModal();

      const chip = screen.getByLabelText('松柏類の選択を解除');
      expect(chip.props.accessibilityState?.checked).toBe(true);
    });

    it('未選択チップは accessibilityState.checked が false', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      openModal();

      const chip = screen.getByLabelText('松柏類を選択');
      expect(chip.props.accessibilityState?.checked).toBe(false);
    });
  });

  describe(`上限（MAX_GENRES_PER_POST=${MAX_GENRES_PER_POST}）`, () => {
    it('3つ選択済みの状態で未選択チップを押しても onChange が呼ばれない', () => {
      render(
        <GenreSelector
          selectedGenres={['松柏類', '雑木類', '草もの']}
          onChange={onChange}
          isDisabled={false}
        />
      );
      openModal();

      fireEvent.press(screen.getByLabelText('用品・道具を選択'));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('3つ選択済みの状態では4つ目以降のチップが disabled になる', () => {
      render(
        <GenreSelector
          selectedGenres={['松柏類', '雑木類', '草もの']}
          onChange={onChange}
          isDisabled={false}
        />
      );
      openModal();

      // Pressable の disabled prop は host View へ転送されず accessibilityState.disabled に反映される
      const chip = screen.getByLabelText('用品・道具を選択');
      expect(chip.props.accessibilityState?.disabled).toBe(true);
    });

    it('3つ選択済みでも選択済みチップは押せる（解除できる）', () => {
      render(
        <GenreSelector
          selectedGenres={['松柏類', '雑木類', '草もの']}
          onChange={onChange}
          isDisabled={false}
        />
      );
      openModal();

      fireEvent.press(screen.getByLabelText('松柏類の選択を解除'));

      expect(onChange).toHaveBeenCalledWith(['雑木類', '草もの']);
    });
  });

  describe('モーダル内カウンタ', () => {
    it('モーダルを開くとモーダル内にカウンタが表示される', () => {
      render(<GenreSelector selectedGenres={['松柏類']} onChange={onChange} isDisabled={false} />);
      openModal();

      expect(screen.getByText(`1/${MAX_GENRES_PER_POST} 選択中`)).toBeTruthy();
    });

    it('モーダルを開いている間、背景のトリガー側カウンタはアクセシビリティツリーから隠れる（モーダルの accessibilityViewIsModal による）', () => {
      render(<GenreSelector selectedGenres={['松柏類']} onChange={onChange} isDisabled={false} />);
      openModal();

      // 既定のクエリでは、開いたモーダルの背後にあるトリガー側カウンタは検出されない
      expect(screen.getAllByText(`1/${MAX_GENRES_PER_POST} 選択中`)).toHaveLength(1);
      // includeHiddenElements で背景・モーダル分の 2 要素が実在することを確認する
      expect(
        screen.getAllByText(`1/${MAX_GENRES_PER_POST} 選択中`, { includeHiddenElements: true })
      ).toHaveLength(2);
    });

    it('未選択のときはモーダルを開いてもカウンタが表示されない', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      openModal();

      expect(screen.queryByText(`0/${MAX_GENRES_PER_POST} 選択中`)).toBeNull();
    });
  });

  describe('isDisabled モード', () => {
    it('isDisabled のときトリガーの accessibilityState.disabled が true になる', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={true} />);

      const trigger = screen.getByRole('button');
      expect(trigger.props.accessibilityState?.disabled).toBe(true);
    });

    it('isDisabled のときトリガーを押してもモーダルが開かない', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={true} />);

      fireEvent.press(screen.getByRole('button'));

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });
});
