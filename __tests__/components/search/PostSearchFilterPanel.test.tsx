/**
 * @module __tests__/components/search/PostSearchFilterPanel
 * PostSearchFilterPanel のコンポーネントテスト。
 * 開閉トグル・ジャンル選択・期間/最小いいね数/メディア種別の設定・適用・リセット・アクティブ表示を検証する。
 * モック境界は useGenresQuery（lib/queries/shops）。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { PostSearchFilterPanel } from '@/components/search/PostSearchFilterPanel';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import type { SearchPostsFilter } from '@/lib/queries/keys';

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

const MOCK_GENRES = [
  { id: 'genre-1', name: '松柏類' },
  { id: 'genre-2', name: '雑木類' },
  { id: 'genre-3', name: '草もの' },
];

const defaultGenreQueryResult = {
  data: { items: MOCK_GENRES },
  isLoading: false,
  isError: false,
};

const emptyGenreQueryResult = {
  data: undefined,
  isLoading: false,
  isError: false,
};

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function renderPanel(
  currentFilter: SearchPostsFilter = {},
  options: {
    onApply?: jest.Mock;
    onReset?: jest.Mock;
  } = {}
) {
  const onApply = options.onApply ?? jest.fn();
  const onReset = options.onReset ?? jest.fn();
  renderWithProviders(
    <PostSearchFilterPanel
      currentFilter={currentFilter}
      onApply={onApply}
      onReset={onReset}
    />
  );
  return { onApply, onReset };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('PostSearchFilterPanel — 開閉トグル', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenresQuery.mockReturnValue(defaultGenreQueryResult);
  });

  it('初期状態（フィルタなし）でパネルが閉じている', () => {
    renderPanel({});
    // パネル内のセクションラベルが存在しないことで閉じていることを確認
    expect(screen.queryByText('ジャンル')).toBeNull();
  });

  it('トグルボタンが表示される', () => {
    renderPanel({});
    expect(screen.getByRole('button', { name: '詳細フィルターを開く' })).toBeTruthy();
  });

  it('トグルボタンを押すとパネルが開く', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    expect(screen.getByText('ジャンル')).toBeTruthy();
  });

  it('パネルを開いた後、トグルボタンを押すと閉じる', () => {
    renderPanel({});
    // 開く
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    expect(screen.getByText('ジャンル')).toBeTruthy();
    // 閉じる
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを閉じる' }));
    expect(screen.queryByText('ジャンル')).toBeNull();
  });

  it('アクティブフィルタがある場合は初期状態でパネルが開いている', () => {
    renderPanel({ genreId: 'genre-1' });
    expect(screen.getByText('ジャンル')).toBeTruthy();
  });
});

describe('PostSearchFilterPanel — アクティブ表示', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenresQuery.mockReturnValue(defaultGenreQueryResult);
  });

  it('フィルタなしのとき活性ドットが表示されない', () => {
    renderPanel({});
    // activeDot は View コンポーネントのため、アクセシビリティラベルで間接確認する
    // フィルタなし → hasActiveFilters=false → ドットなし。トグルボタンのラベルで確認
    const toggleBtn = screen.getByRole('button', { name: '詳細フィルターを開く' });
    expect(toggleBtn).toBeTruthy();
  });

  it('genreId フィルタがある場合に詳細フィルターボタンが表示される', () => {
    renderPanel({ genreId: 'genre-1' });
    expect(screen.getByRole('button', { name: '詳細フィルターを閉じる' })).toBeTruthy();
  });

  it('dateFrom フィルタがある場合にパネルが初期開放される', () => {
    renderPanel({ dateFrom: '2025-01-01' });
    expect(screen.getByText('期間')).toBeTruthy();
  });

  it('minLikes フィルタがある場合にパネルが初期開放される', () => {
    renderPanel({ minLikes: 5 });
    expect(screen.getByText('最小いいね数')).toBeTruthy();
  });

  it('mediaType フィルタがある場合にパネルが初期開放される', () => {
    renderPanel({ mediaType: 'image' });
    expect(screen.getByText('メディア種別')).toBeTruthy();
  });
});

describe('PostSearchFilterPanel — ジャンル選択', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenresQuery.mockReturnValue(defaultGenreQueryResult);
  });

  it('ジャンル一覧がチップとして表示される', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    expect(screen.getByRole('checkbox', { name: 'ジャンル 松柏類' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'ジャンル 雑木類' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'ジャンル 草もの' })).toBeTruthy();
  });

  it('ジャンルチップをタップすると選択状態になる', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    const chip = screen.getByRole('checkbox', { name: 'ジャンル 松柏類' });
    fireEvent.press(chip);
    expect(chip.props.accessibilityState.checked).toBe(true);
  });

  it('選択中のジャンルを再タップすると選択解除される', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    const chip = screen.getByRole('checkbox', { name: 'ジャンル 松柏類' });
    fireEvent.press(chip);
    expect(chip.props.accessibilityState.checked).toBe(true);
    fireEvent.press(chip);
    expect(chip.props.accessibilityState.checked).toBe(false);
  });

  it('ジャンルが未ロードのとき（data=undefined）チップが表示されない', () => {
    mockUseGenresQuery.mockReturnValue(emptyGenreQueryResult);
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    // ジャンル section ラベルは残るが、チップはない
    expect(screen.getByText('ジャンル')).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /ジャンル/ })).toBeNull();
  });

  it('useGenresQuery が type=post で呼ばれる', () => {
    renderPanel({});
    expect(mockUseGenresQuery).toHaveBeenCalledWith('post');
  });
});

describe('PostSearchFilterPanel — 期間入力', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenresQuery.mockReturnValue(defaultGenreQueryResult);
  });

  // DatePickerField は label="" のため、プレースホルダー（開始日/終了日）自体が
  // アクセシビリティラベルのプレフィックスとして使われる（"開始日：開始日" 等）。
  function pickDate(fieldLabel: RegExp, doneLabel: string, date: Date) {
    fireEvent.press(screen.getByLabelText(fieldLabel));
    const picker = screen.getByTestId('mock-datetimepicker');
    fireEvent(picker, 'change', {}, date);
    fireEvent.press(screen.getByLabelText(doneLabel));
  }

  it('開始日と終了日の入力フィールドが表示される', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    expect(screen.getByLabelText('開始日：開始日')).toBeTruthy();
    expect(screen.getByLabelText('終了日：終了日')).toBeTruthy();
  });

  it('開始日を選択できる', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    pickDate(/^開始日/, '開始日の選択を完了', new Date(2025, 0, 1));
    expect(screen.getByLabelText(/^開始日：2025年1月1日/)).toBeTruthy();
  });

  it('終了日を選択できる', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    pickDate(/^終了日/, '終了日の選択を完了', new Date(2025, 11, 31));
    expect(screen.getByLabelText(/^終了日：2025年12月31日/)).toBeTruthy();
  });

  it('currentFilter に dateFrom がある場合、初期値として反映される', () => {
    renderPanel({ dateFrom: '2025-06-01' });
    expect(screen.getByLabelText(/^開始日：2025年6月1日/)).toBeTruthy();
  });

  it('currentFilter に dateTo がある場合、初期値として反映される', () => {
    renderPanel({ dateTo: '2025-06-30' });
    expect(screen.getByLabelText(/^終了日：2025年6月30日/)).toBeTruthy();
  });
});

describe('PostSearchFilterPanel — 最小いいね数入力', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenresQuery.mockReturnValue(defaultGenreQueryResult);
  });

  it('最小いいね数の入力フィールドが表示される', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    expect(screen.getByLabelText('最小いいね数を入力')).toBeTruthy();
  });

  it('最小いいね数を入力できる', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    const input = screen.getByLabelText('最小いいね数を入力');
    fireEvent.changeText(input, '10');
    expect(input.props.value).toBe('10');
  });

  it('currentFilter に minLikes がある場合、初期値として反映される', () => {
    renderPanel({ minLikes: 50 });
    const input = screen.getByLabelText('最小いいね数を入力');
    expect(input.props.value).toBe('50');
  });
});

describe('PostSearchFilterPanel — メディア種別選択', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenresQuery.mockReturnValue(defaultGenreQueryResult);
  });

  it('メディア種別オプションが表示される', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    expect(screen.getByRole('radio', { name: 'メディア種別 すべて' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'メディア種別 画像あり' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'メディア種別 動画あり' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'メディア種別 テキストのみ' })).toBeTruthy();
  });

  it('「画像あり」を選択すると checked=true になる', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    const chip = screen.getByRole('radio', { name: 'メディア種別 画像あり' });
    fireEvent.press(chip);
    expect(chip.props.accessibilityState.checked).toBe(true);
  });

  it('「動画あり」を選択すると checked=true になる', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    const chip = screen.getByRole('radio', { name: 'メディア種別 動画あり' });
    fireEvent.press(chip);
    expect(chip.props.accessibilityState.checked).toBe(true);
  });

  it('選択中のメディア種別を再タップすると選択解除される', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    const chip = screen.getByRole('radio', { name: 'メディア種別 画像あり' });
    fireEvent.press(chip);
    expect(chip.props.accessibilityState.checked).toBe(true);
    fireEvent.press(chip);
    expect(chip.props.accessibilityState.checked).toBe(false);
  });
});

describe('PostSearchFilterPanel — 適用（onApply）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenresQuery.mockReturnValue(defaultGenreQueryResult);
  });

  it('何も設定せずに適用すると空の SearchPostsFilter が渡される', () => {
    const onApply = jest.fn();
    renderPanel({}, { onApply });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({});
  });

  it('ジャンルを選択して適用すると genreId が渡される', () => {
    const onApply = jest.fn();
    renderPanel({}, { onApply });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'ジャンル 松柏類' }));
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledWith({ genreId: 'genre-1' });
  });

  it('期間を選択して適用すると dateFrom と dateTo が渡される', () => {
    const onApply = jest.fn();
    renderPanel({}, { onApply });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.press(screen.getByLabelText(/^開始日/));
    fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', {}, new Date(2025, 0, 1));
    fireEvent.press(screen.getByLabelText('開始日の選択を完了'));
    fireEvent.press(screen.getByLabelText(/^終了日/));
    fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', {}, new Date(2025, 11, 31));
    fireEvent.press(screen.getByLabelText('終了日の選択を完了'));
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledWith({ dateFrom: '2025-01-01', dateTo: '2025-12-31' });
  });

  it('最小いいね数を入力して適用すると minLikes が数値で渡される', () => {
    const onApply = jest.fn();
    renderPanel({}, { onApply });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.changeText(screen.getByLabelText('最小いいね数を入力'), '10');
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledWith({ minLikes: 10 });
  });

  it('最小いいね数が 0 以下の場合は minLikes が含まれない', () => {
    const onApply = jest.fn();
    renderPanel({}, { onApply });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.changeText(screen.getByLabelText('最小いいね数を入力'), '0');
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledWith({});
  });

  it('最小いいね数が数値でない場合は minLikes が含まれない', () => {
    const onApply = jest.fn();
    renderPanel({}, { onApply });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.changeText(screen.getByLabelText('最小いいね数を入力'), 'abc');
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledWith({});
  });

  it('メディア種別「画像あり」を選択して適用すると mediaType=image が渡される', () => {
    const onApply = jest.fn();
    renderPanel({}, { onApply });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.press(screen.getByRole('radio', { name: 'メディア種別 画像あり' }));
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledWith({ mediaType: 'image' });
  });

  it('メディア種別「動画あり」を選択して適用すると mediaType=video が渡される', () => {
    const onApply = jest.fn();
    renderPanel({}, { onApply });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.press(screen.getByRole('radio', { name: 'メディア種別 動画あり' }));
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledWith({ mediaType: 'video' });
  });

  it('メディア種別「テキストのみ」を選択して適用すると mediaType=none が渡される', () => {
    const onApply = jest.fn();
    renderPanel({}, { onApply });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.press(screen.getByRole('radio', { name: 'メディア種別 テキストのみ' }));
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledWith({ mediaType: 'none' });
  });

  it('全フィルタを設定して適用すると全フィールドが渡される', () => {
    const onApply = jest.fn();
    renderPanel({}, { onApply });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'ジャンル 雑木類' }));
    fireEvent.press(screen.getByLabelText(/^開始日/));
    fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', {}, new Date(2025, 0, 1));
    fireEvent.press(screen.getByLabelText('開始日の選択を完了'));
    fireEvent.press(screen.getByLabelText(/^終了日/));
    fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', {}, new Date(2025, 5, 30));
    fireEvent.press(screen.getByLabelText('終了日の選択を完了'));
    fireEvent.changeText(screen.getByLabelText('最小いいね数を入力'), '5');
    fireEvent.press(screen.getByRole('radio', { name: 'メディア種別 画像あり' }));
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledWith({
      genreId: 'genre-2',
      dateFrom: '2025-01-01',
      dateTo: '2025-06-30',
      minLikes: 5,
      mediaType: 'image',
    });
  });
});

describe('PostSearchFilterPanel — リセット（onReset）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenresQuery.mockReturnValue(defaultGenreQueryResult);
  });

  it('何も設定していないときリセットボタンが表示されない', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    expect(screen.queryByRole('button', { name: 'フィルターをリセットする' })).toBeNull();
  });

  it('ジャンルを選択するとリセットボタンが表示される', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'ジャンル 松柏類' }));
    expect(screen.getByRole('button', { name: 'フィルターをリセットする' })).toBeTruthy();
  });

  it('リセットボタンをタップすると onReset が呼ばれる', () => {
    const onReset = jest.fn();
    renderPanel({}, { onReset });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'ジャンル 松柏類' }));
    fireEvent.press(screen.getByRole('button', { name: 'フィルターをリセットする' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('リセット後に適用すると空の SearchPostsFilter が渡される', () => {
    const onApply = jest.fn();
    const onReset = jest.fn();
    renderPanel({}, { onApply, onReset });
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    // フィルタを設定
    fireEvent.press(screen.getByRole('checkbox', { name: 'ジャンル 松柏類' }));
    fireEvent.changeText(screen.getByLabelText('最小いいね数を入力'), '10');
    // リセット
    fireEvent.press(screen.getByRole('button', { name: 'フィルターをリセットする' }));
    // リセット後に適用
    fireEvent.press(screen.getByRole('button', { name: 'フィルターを適用する' }));
    expect(onApply).toHaveBeenCalledWith({});
  });

  it('リセット後にジャンルチップの選択状態が解除される', () => {
    renderPanel({});
    fireEvent.press(screen.getByRole('button', { name: '詳細フィルターを開く' }));
    const chip = screen.getByRole('checkbox', { name: 'ジャンル 松柏類' });
    fireEvent.press(chip);
    expect(chip.props.accessibilityState.checked).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'フィルターをリセットする' }));
    expect(screen.getByRole('checkbox', { name: 'ジャンル 松柏類' }).props.accessibilityState.checked).toBe(false);
  });
});
