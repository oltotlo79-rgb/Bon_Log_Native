/**
 * @module __tests__/components/post/GenreSelector
 * GenreSelector コンポーネントのテスト。
 * トリガーボタン（ジャンルを選択（任意））→モーダルで「カテゴリ見出し＋個別ジャンルチップ」の
 * 2階層 UI を選ぶ新フローを検証する。選択値は常に実ジャンル id（cuid）。
 * モック境界は useGenresQuery（lib/queries/shops）。ローディング/エラー/空の3状態も網羅する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { GenreSelector } from '@/components/post/GenreSelector';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { MAX_GENRES_PER_POST } from '@/lib/constants/limits/post';
import { ERR_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// クエリフックのモック
// ---------------------------------------------------------------------------

const mockUseGenresQuery = jest.fn();

jest.mock('@/lib/queries/shops', () => ({
  useGenresQuery: (...args: unknown[]) => mockUseGenresQuery(...args),
}));

// ---------------------------------------------------------------------------
// テスト用定数
// ---------------------------------------------------------------------------

const GENRE_PLACEHOLDER = 'ジャンルを選択（任意）';

// 2階層グルーピングを検証するため、複数カテゴリにまたがるジャンルを用意する。
// 施設・イベント／その他カテゴリは意図的に含めない
// （groupGenresByCategory は該当ジャンルが1件もないカテゴリのグループを生成しないため）。
const MOCK_GENRES = [
  { id: 'genre-kuromatsu', name: '黒松', category: '松柏類' },
  { id: 'genre-goyoumatsu', name: '五葉松', category: '松柏類' },
  { id: 'genre-momiji', name: '紅葉', category: '雑木類' },
  { id: 'genre-koke', name: '苔', category: '草もの' },
  { id: 'genre-hachi', name: '鉢', category: '用品・道具' },
];

const defaultGenreQueryResult = {
  data: { items: MOCK_GENRES },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

const onChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGenresQuery.mockReturnValue(defaultGenreQueryResult);
});

// トリガーはモーダルが閉じている間、画面上で唯一の button ロール要素になる
function openModal() {
  fireEvent.press(screen.getByRole('button'));
}

function renderSelector(selectedGenres: string[] = [], isDisabled = false) {
  renderWithProviders(
    <GenreSelector selectedGenres={selectedGenres} onChange={onChange} isDisabled={isDisabled} />
  );
}

describe('GenreSelector', () => {
  describe('トリガー表示', () => {
    it('未選択時、トリガーに「ジャンルを選択（任意）」が表示される', () => {
      renderSelector([]);
      expect(screen.getByText(GENRE_PLACEHOLDER)).toBeTruthy();
    });

    it('「ジャンル」ラベルが表示される', () => {
      renderSelector([]);
      expect(screen.getByText('ジャンル')).toBeTruthy();
    });

    it('選択済み1件のとき、トリガーにジャンル名がそのまま表示される', () => {
      renderSelector(['genre-kuromatsu']);
      expect(screen.getByText('黒松')).toBeTruthy();
    });

    it('選択済み2件以上のとき、トリガーにカンマ区切りで表示される（カテゴリ表示順）', () => {
      renderSelector(['genre-momiji', 'genre-kuromatsu']);
      // selectedGenres の指定順ではなく categoryGroups（表示順）の順で解決される
      expect(screen.getByText('黒松, 紅葉')).toBeTruthy();
    });

    it('モーダルを開く前はチップ（checkbox）が存在しない', () => {
      renderSelector([]);
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('useGenresQuery が type=post で呼ばれる', () => {
      renderSelector([]);
      expect(mockUseGenresQuery).toHaveBeenCalledWith('post');
    });
  });

  describe('トリガー下のカウンタ', () => {
    it('未選択のときカウンタが表示されない', () => {
      renderSelector([]);
      expect(screen.queryByText(`0/${MAX_GENRES_PER_POST} 選択中`)).toBeNull();
    });

    it('選択が1件以上のとき「N/3 選択中」カウンタが表示される', () => {
      renderSelector(['genre-kuromatsu', 'genre-momiji']);
      expect(screen.getByText(`2/${MAX_GENRES_PER_POST} 選択中`)).toBeTruthy();
    });
  });

  describe('モーダルの開閉とカテゴリ見出し', () => {
    it('トリガーを押すとモーダルが開き、カテゴリ見出しと全ジャンルのチップが表示される', () => {
      renderSelector([]);
      openModal();

      for (const category of ['松柏類', '雑木類', '草もの', '用品・道具']) {
        expect(screen.getByText(category)).toBeTruthy();
      }
      for (const genre of MOCK_GENRES) {
        expect(screen.getByText(genre.name)).toBeTruthy();
      }
      expect(screen.getAllByRole('checkbox')).toHaveLength(MOCK_GENRES.length);
    });

    it('該当ジャンルが1件もないカテゴリ（施設・イベント／その他）は見出しが表示されない', () => {
      renderSelector([]);
      openModal();

      expect(screen.queryByText('施設・イベント')).toBeNull();
      expect(screen.queryByText('その他')).toBeNull();
    });

    it('モーダルのタイトル「ジャンルを選択」が表示される', () => {
      renderSelector([]);
      openModal();
      expect(screen.getByText('ジャンルを選択')).toBeTruthy();
    });

    it('ヘッダーの閉じるボタンを押すとモーダルが閉じてチップが非表示になる', () => {
      renderSelector([]);
      openModal();

      const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
      fireEvent.press(closeButtons[closeButtons.length - 1]);

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('backdrop をタップしてもモーダルが閉じる', () => {
      renderSelector([]);
      openModal();

      const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
      fireEvent.press(closeButtons[0]);

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });

  describe('チップの選択・解除', () => {
    it('未選択チップを押すと onChange が選択追加後の配列（genre.id）で呼ばれる', () => {
      renderSelector([]);
      openModal();

      fireEvent.press(screen.getByLabelText('黒松を選択'));

      expect(onChange).toHaveBeenCalledWith(['genre-kuromatsu']);
    });

    it('選択済みチップを押すと onChange が選択解除後の配列で呼ばれる', () => {
      renderSelector(['genre-kuromatsu']);
      openModal();

      fireEvent.press(screen.getByLabelText('黒松の選択を解除'));

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('別カテゴリのチップを追加選択すると両方の id が onChange に渡る', () => {
      renderSelector(['genre-kuromatsu']);
      openModal();

      fireEvent.press(screen.getByLabelText('紅葉を選択'));

      expect(onChange).toHaveBeenCalledWith(['genre-kuromatsu', 'genre-momiji']);
    });

    it('選択済みチップの accessibilityLabel は「○の選択を解除」', () => {
      renderSelector(['genre-kuromatsu']);
      openModal();

      expect(screen.getByLabelText('黒松の選択を解除')).toBeTruthy();
    });

    it('未選択チップの accessibilityLabel は「○を選択」', () => {
      renderSelector([]);
      openModal();

      expect(screen.getByLabelText('黒松を選択')).toBeTruthy();
    });

    it('選択済みチップは accessibilityState.checked が true', () => {
      renderSelector(['genre-kuromatsu']);
      openModal();

      const chip = screen.getByLabelText('黒松の選択を解除');
      expect(chip.props.accessibilityState?.checked).toBe(true);
    });

    it('未選択チップは accessibilityState.checked が false', () => {
      renderSelector([]);
      openModal();

      const chip = screen.getByLabelText('黒松を選択');
      expect(chip.props.accessibilityState?.checked).toBe(false);
    });
  });

  describe(`上限（MAX_GENRES_PER_POST=${MAX_GENRES_PER_POST}）`, () => {
    const threeSelected = ['genre-kuromatsu', 'genre-goyoumatsu', 'genre-momiji'];

    it('3つ選択済みの状態で未選択チップを押しても onChange が呼ばれない', () => {
      renderSelector(threeSelected);
      openModal();

      fireEvent.press(screen.getByLabelText('鉢を選択'));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('3つ選択済みの状態では4つ目以降のチップが disabled になる', () => {
      renderSelector(threeSelected);
      openModal();

      // Pressable の disabled prop は host View へ転送されず accessibilityState.disabled に反映される
      const chip = screen.getByLabelText('鉢を選択');
      expect(chip.props.accessibilityState?.disabled).toBe(true);
    });

    it('3つ選択済みでも選択済みチップは押せる（解除できる）', () => {
      renderSelector(threeSelected);
      openModal();

      fireEvent.press(screen.getByLabelText('黒松の選択を解除'));

      expect(onChange).toHaveBeenCalledWith(['genre-goyoumatsu', 'genre-momiji']);
    });
  });

  describe('モーダル内カウンタ', () => {
    it('モーダルを開くとモーダル内にカウンタが表示される', () => {
      renderSelector(['genre-kuromatsu']);
      openModal();

      expect(screen.getByText(`1/${MAX_GENRES_PER_POST} 選択中`)).toBeTruthy();
    });

    it('モーダルを開いている間、背景のトリガー側カウンタはアクセシビリティツリーから隠れる（モーダルの accessibilityViewIsModal による）', () => {
      renderSelector(['genre-kuromatsu']);
      openModal();

      // 既定のクエリでは、開いたモーダルの背後にあるトリガー側カウンタは検出されない
      expect(screen.getAllByText(`1/${MAX_GENRES_PER_POST} 選択中`)).toHaveLength(1);
      // includeHiddenElements で背景・モーダル分の 2 要素が実在することを確認する
      expect(
        screen.getAllByText(`1/${MAX_GENRES_PER_POST} 選択中`, { includeHiddenElements: true })
      ).toHaveLength(2);
    });

    it('未選択のときはモーダルを開いてもカウンタが表示されない', () => {
      renderSelector([]);
      openModal();

      expect(screen.queryByText(`0/${MAX_GENRES_PER_POST} 選択中`)).toBeNull();
    });
  });

  describe('isDisabled モード', () => {
    it('isDisabled のときトリガーの accessibilityState.disabled が true になる', () => {
      renderSelector([], true);

      const trigger = screen.getByRole('button');
      expect(trigger.props.accessibilityState?.disabled).toBe(true);
    });

    it('isDisabled のときトリガーを押してもモーダルが開かない', () => {
      renderSelector([], true);

      fireEvent.press(screen.getByRole('button'));

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });

  describe('ローディング状態', () => {
    it('ロード中はモーダル内にローディング表示が出る', () => {
      mockUseGenresQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
      });
      renderSelector([]);
      openModal();

      expect(screen.getByLabelText('ジャンルを読み込み中')).toBeTruthy();
    });

    it('ロード中はチップが表示されない', () => {
      mockUseGenresQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
      });
      renderSelector([]);
      openModal();

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });

  describe('エラー状態', () => {
    it('エラー時はエラーメッセージと再試行ボタンが表示される', () => {
      mockUseGenresQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: jest.fn(),
      });
      renderSelector([]);
      openModal();

      expect(screen.getByText(ERR_LOAD_FAILED)).toBeTruthy();
      expect(screen.getByRole('button', { name: '再試行する' })).toBeTruthy();
    });

    it('再試行ボタンを押すと refetch が呼ばれる', () => {
      const refetch = jest.fn();
      mockUseGenresQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch,
      });
      renderSelector([]);
      openModal();

      fireEvent.press(screen.getByRole('button', { name: '再試行する' }));

      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('空状態', () => {
    it('items が空配列のとき「選択できるジャンルがありません」が表示される', () => {
      mockUseGenresQuery.mockReturnValue({
        data: { items: [] },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderSelector([]);
      openModal();

      expect(screen.getByText('選択できるジャンルがありません')).toBeTruthy();
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('data が undefined のとき（未ロード扱い）も空状態として扱われる', () => {
      mockUseGenresQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      renderSelector([]);
      openModal();

      expect(screen.getByText('選択できるジャンルがありません')).toBeTruthy();
    });
  });
});
