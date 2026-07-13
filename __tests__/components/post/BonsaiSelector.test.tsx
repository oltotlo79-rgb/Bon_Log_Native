/**
 * @module __tests__/components/post/BonsaiSelector
 * BonsaiSelector コンポーネントのテスト。
 * トリガーボタン（選択しない／盆栽名）→モーダルで単一選択リストから選ぶフローを検証する。
 * 0件時は非表示（return null）、ローディング/エラー状態、選択・解除を網羅する。
 * モック境界は useBonsaiListQuery（lib/queries/bonsai）。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { BonsaiSelector } from '@/components/post/BonsaiSelector';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// クエリフックのモック
// ---------------------------------------------------------------------------

const mockUseBonsaiListQuery = jest.fn();

jest.mock('@/lib/queries/bonsai', () => ({
  useBonsaiListQuery: (...args: unknown[]) => mockUseBonsaiListQuery(...args),
}));

// ---------------------------------------------------------------------------
// テスト用定数
// ---------------------------------------------------------------------------

const NONE_LABEL = '選択しない';
const SECTION_LABEL = '関連する盆栽（任意）';

const MOCK_BONSAI_ITEMS = [
  {
    id: 'bonsai-1',
    name: '黒松の盆栽',
    species: '黒松',
    acquiredAt: null,
    description: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    recordCount: 3,
    latestRecord: null,
  },
  {
    id: 'bonsai-2',
    name: '名もなき盆栽',
    species: null,
    acquiredAt: null,
    description: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    recordCount: 0,
    latestRecord: null,
  },
];

function makeInfiniteData(items: typeof MOCK_BONSAI_ITEMS) {
  return { pages: [{ items, nextCursor: null }], pageParams: [undefined] };
}

const defaultQueryResult = {
  data: makeInfiniteData(MOCK_BONSAI_ITEMS),
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
};

const emptyQueryResult = {
  data: makeInfiniteData([]),
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
};

const onChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBonsaiListQuery.mockReturnValue(defaultQueryResult);
});

function renderSelector(selectedBonsaiId: string | null = null, isDisabled = false) {
  return renderWithProviders(
    <BonsaiSelector selectedBonsaiId={selectedBonsaiId} onChange={onChange} isDisabled={isDisabled} />
  );
}

function openModal() {
  fireEvent.press(screen.getByRole('button'));
}

describe('BonsaiSelector', () => {
  describe('0件時は非表示', () => {
    it('盆栽が0件のとき何もレンダリングしない（null）', () => {
      mockUseBonsaiListQuery.mockReturnValue(emptyQueryResult);
      const { toJSON } = renderSelector();
      expect(toJSON()).toBeNull();
    });

    it('盆栽が0件でもロード中は非表示にしない（0件確定前のため）', () => {
      mockUseBonsaiListQuery.mockReturnValue({
        ...emptyQueryResult,
        data: undefined,
        isLoading: true,
      });
      const { toJSON } = renderSelector();
      expect(toJSON()).not.toBeNull();
      expect(screen.getByText(SECTION_LABEL)).toBeTruthy();
    });

    it('盆栽が0件でもエラー中は非表示にしない（0件確定前のため）', () => {
      mockUseBonsaiListQuery.mockReturnValue({
        ...emptyQueryResult,
        data: undefined,
        isError: true,
      });
      const { toJSON } = renderSelector();
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('トリガー表示', () => {
    it('「関連する盆栽（任意）」ラベルが表示される', () => {
      renderSelector();
      expect(screen.getByText(SECTION_LABEL)).toBeTruthy();
    });

    it('未選択時、トリガーに「選択しない」が表示される', () => {
      renderSelector(null);
      expect(screen.getByText(NONE_LABEL)).toBeTruthy();
    });

    it('選択済みのとき、トリガーに「盆栽名 (品種)」が表示される', () => {
      renderSelector('bonsai-1');
      expect(screen.getByText('黒松の盆栽 (黒松)')).toBeTruthy();
    });

    it('選択済みだが species が null のとき、トリガーには名前のみ表示される', () => {
      renderSelector('bonsai-2');
      expect(screen.getByText('名もなき盆栽')).toBeTruthy();
    });

    it('selectedBonsaiId が一覧に存在しない id のとき「選択しない」表示にフォールバックする', () => {
      renderSelector('bonsai-unknown');
      expect(screen.getByText(NONE_LABEL)).toBeTruthy();
    });
  });

  describe('モーダルの開閉', () => {
    it('トリガーを押すとモーダルが開き、「選択しない」と盆栽一覧が radio として表示される', () => {
      renderSelector();
      openModal();

      expect(screen.getByRole('radio', { name: NONE_LABEL })).toBeTruthy();
      expect(screen.getByRole('radio', { name: '黒松の盆栽 (黒松)' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: '名もなき盆栽' })).toBeTruthy();
    });

    it('モーダルのタイトル「関連する盆栽を選択」が表示される', () => {
      renderSelector();
      openModal();
      expect(screen.getByText('関連する盆栽を選択')).toBeTruthy();
    });

    it('閉じるボタンを押すとモーダルが閉じる', () => {
      renderSelector();
      openModal();
      expect(screen.getByRole('radio', { name: NONE_LABEL })).toBeTruthy();

      const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
      fireEvent.press(closeButtons[closeButtons.length - 1]);

      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });

    it('backdrop をタップしてもモーダルが閉じる', () => {
      renderSelector();
      openModal();

      const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
      fireEvent.press(closeButtons[0]);

      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });
  });

  describe('単一選択・解除', () => {
    it('盆栽の行を押すと onChange にその id が渡り、モーダルが閉じる', () => {
      renderSelector(null);
      openModal();

      fireEvent.press(screen.getByRole('radio', { name: '黒松の盆栽 (黒松)' }));

      expect(onChange).toHaveBeenCalledWith('bonsai-1');
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });

    it('選択中に別の盆栽を選ぶと onChange がその新しい id で呼ばれる', () => {
      renderSelector('bonsai-1');
      openModal();

      fireEvent.press(screen.getByRole('radio', { name: '名もなき盆栽' }));

      expect(onChange).toHaveBeenCalledWith('bonsai-2');
    });

    it('選択中に「選択しない」を押すと onChange(null) が呼ばれる（解除）', () => {
      renderSelector('bonsai-1');
      openModal();

      fireEvent.press(screen.getByRole('radio', { name: NONE_LABEL }));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('選択中の行の accessibilityState.selected が true になる', () => {
      renderSelector('bonsai-1');
      openModal();

      const selectedRow = screen.getByRole('radio', { name: '黒松の盆栽 (黒松)' });
      expect(selectedRow.props.accessibilityState?.selected).toBe(true);
    });

    it('未選択の行の accessibilityState.selected が false になる', () => {
      renderSelector('bonsai-1');
      openModal();

      const otherRow = screen.getByRole('radio', { name: '名もなき盆栽' });
      expect(otherRow.props.accessibilityState?.selected).toBe(false);
    });

    it('未選択状態では「選択しない」行の accessibilityState.selected が true になる', () => {
      renderSelector(null);
      openModal();

      const noneRow = screen.getByRole('radio', { name: NONE_LABEL });
      expect(noneRow.props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('ローディング・エラー状態', () => {
    it('ロード中はモーダル内にローディング表示が出る', () => {
      mockUseBonsaiListQuery.mockReturnValue({
        ...defaultQueryResult,
        data: undefined,
        isLoading: true,
      });
      renderSelector();
      openModal();

      expect(screen.getByLabelText('盆栽を読み込み中')).toBeTruthy();
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });

    it('エラー時はエラーメッセージと再試行ボタンが表示される', () => {
      mockUseBonsaiListQuery.mockReturnValue({
        ...defaultQueryResult,
        data: undefined,
        isError: true,
      });
      renderSelector();
      openModal();

      expect(screen.getByRole('button', { name: '再試行する' })).toBeTruthy();
    });

    it('再試行ボタンを押すと refetch が呼ばれる', () => {
      const refetch = jest.fn();
      mockUseBonsaiListQuery.mockReturnValue({
        ...defaultQueryResult,
        data: undefined,
        isError: true,
        refetch,
      });
      renderSelector();
      openModal();

      fireEvent.press(screen.getByRole('button', { name: '再試行する' }));

      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('isDisabled モード', () => {
    it('isDisabled のときトリガーの accessibilityState.disabled が true になる', () => {
      renderSelector(null, true);
      const trigger = screen.getByRole('button');
      expect(trigger.props.accessibilityState?.disabled).toBe(true);
    });

    it('isDisabled のときトリガーを押してもモーダルが開かない', () => {
      renderSelector(null, true);
      fireEvent.press(screen.getByRole('button'));
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });
  });
});
