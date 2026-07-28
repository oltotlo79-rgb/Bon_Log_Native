/**
 * @module lib/utils/search-filter
 * 投稿検索フィルタの補助関数。
 */

import type { SearchPostsFilter } from '@/lib/queries/keys';

/**
 * フィルタのいずれかのフィールドが指定されているかを判定する。
 * サーバー API は q 任意でジャンル等のフィルタのみの検索を受け付けるため、
 * enabled 判定（q 空文字時にフィルタがあればフェッチする）に使う。
 */
export function hasSearchPostsFilter(filter?: SearchPostsFilter): boolean {
  if (filter === undefined) {
    return false;
  }
  return (
    filter.genreId !== undefined ||
    (filter.genreIds !== undefined && filter.genreIds.length > 0) ||
    filter.dateFrom !== undefined ||
    filter.dateTo !== undefined ||
    filter.minLikes !== undefined ||
    filter.mediaType !== undefined
  );
}

/**
 * genreIds の重複除去 + ソートを行う。
 * サーバーは順序を問わず OR-any（和集合）で扱うため、配列の順序違いだけで
 * クエリキャッシュ（queryKeys.search.posts）が分裂しないよう正規化する。
 * 空配列は「指定なし」と同義として undefined に揃える。
 */
export function normalizeGenreIds(genreIds?: string[]): string[] | undefined {
  if (genreIds === undefined || genreIds.length === 0) {
    return undefined;
  }
  return Array.from(new Set(genreIds)).sort();
}
