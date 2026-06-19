/**
 * @module __tests__/components/post/GenreSelector
 * GenreSelector コンポーネントのテスト。
 * 最大3選択・disabled 状態・チェックボックスロールを検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { GenreSelector } from '@/components/post/GenreSelector';
import { MAX_GENRES_PER_POST, GENRE_CATEGORY_ORDER } from '@/lib/constants/limits/post';

const onChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GenreSelector', () => {
  describe('基本表示', () => {
    it(`「ジャンル（最大${MAX_GENRES_PER_POST}つまで）」ラベルが表示される`, () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      expect(screen.getByText(`ジャンル（最大${MAX_GENRES_PER_POST}つまで）`)).toBeTruthy();
    });

    it('全ジャンルチップが表示される', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);

      for (const genre of GENRE_CATEGORY_ORDER) {
        expect(screen.getByText(genre)).toBeTruthy();
      }
    });

    it('チップは checkbox ロールを持つ', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(GENRE_CATEGORY_ORDER.length);
    });
  });

  describe('選択動作', () => {
    it('チップを押すと onChange が呼ばれる', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);

      fireEvent.press(screen.getByText('松柏類'));

      expect(onChange).toHaveBeenCalledWith(['松柏類']);
    });

    it('選択済みチップを押すと選択解除される', () => {
      render(<GenreSelector selectedGenres={['松柏類']} onChange={onChange} isDisabled={false} />);

      fireEvent.press(screen.getByText('松柏類'));

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('選択済みチップの accessibilityLabel は「○の選択を解除」', () => {
      render(<GenreSelector selectedGenres={['松柏類']} onChange={onChange} isDisabled={false} />);

      const checkedChip = screen.getByLabelText('松柏類の選択を解除');
      expect(checkedChip).toBeTruthy();
    });

    it('未選択チップの accessibilityLabel は「○を選択」', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />);

      const uncheckedChip = screen.getByLabelText('松柏類を選択');
      expect(uncheckedChip).toBeTruthy();
    });
  });

  describe(`MAX_GENRES_PER_POST(${MAX_GENRES_PER_POST}個)の上限`, () => {
    it('3つ選択済みの状態で未選択チップを押しても onChange が呼ばれない', () => {
      render(
        <GenreSelector
          selectedGenres={['松柏類', '雑木類', '草もの']}
          onChange={onChange}
          isDisabled={false}
        />
      );

      // 4つ目のチップ（上限に達しているため disabled）
      fireEvent.press(screen.getByText('用品・道具'));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('3つ選択済みの状態では追加チップが disabled になる', () => {
      render(
        <GenreSelector
          selectedGenres={['松柏類', '雑木類', '草もの']}
          onChange={onChange}
          isDisabled={false}
        />
      );

      // 未選択かつ上限到達のチップは accessibilityState.disabled が true になる
      const allChips = screen.getAllByRole('checkbox');
      const uncheckedChips = allChips.filter(
        (el) => el.props.accessibilityState?.checked === false
      );
      // 未選択の 3 チップ（用品・道具、施設・イベント、その他）が存在する
      expect(uncheckedChips.length).toBeGreaterThanOrEqual(1);
      // uncheckedChips の accessibilityState.disabled は false（Pressable の disabled prop とは別）
      // Pressable の `disabled` prop をテストで確認する
      const someHasDisabledProp = uncheckedChips.some((el) => el.props.disabled === true);
      // accessibilityState.disabled を確認する（RNTL はこちらに格納する場合がある）
      const someHasDisabledState = uncheckedChips.some((el) => el.props.accessibilityState?.disabled === true);
      expect(someHasDisabledProp || someHasDisabledState).toBe(true);
    });

    it('3つ選択済みでも選択済みチップは押せる（解除できる）', () => {
      render(
        <GenreSelector
          selectedGenres={['松柏類', '雑木類', '草もの']}
          onChange={onChange}
          isDisabled={false}
        />
      );

      fireEvent.press(screen.getByText('松柏類'));

      expect(onChange).toHaveBeenCalledWith(['雑木類', '草もの']);
    });
  });

  describe('isDisabled モード', () => {
    it('isDisabled が true のとき全チップが無効', () => {
      render(<GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={true} />);

      // すべてのチップを押しても onChange が呼ばれない
      for (const genre of GENRE_CATEGORY_ORDER) {
        fireEvent.press(screen.getByText(genre));
      }

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('accessibilityState', () => {
    it('選択済みチップは checked: true', () => {
      render(
        <GenreSelector selectedGenres={['松柏類']} onChange={onChange} isDisabled={false} />
      );

      const chip = screen.getByLabelText('松柏類の選択を解除');
      expect(chip.props.accessibilityState?.checked).toBe(true);
    });

    it('未選択チップは checked: false', () => {
      render(
        <GenreSelector selectedGenres={[]} onChange={onChange} isDisabled={false} />
      );

      const chip = screen.getByLabelText('松柏類を選択');
      expect(chip.props.accessibilityState?.checked).toBe(false);
    });
  });
});
