/**
 * @module types/genre
 * 投稿ジャンルの共有型定義。
 * サーバー API のレスポンス型は OpenAPI 生成待ち — 手書きしない。
 * GenreCategory のみ定数ミラーとして定義する（limits/post.ts から re-export）。
 */

export type { GenreCategory } from '@/lib/constants/limits/post';
