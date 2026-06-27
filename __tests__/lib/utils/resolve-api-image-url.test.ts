/**
 * lib/utils/resolve-api-image-url の単体テスト。
 * null/空の入力、絶対 URL のパススルー、相対パスの base 前置、その他文字列のパススルーを検証する。
 */

import { resolveApiImageUrl } from '@/lib/utils/resolve-api-image-url';

// EXPO_PUBLIC_API_BASE_URL はモジュールレベルで参照されるため、
// テスト開始前に環境変数を設定してからモジュールを再 require する必要がある。
// ただし本関数は純粋関数であり、モジュール評価時に BASE_URL を確定させるため
// 環境変数のテスト内書き換えは効かない。
// テストは本番フォールバック（https://www.bon-log.com）を前提とする。

describe('resolveApiImageUrl', () => {
  // ---------------------------------------------------------------------------
  // null / undefined / 空文字 → null
  // ---------------------------------------------------------------------------

  it('null を渡すと null を返す', () => {
    expect(resolveApiImageUrl(null)).toBeNull();
  });

  it('undefined を渡すと null を返す', () => {
    expect(resolveApiImageUrl(undefined)).toBeNull();
  });

  it('空文字を渡すと null を返す', () => {
    expect(resolveApiImageUrl('')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // https:// / http:// で始まる URL → そのまま返す
  // ---------------------------------------------------------------------------

  it('https:// で始まる URL をそのまま返す', () => {
    const url = 'https://cdn.example.com/images/aphid.jpg';
    expect(resolveApiImageUrl(url)).toBe(url);
  });

  it('http:// で始まる URL をそのまま返す', () => {
    const url = 'http://localhost:3000/images/test.png';
    expect(resolveApiImageUrl(url)).toBe(url);
  });

  it('https:// URL にクエリパラメータが付いていてもそのまま返す', () => {
    const url = 'https://cdn.example.com/images/pest.jpg?w=400&h=300';
    expect(resolveApiImageUrl(url)).toBe(url);
  });

  it('https:// URL のパスが深くてもそのまま返す', () => {
    const url = 'https://cdn.example.com/pest/thumbnails/aphid/main.webp';
    expect(resolveApiImageUrl(url)).toBe(url);
  });

  // ---------------------------------------------------------------------------
  // / で始まる相対パス → API_BASE_URL を前置（二重スラッシュにならない）
  // ---------------------------------------------------------------------------

  it('/ で始まる相対パスに API_BASE_URL を前置する', () => {
    const result = resolveApiImageUrl('/images/aphid.jpg');
    // テスト環境では EXPO_PUBLIC_API_BASE_URL が未設定のため本番フォールバック値を使用
    expect(result).toBe('https://www.bon-log.com/images/aphid.jpg');
  });

  it('相対パス前置後に二重スラッシュが含まれない', () => {
    const result = resolveApiImageUrl('/pest/thumbnails/main.png');
    expect(result).not.toContain('//pest');
    expect(result).toBe('https://www.bon-log.com/pest/thumbnails/main.png');
  });

  it('ネストされた相対パスでも正しく前置する', () => {
    const result = resolveApiImageUrl('/api/v1/images/disease-pest/spider-mite.jpg');
    expect(result).toBe('https://www.bon-log.com/api/v1/images/disease-pest/spider-mite.jpg');
  });

  // ---------------------------------------------------------------------------
  // それ以外の文字列 → そのまま返す
  // ---------------------------------------------------------------------------

  it('プロトコルなしの相対 URL（/ で始まらない）をそのまま返す', () => {
    const url = 'images/aphid.jpg';
    expect(resolveApiImageUrl(url)).toBe(url);
  });

  it('data: URI をそのまま返す', () => {
    const url = 'data:image/png;base64,abc123';
    expect(resolveApiImageUrl(url)).toBe(url);
  });

  it('ホスト名のみの文字列をそのまま返す', () => {
    const url = 'example.com/image.jpg';
    expect(resolveApiImageUrl(url)).toBe(url);
  });

  // ---------------------------------------------------------------------------
  // 戻り値の型が string | null
  // ---------------------------------------------------------------------------

  it('有効な URL では string を返す（null でない）', () => {
    const result = resolveApiImageUrl('https://example.com/img.jpg');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('相対パスでも string を返す（null でない）', () => {
    const result = resolveApiImageUrl('/images/test.jpg');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });
});
