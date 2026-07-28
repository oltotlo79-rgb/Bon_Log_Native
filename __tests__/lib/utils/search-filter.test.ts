/**
 * @module __tests__/lib/utils/search-filter
 * hasSearchPostsFilter / normalizeGenreIds の単体テスト。
 * hasSearchPostsFilter は「q が空文字でもフィルタ（ジャンル等）のいずれかが指定されていれば
 * フェッチする」判定（lib/queries/search.ts の useSearchPostsQuery の enabled 判定に使われる）の
 * 全分岐を網羅する。
 * normalizeGenreIds は genreIds の重複除去・ソートにより、配列の順序違いだけで
 * クエリキャッシュ（queryKeys.search.posts）が分裂しないことを保証する関数。
 */

import { hasSearchPostsFilter, normalizeGenreIds } from '@/lib/utils/search-filter';
import type { SearchPostsFilter } from '@/lib/queries/keys';

describe('hasSearchPostsFilter', () => {
  it('filter が undefined のとき false を返す', () => {
    expect(hasSearchPostsFilter(undefined)).toBe(false);
  });

  it('filter が空オブジェクトのとき false を返す', () => {
    expect(hasSearchPostsFilter({})).toBe(false);
  });

  it('genreId のみ指定されているとき true を返す', () => {
    const filter: SearchPostsFilter = { genreId: 'genre-1' };
    expect(hasSearchPostsFilter(filter)).toBe(true);
  });

  it('dateFrom のみ指定されているとき true を返す', () => {
    const filter: SearchPostsFilter = { dateFrom: '2025-01-01' };
    expect(hasSearchPostsFilter(filter)).toBe(true);
  });

  it('dateTo のみ指定されているとき true を返す', () => {
    const filter: SearchPostsFilter = { dateTo: '2025-01-31' };
    expect(hasSearchPostsFilter(filter)).toBe(true);
  });

  it('minLikes のみ指定されているとき true を返す（0 でも指定扱い）', () => {
    const filter: SearchPostsFilter = { minLikes: 0 };
    expect(hasSearchPostsFilter(filter)).toBe(true);
  });

  it('minLikes が正の値のとき true を返す', () => {
    const filter: SearchPostsFilter = { minLikes: 10 };
    expect(hasSearchPostsFilter(filter)).toBe(true);
  });

  it('mediaType のみ指定されているとき true を返す', () => {
    const filter: SearchPostsFilter = { mediaType: 'image' };
    expect(hasSearchPostsFilter(filter)).toBe(true);
  });

  it('mediaType="none" が明示指定されていても true を返す（値ではなく指定有無で判定）', () => {
    const filter: SearchPostsFilter = { mediaType: 'none' };
    expect(hasSearchPostsFilter(filter)).toBe(true);
  });

  it('複数フィールドが同時指定されていても true を返す', () => {
    const filter: SearchPostsFilter = {
      genreId: 'genre-1',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
      minLikes: 5,
      mediaType: 'video',
    };
    expect(hasSearchPostsFilter(filter)).toBe(true);
  });

  it('全フィールドが undefined のとき false を返す（明示的な undefined 代入）', () => {
    const filter: SearchPostsFilter = {
      genreId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      minLikes: undefined,
      mediaType: undefined,
    };
    expect(hasSearchPostsFilter(filter)).toBe(false);
  });

  it('genreIds が空配列のとき false を返す（指定なしと同義）', () => {
    const filter: SearchPostsFilter = { genreIds: [] };
    expect(hasSearchPostsFilter(filter)).toBe(false);
  });

  it('genreIds が undefined のとき false を返す', () => {
    const filter: SearchPostsFilter = { genreIds: undefined };
    expect(hasSearchPostsFilter(filter)).toBe(false);
  });

  it('genreIds に要素があるとき true を返す', () => {
    const filter: SearchPostsFilter = { genreIds: ['genre-1'] };
    expect(hasSearchPostsFilter(filter)).toBe(true);
  });

  it('genreIds が複数要素のとき true を返す', () => {
    const filter: SearchPostsFilter = { genreIds: ['genre-1', 'genre-2'] };
    expect(hasSearchPostsFilter(filter)).toBe(true);
  });
});

describe('normalizeGenreIds', () => {
  it('undefined のとき undefined を返す', () => {
    expect(normalizeGenreIds(undefined)).toBeUndefined();
  });

  it('空配列のとき undefined を返す（指定なしと同義に揃える）', () => {
    expect(normalizeGenreIds([])).toBeUndefined();
  });

  it('単一要素はそのまま 1 要素の配列を返す', () => {
    expect(normalizeGenreIds(['genre-a'])).toEqual(['genre-a']);
  });

  it('重複を除去する', () => {
    expect(normalizeGenreIds(['genre-a', 'genre-a', 'genre-b'])).toEqual(['genre-a', 'genre-b']);
  });

  it('昇順にソートする', () => {
    expect(normalizeGenreIds(['genre-c', 'genre-a', 'genre-b'])).toEqual([
      'genre-a',
      'genre-b',
      'genre-c',
    ]);
  });

  it('入力順序が異なっても同じ正規化結果になる（キャッシュキー分裂防止の肝）', () => {
    const orderA = normalizeGenreIds(['genre-b', 'genre-a', 'genre-c']);
    const orderB = normalizeGenreIds(['genre-c', 'genre-b', 'genre-a']);
    const orderC = normalizeGenreIds(['genre-a', 'genre-b', 'genre-c']);
    expect(orderA).toEqual(orderB);
    expect(orderB).toEqual(orderC);
  });

  it('重複と順序違いが混在していても正規化後は一致する', () => {
    const result1 = normalizeGenreIds(['genre-x', 'genre-y', 'genre-x']);
    const result2 = normalizeGenreIds(['genre-y', 'genre-x']);
    expect(result1).toEqual(result2);
    expect(result1).toEqual(['genre-x', 'genre-y']);
  });
});
