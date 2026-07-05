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
    filter.dateFrom !== undefined ||
    filter.dateTo !== undefined ||
    filter.minLikes !== undefined ||
    filter.mediaType !== undefined
  );
}
