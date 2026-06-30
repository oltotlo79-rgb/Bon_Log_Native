/**
 * @module __tests__/components/search/HashtagSearchResults
 * HashtagSearchResults のコンポーネントテスト。
 * 空入力案内・デバウンス後の候補表示・候補タップ遷移・エラー・結果なしを検証する。
 * モック境界は useSearchHashtagsQuery（lib/queries/search）と useDebounce（hooks/use-debounce）。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { HashtagSearchResults } from '@/components/search/HashtagSearchResults';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ERR_SEARCH_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// クエリフック・debounce のモック
// ---------------------------------------------------------------------------

const mockUseSearchHashtagsQuery = jest.fn();

jest.mock('@/lib/queries/search', () => ({
  useSearchHashtagsQuery: (...args: unknown[]) => mockUseSearchHashtagsQuery(...args),
}));

// デフォルトは即時返し（value をそのまま返す）。
// debounce 遅延をテストするケースでは個別に上書きする。
let mockDebouncedValue: (value: string) => string = (v) => v;

jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string, _delay: number) => mockDebouncedValue(value),
}));

// router.push のモック（setup.ts の expo-router モックから参照）
const mockRouterPush = jest.requireMock('expo-router').router.push as jest.Mock;

// ---------------------------------------------------------------------------
// テスト用ファクトリ
// ---------------------------------------------------------------------------

function makeHashtagItem(overrides?: {
  id?: string;
  name?: string;
  count?: number;
}) {
  return {
    id: overrides?.id ?? 'tag-1',
    name: overrides?.name ?? '松',
    count: overrides?.count ?? 100,
  };
}

// ---------------------------------------------------------------------------
// 基本クエリ状態
// ---------------------------------------------------------------------------

const loadingState = {
  data: undefined,
  isLoading: true,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

const errorState = {
  data: undefined,
  isLoading: false,
  isError: true,
  error: new Error('Hashtag search failed'),
  refetch: jest.fn(),
};

const emptyResultState = {
  data: { items: [] },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

function makeSuccessState(items: ReturnType<typeof makeHashtagItem>[]) {
  return {
    data: { items },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('HashtagSearchResults — 空入力案内', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDebouncedValue = (v) => v;
    mockUseSearchHashtagsQuery.mockReturnValue(emptyResultState);
  });

  it('rawQuery が空文字のとき「タグを検索」案内が表示される', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="" />);
    expect(screen.getByText('タグを検索')).toBeTruthy();
  });

  it('rawQuery が空文字のとき説明文が表示される', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="" />);
    expect(screen.getByText('ハッシュタグを入力すると候補が表示されます')).toBeTruthy();
  });

  it('rawQuery が空文字のとき useSearchHashtagsQuery が空文字クエリで呼ばれる（フックはReactルールで必ず呼ばれる）', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="" />);
    // Reactのフックルールにより useSearchHashtagsQuery は必ず呼ばれる。
    // rawQuery='' の場合、debouncedQ='' のため enabled=false がサーバー側フックで設定されるが
    // フック自体の呼び出しは発生する。コンポーネントは早期リターンで案内 UI を表示する。
    expect(mockUseSearchHashtagsQuery).toHaveBeenCalledWith('', expect.any(Number));
  });
});

describe('HashtagSearchResults — デバウンス待ち', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchHashtagsQuery.mockReturnValue(loadingState);
  });

  it('rawQuery が空でなく debouncedQ が空文字のとき案内テキストが消えてローディング表示になる', () => {
    // debouncedValue を常に空文字にする
    mockDebouncedValue = (_v) => '';
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    // rawQuery が非空で debouncedQ が空のとき:「タグを検索」案内は出ない
    expect(screen.queryByText('タグを検索')).toBeNull();
    // 結果一覧も出ない
    expect(screen.queryByRole('button', { name: /#/ })).toBeNull();
  });
});

describe('HashtagSearchResults — ローディング状態', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDebouncedValue = (v) => v;
    mockUseSearchHashtagsQuery.mockReturnValue(loadingState);
  });

  it('isLoading=true のとき候補テキストが表示されない（ローディング中）', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    // ローディング中は候補ハッシュタグも空状態テキストも出ない
    expect(screen.queryByText('#松')).toBeNull();
    expect(screen.queryByText('一致するタグはありません')).toBeNull();
  });

  it('isLoading=true のとき候補リストは表示されない', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    expect(screen.queryByRole('button', { name: /#松/ })).toBeNull();
  });
});

describe('HashtagSearchResults — エラー状態', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDebouncedValue = (v) => v;
    mockUseSearchHashtagsQuery.mockReturnValue(errorState);
  });

  it('isError=true のときエラータイトルが表示される', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    expect(screen.getByText('検索できませんでした')).toBeTruthy();
  });

  it('isError=true のとき ERR_SEARCH_FAILED のメッセージが表示される', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    expect(screen.getByText(ERR_SEARCH_FAILED)).toBeTruthy();
  });

  it('再試行ボタンをタップすると refetch が呼ばれる', () => {
    const refetch = jest.fn();
    mockUseSearchHashtagsQuery.mockReturnValue({ ...errorState, refetch });
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    const retryButton = screen.getByRole('button', { name: /再試行|もう一度/ });
    fireEvent.press(retryButton);
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe('HashtagSearchResults — 結果なし状態', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDebouncedValue = (v) => v;
    mockUseSearchHashtagsQuery.mockReturnValue(emptyResultState);
  });

  it('結果 0 件のとき「一致するタグはありません」が表示される', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="xyz存在しない" />);
    expect(screen.getByText('「#xyz存在しない」に一致するタグはありません')).toBeTruthy();
  });

  it('結果 0 件のとき別キーワードを促す説明が表示される', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="xyz" />);
    expect(screen.getByText('別のキーワードでお試しください')).toBeTruthy();
  });
});

describe('HashtagSearchResults — 候補表示', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDebouncedValue = (v) => v;
  });

  it('候補が存在するとき各ハッシュタグが表示される', () => {
    const items = [
      makeHashtagItem({ id: 'tag-1', name: '松', count: 200 }),
      makeHashtagItem({ id: 'tag-2', name: '黒松', count: 150 }),
    ];
    mockUseSearchHashtagsQuery.mockReturnValue(makeSuccessState(items));
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    expect(screen.getByText('#松')).toBeTruthy();
    expect(screen.getByText('#黒松')).toBeTruthy();
  });

  it('投稿数が件数として表示される', () => {
    const items = [makeHashtagItem({ id: 'tag-1', name: '松', count: 1000 })];
    mockUseSearchHashtagsQuery.mockReturnValue(makeSuccessState(items));
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    expect(screen.getByText('1,000件の投稿')).toBeTruthy();
  });

  it('各候補にアクセシビリティラベルが設定されている', () => {
    const items = [makeHashtagItem({ id: 'tag-1', name: '松', count: 100 })];
    mockUseSearchHashtagsQuery.mockReturnValue(makeSuccessState(items));
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    expect(screen.getByRole('button', { name: '#松 100件の投稿を見る' })).toBeTruthy();
  });

  it('候補が 1 件のみでも正常に表示される（境界値）', () => {
    const items = [makeHashtagItem({ id: 'tag-1', name: '盆栽', count: 1 })];
    mockUseSearchHashtagsQuery.mockReturnValue(makeSuccessState(items));
    renderWithProviders(<HashtagSearchResults rawQuery="盆栽" />);
    expect(screen.getByText('#盆栽')).toBeTruthy();
    expect(screen.getByText('1件の投稿')).toBeTruthy();
  });

  it('count が 0 件でも「0件の投稿」が表示される（境界値）', () => {
    const items = [makeHashtagItem({ id: 'tag-1', name: '新タグ', count: 0 })];
    mockUseSearchHashtagsQuery.mockReturnValue(makeSuccessState(items));
    renderWithProviders(<HashtagSearchResults rawQuery="新タグ" />);
    expect(screen.getByText('0件の投稿')).toBeTruthy();
  });
});

describe('HashtagSearchResults — タップ遷移', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDebouncedValue = (v) => v;
    mockRouterPush.mockClear();
  });

  it('候補をタップすると router.push が呼ばれる', () => {
    const items = [makeHashtagItem({ id: 'tag-1', name: '松', count: 100 })];
    mockUseSearchHashtagsQuery.mockReturnValue(makeSuccessState(items));
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    fireEvent.press(screen.getByRole('button', { name: '#松 100件の投稿を見る' }));
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
  });

  it('候補タップで explorePostsByHashtag 形式のルートが渡される', () => {
    const items = [makeHashtagItem({ id: 'tag-1', name: '黒松', count: 50 })];
    mockUseSearchHashtagsQuery.mockReturnValue(makeSuccessState(items));
    renderWithProviders(<HashtagSearchResults rawQuery="黒松" />);
    fireEvent.press(screen.getByRole('button', { name: '#黒松 50件の投稿を見る' }));
    const arg = mockRouterPush.mock.calls[0][0] as { pathname: string; params: { hashtag: string } };
    expect(arg.params.hashtag).toBe('黒松');
  });

  it('複数候補のうち 2 つ目をタップしても正しいタグ名で遷移する', () => {
    const items = [
      makeHashtagItem({ id: 'tag-1', name: '松', count: 200 }),
      makeHashtagItem({ id: 'tag-2', name: '五葉松', count: 80 }),
    ];
    mockUseSearchHashtagsQuery.mockReturnValue(makeSuccessState(items));
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    fireEvent.press(screen.getByRole('button', { name: '#五葉松 80件の投稿を見る' }));
    const arg = mockRouterPush.mock.calls[0][0] as { pathname: string; params: { hashtag: string } };
    expect(arg.params.hashtag).toBe('五葉松');
  });
});

describe('HashtagSearchResults — クエリフックへの引数', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDebouncedValue = (v) => v;
    mockUseSearchHashtagsQuery.mockReturnValue(emptyResultState);
  });

  it('デバウンス後のクエリ文字列でフックが呼ばれる', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    expect(mockUseSearchHashtagsQuery).toHaveBeenCalledWith('松', expect.any(Number));
  });

  it('limit パラメータが渡される', () => {
    renderWithProviders(<HashtagSearchResults rawQuery="松" />);
    const [_q, limit] = mockUseSearchHashtagsQuery.mock.calls[0] as [string, number];
    expect(typeof limit).toBe('number');
    expect(limit).toBeGreaterThan(0);
  });
});
