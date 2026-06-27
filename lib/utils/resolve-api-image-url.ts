/**
 * @module lib/utils/resolve-api-image-url
 * サーバー API から返される imageUrl を expo-image で表示可能な完全 URL に変換する純粋関数。
 * 病害虫図鑑など一部エンドポイントは完全 URL と相対パス（/ 始まり）が混在して返るため、
 * 相対パスには EXPO_PUBLIC_API_BASE_URL を前置して正規化する。
 */

// EXPO_PUBLIC_API_BASE_URL が未設定の場合は本番 URL にフォールバックする。
// 開発環境で意図的に空文字を設定した場合でも /images/... のような相対パスは
// そのままでは expo-image が解決できないため、フォールバックで最低限動作させる。
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.bon-log.com').replace(
  /\/$/,
  ''
);

/**
 * サーバーが返す imageUrl を完全な HTTPS URL に解決して返す。
 *
 * @param imageUrl - サーバーから受け取った画像 URL。完全 URL・相対パス・null/undefined のいずれか
 * @returns 完全 URL 文字列、または画像なしを示す null
 *
 * 変換ルール:
 * - null / undefined / 空文字 → null
 * - "https://..." または "http://..." → そのまま返す（CDN や外部ホスト直リンク）
 * - "/" で始まる相対パス → API_BASE_URL を前置して完全 URL にする
 * - それ以外の文字列（プロトコル無し・データ URI 等） → そのまま返す
 */
export function resolveApiImageUrl(imageUrl: string | null | undefined): string | null {
  if (imageUrl == null || imageUrl === '') {
    return null;
  }

  if (imageUrl.startsWith('https://') || imageUrl.startsWith('http://')) {
    return imageUrl;
  }

  if (imageUrl.startsWith('/')) {
    return `${API_BASE_URL}${imageUrl}`;
  }

  return imageUrl;
}
