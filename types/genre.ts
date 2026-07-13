/**
 * @module types/genre
 * 投稿ジャンルの共有型定義。
 * Genre（id/name/category）は OpenAPI 生成型のエイリアス（lib/queries/shops.ts）を re-export する
 * （手書きコピー禁止 — api-client.md）。GenreCategoryGroup はカテゴリ単位のグルーピング結果
 * （lib/utils/group-genres-by-category.ts）。GenreCategory は表示順定数のミラー（limits/post.ts）。
 */

export type { GenreCategory } from '@/lib/constants/limits/post';
export type { Genre } from '@/lib/queries/shops';
export type { GenreCategoryGroup, CategorizedGenre } from '@/lib/utils/group-genres-by-category';
