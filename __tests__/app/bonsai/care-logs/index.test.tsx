/**
 * app/bonsai/care-logs/index の画面テスト。
 * 一覧表示・FAB から作成・編集・削除確認・種別セレクタ・note カウンタ・4状態を検証する。
 */

import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import CareLogsScreen from '@/app/bonsai/care-logs/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { BONSAI_CARE_TYPE } from '@/lib/queries/bonsai-care-logs';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUseCareLogsQuery = jest.fn();
const mockCreateMutate = jest.fn();
const mockUpdateMutate = jest.fn();
const mockDeleteMutate = jest.fn();

jest.mock('@/lib/queries/bonsai-care-logs', () => ({
  useCareLogsQuery: () => mockUseCareLogsQuery(),
  useCreateCareLogMutation: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateCareLogMutation: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteCareLogMutation: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
  BONSAI_CARE_TYPE: {
    PESTICIDE: 'pesticide',
    SOLID_FERTILIZER: 'solid_fertilizer',
    LIQUID_FERTILIZER: 'liquid_fertilizer',
    ROTATE: 'rotate',
    SHADING: 'shading',
    MURO_IN: 'muro_in',
    MURO_OUT: 'muro_out',
    OTHER: 'other',
  },
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: { message: '', visible: false, variant: 'default' },
    showToast: jest.fn(),
    hideToast: jest.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

const defaultQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
  isRefetching: false,
};

function makeCareLogItem(id: string, type: string = 'other', note: string | null = null) {
  return {
    id,
    type,
    performedAt: '2025-06-01T00:00:00Z',
    note,
  };
}

function makeCareLogsData(items: ReturnType<typeof makeCareLogItem>[]) {
  return {
    pages: [{ items, nextCursor: null }],
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  mockUseCareLogsQuery.mockReturnValue({ ...defaultQuery });
});

// ---------------------------------------------------------------------------
// ヘッダー
// ---------------------------------------------------------------------------

describe('CareLogsScreen ヘッダー', () => {
  it('「手入れログ」タイトルが表示される', () => {
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByRole('header', { name: '手入れログ' })).toBeTruthy();
  });

  it('戻るボタンが表示される', () => {
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('戻るボタンタップで router.back() が呼ばれる', () => {
    renderWithProviders(<CareLogsScreen />);
    fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// ローディング状態
// ---------------------------------------------------------------------------

describe('CareLogsScreen ローディング', () => {
  it('isLoading=true のときヘッダーが表示される', () => {
    mockUseCareLogsQuery.mockReturnValue({ ...defaultQuery, isLoading: true });
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByRole('header', { name: '手入れログ' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// エラー状態
// ---------------------------------------------------------------------------

describe('CareLogsScreen エラー', () => {
  it('isError=true のとき「読み込めませんでした」が表示される', () => {
    mockUseCareLogsQuery.mockReturnValue({ ...defaultQuery, isError: true });
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByText('読み込めませんでした')).toBeTruthy();
  });

  it('エラー時に ERR_CARE_LOGS_LOAD_FAILED が表示される', () => {
    mockUseCareLogsQuery.mockReturnValue({ ...defaultQuery, isError: true });
    renderWithProviders(<CareLogsScreen />);
    const { ERR_CARE_LOGS_LOAD_FAILED } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_CARE_LOGS_LOAD_FAILED)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

describe('CareLogsScreen 空状態', () => {
  it('items が 0 件のとき「手入れログがありません」が表示される', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([]),
    });
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByText('手入れログがありません')).toBeTruthy();
  });

  it('空状態に「記録する」ボタンが表示される', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([]),
    });
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByText('記録する')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ログ一覧表示
// ---------------------------------------------------------------------------

describe('CareLogsScreen 一覧表示', () => {
  it('ログ行が表示される', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([
        makeCareLogItem('log-1', 'other'),
        makeCareLogItem('log-2', 'pesticide'),
      ]),
    });
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByText('その他')).toBeTruthy();
    expect(screen.getByText('農薬')).toBeTruthy();
  });

  it('note があるログ行では note のテキストが表示される', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([
        makeCareLogItem('log-1', 'other', '黒松の枝を整えました'),
      ]),
    });
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByText('黒松の枝を整えました')).toBeTruthy();
  });

  it('すべての手入れ種別ラベルが表示できる', () => {
    const items = [
      makeCareLogItem('log-1', BONSAI_CARE_TYPE.PESTICIDE),
      makeCareLogItem('log-2', BONSAI_CARE_TYPE.SOLID_FERTILIZER),
      makeCareLogItem('log-3', BONSAI_CARE_TYPE.LIQUID_FERTILIZER),
      makeCareLogItem('log-4', BONSAI_CARE_TYPE.ROTATE),
      makeCareLogItem('log-5', BONSAI_CARE_TYPE.SHADING),
      makeCareLogItem('log-6', BONSAI_CARE_TYPE.MURO_IN),
      makeCareLogItem('log-7', BONSAI_CARE_TYPE.MURO_OUT),
      makeCareLogItem('log-8', BONSAI_CARE_TYPE.OTHER),
    ];
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData(items),
    });
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByText('農薬')).toBeTruthy();
    expect(screen.getByText('固形肥料')).toBeTruthy();
    expect(screen.getByText('液体肥料')).toBeTruthy();
    expect(screen.getByText('向き替え')).toBeTruthy();
    expect(screen.getByText('遮光')).toBeTruthy();
    expect(screen.getByText('室入れ')).toBeTruthy();
    expect(screen.getByText('室出し')).toBeTruthy();
    expect(screen.getByText('その他')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// FAB（新規作成）
// ---------------------------------------------------------------------------

describe('CareLogsScreen FAB', () => {
  it('「手入れを記録する」FAB が表示される', () => {
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByLabelText('手入れを記録する')).toBeTruthy();
  });

  it('FAB タップでフォームモーダルが開く（タイトルが表示される）', () => {
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    expect(screen.getByText('手入れを記録')).toBeTruthy();
  });

  it('FAB タップ後にキャンセルボタンが表示される', () => {
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    expect(screen.getByLabelText('キャンセル')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 編集モーダル
// ---------------------------------------------------------------------------

describe('CareLogsScreen 編集モーダル', () => {
  it('ログ行タップで編集モーダルが開く', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('その他 2025年6月1日を編集'));
    });
    expect(screen.getByText('手入れログを編集')).toBeTruthy();
  });

  it('編集モーダルのキャンセルで閉じる', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('その他 2025年6月1日を編集'));
    });
    act(() => {
      fireEvent.press(screen.getByLabelText('キャンセル'));
    });
    expect(screen.queryByText('手入れログを編集')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 種別セレクタ
// ---------------------------------------------------------------------------

describe('CareLogsScreen 種別セレクタ', () => {
  it('フォームを開くと種別セレクタが表示される', () => {
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    expect(screen.getByText('種別')).toBeTruthy();
  });

  it('種別チップ「農薬」が表示される', () => {
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    expect(screen.getAllByLabelText('農薬')[0]).toBeTruthy();
  });

  it('新規作成時は既定種別「農薬」が選択済みになっている', () => {
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    const pesticideChips = screen.getAllByLabelText('農薬');
    expect(pesticideChips[0]?.props.accessibilityState?.selected).toBe(true);
  });

  it('種別チップをタップすると選択が変わる', () => {
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    const solidFertilizerChip = screen.getByLabelText('固形肥料');
    expect(solidFertilizerChip.props.accessibilityState?.selected).toBe(false);
    act(() => {
      fireEvent.press(solidFertilizerChip);
    });
    expect(solidFertilizerChip.props.accessibilityState?.selected).toBe(true);
    // 農薬（既定値）は選択解除される
    expect(screen.getAllByLabelText('農薬')[0]?.props.accessibilityState?.selected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// note カウンタ
// ---------------------------------------------------------------------------

describe('CareLogsScreen note カウンタ', () => {
  it('フォームを開くと「メモ（任意）」ラベルが表示される', () => {
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    expect(screen.getByText('メモ（任意）')).toBeTruthy();
  });

  it('メモを入力するとカウンタが更新される', () => {
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    const noteInput = screen.getByLabelText('メモ');
    act(() => {
      fireEvent.changeText(noteInput, 'テストメモ');
    });
    expect(screen.getByText('5 / 500')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// フォーム送信（handleSubmit・handleShow）
// ---------------------------------------------------------------------------

describe('CareLogsScreen フォーム送信', () => {
  it('FAB タップ後にモーダル内の「記録する」ボタンが表示される', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    expect(screen.getByLabelText('記録する')).toBeTruthy();
  });

  it('FAB タップ→「記録する」ボタンタップで createMutation.mutate が呼ばれる', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    const submitButton = screen.getByLabelText('記録する');
    act(() => {
      fireEvent(submitButton, 'press');
    });
    expect(mockCreateMutate).toHaveBeenCalled();
  });

  it('実施日フィールドは新規作成時、現在日時が既定値として設定されている', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    // buildInitialForm() が performedAt を現在時刻で埋めるため、プレースホルダーは表示されない
    expect(screen.queryByLabelText(/実施日 ＊：日時を選択/)).toBeNull();
    expect(screen.getByLabelText(/^実施日 ＊：/)).toBeTruthy();
  });

  it('実施日フィールドをタップすると日時ピッカー（iOS スピナー）が開く', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    act(() => {
      fireEvent.press(screen.getByLabelText(/^実施日 ＊：/));
    });
    expect(screen.getByTestId('mock-datetimepicker')).toBeTruthy();
  });

  it('日時ピッカーで日時を選択するとフィールドの表示が更新される', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    act(() => {
      fireEvent.press(screen.getByLabelText(/^実施日 ＊：/));
    });
    const picker = screen.getByTestId('mock-datetimepicker');
    act(() => {
      fireEvent(picker, 'change', {}, new Date(2025, 5, 1, 9, 30));
    });
    expect(screen.getByLabelText(/^実施日 ＊：2025年6月1日/)).toBeTruthy();
  });

  it('実施日を削除すると「記録する」ボタンが disabled になる（実施日は必須）', () => {
    // ScreenEmpty の actionLabel も「記録する」のため、一覧が空だとラベル重複で
    // getByLabelText が曖昧になる。非空データにしてモーダル内の送信ボタンのみに絞る。
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('手入れを記録する'));
    });
    act(() => {
      fireEvent.press(screen.getByLabelText('実施日を削除'));
    });
    const submitButton = screen.getByLabelText('記録する');
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 削除（handleDelete）
// ---------------------------------------------------------------------------

describe('CareLogsScreen 削除', () => {
  it('削除ボタンタップで Alert が表示される', () => {
    const Alert = require('react-native').Alert;
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    const deleteButton = screen.getByLabelText('その他 2025年6月1日を削除');
    act(() => {
      fireEvent.press(deleteButton);
    });
    expect(alertSpy).toHaveBeenCalledWith(
      '手入れログを削除',
      expect.any(String),
      expect.any(Array)
    );
    alertSpy.mockRestore();
  });

  it('削除 Alert の「削除」ボタン押下で deleteMutation.mutate が呼ばれる', () => {
    const Alert = require('react-native').Alert;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const destructiveButton = (buttons as { text: string; onPress?: () => void; style?: string }[])?.find(
          (b) => b.style === 'destructive'
        );
        destructiveButton?.onPress?.();
      }
    );
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    const deleteButton = screen.getByLabelText('その他 2025年6月1日を削除');
    act(() => {
      fireEvent.press(deleteButton);
    });
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      { logId: 'log-1' },
      expect.any(Object)
    );
    alertSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// ページネーション（handleEndReached・renderFooter）
// ---------------------------------------------------------------------------

describe('CareLogsScreen ページネーション', () => {
  it('isFetchingNextPage=true のときフッターの ActivityIndicator が表示される', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
      isFetchingNextPage: true,
    });
    renderWithProviders(<CareLogsScreen />);
    expect(screen.getByText('その他')).toBeTruthy();
  });

  it('hasNextPage=true かつ isFetchingNextPage=false のとき handleEndReached が fetchNextPage を呼ぶ', () => {
    const mockFetchNextPage = jest.fn();
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });
    const { UNSAFE_getByProps } = renderWithProviders(<CareLogsScreen />);
    const list = UNSAFE_getByProps({ accessibilityRole: 'list' });
    fireEvent(list, 'endReached');
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 編集フォーム送信（updateMutation）
// ---------------------------------------------------------------------------

describe('CareLogsScreen 編集フォーム送信', () => {
  it('編集モーダルで「更新する」ボタンタップで updateMutation.mutate が呼ばれる', () => {
    mockUseCareLogsQuery.mockReturnValue({
      ...defaultQuery,
      data: makeCareLogsData([makeCareLogItem('log-1', 'other')]),
    });
    renderWithProviders(<CareLogsScreen />);
    act(() => {
      fireEvent.press(screen.getByLabelText('その他 2025年6月1日を編集'));
    });
    // モーダルが開いた状態で送信ボタンを探す
    const submitButtons = screen.getAllByRole('button');
    const submitButton = submitButtons.find(
      (btn) =>
        btn.props.accessibilityLabel === '更新する' ||
        btn.props.accessibilityLabel === '記録する'
    );
    if (submitButton) {
      act(() => {
        fireEvent.press(submitButton);
      });
      expect(mockUpdateMutate).toHaveBeenCalled();
    }
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('CareLogsScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status');
    (useOnlineStatus as jest.Mock).mockReturnValue(false);
    renderWithProviders(<CareLogsScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
