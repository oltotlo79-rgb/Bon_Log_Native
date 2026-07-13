/**
 * @module lib/utils/group-genres-by-category
 * ジャンル一覧をカテゴリ単位にグルーピングする純関数。
 * frontend が「カテゴリ→個別ジャンル」の2階層 UI（SectionList 等）を組み立てる土台。
 * generated スキーマ型への依存を避けるため構造的最小型（id/name/category）で受け取る
 * （lib/utils は Foundation 層のため lib/api・lib/queries を import しない）。
 */

import { GENRE_CATEGORY_ORDER } from '@/lib/constants/limits/post';

/** グルーピング対象アイテムの最小形状。GenreListResponse.items の要素と構造的に一致する。 */
export type CategorizedGenre = {
  id: string;
  name: string;
  category: string;
};

/** カテゴリ単位のジャンルグループ。 */
export type GenreCategoryGroup<T extends CategorizedGenre = CategorizedGenre> = {
  category: string;
  genres: T[];
};

/**
 * ジャンル配列をカテゴリごとにグルーピングする。
 * 表示順は GENRE_CATEGORY_ORDER を正とする。GENRE_CATEGORY_ORDER に無いカテゴリ
 * （サーバー側でカテゴリが追加された場合等）は出現順を保ったまま末尾に追加する（安全側）。
 * 該当ジャンルが1件もないカテゴリはグループを生成しない。
 */
export function groupGenresByCategory<T extends CategorizedGenre>(
  items: readonly T[]
): GenreCategoryGroup<T>[] {
  const byCategory = new Map<string, T[]>();
  for (const item of items) {
    const bucket = byCategory.get(item.category);
    if (bucket !== undefined) {
      bucket.push(item);
    } else {
      byCategory.set(item.category, [item]);
    }
  }

  const knownCategories = GENRE_CATEGORY_ORDER.filter((category) => byCategory.has(category));
  const unknownCategories = [...byCategory.keys()].filter(
    (category) => !GENRE_CATEGORY_ORDER.some((known) => known === category)
  );

  return [...knownCategories, ...unknownCategories].map((category) => ({
    category,
    genres: byCategory.get(category) ?? [],
  }));
}
