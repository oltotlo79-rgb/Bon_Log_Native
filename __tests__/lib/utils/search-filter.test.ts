/**
 * @module __tests__/lib/utils/search-filter
 * hasSearchPostsFilter の単体テスト。
 * 「q が空文字でもフィルタ（ジャンル等）のいずれかが指定されていればフェッチする」判定
 * （lib/queries/search.ts の useSearchPostsQuery の enabled 判定に使われる）の全分岐を網羅する。
 */

import { hasSearchPostsFilter } from '@/lib/utils/search-filter';
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
});
