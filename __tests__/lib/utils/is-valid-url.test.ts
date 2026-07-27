/**
 * lib/utils/is-valid-url の単体テスト。
 * 空文字の許容、http(s) スキームの判定、それ以外の文字列の拒否を検証する。
 */

import { isValidUrl } from '@/lib/utils/is-valid-url';

describe('isValidUrl', () => {
  // ---------------------------------------------------------------------------
  // 空文字 → true（未入力を許容する）
  // ---------------------------------------------------------------------------

  it('空文字を渡すと true を返す', () => {
    expect(isValidUrl('')).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // https:// / http:// で始まる URL → true
  // ---------------------------------------------------------------------------

  it('https:// で始まる URL は true を返す', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('http:// で始まる URL は true を返す', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('https:// URL にパス・クエリが付いていても true を返す', () => {
    expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // スキームなし → false
  // ---------------------------------------------------------------------------

  it('スキームなしの文字列（www.example.com）は false を返す', () => {
    expect(isValidUrl('www.example.com')).toBe(false);
  });

  it('スキームなしの文字列（example.com）は false を返す', () => {
    expect(isValidUrl('example.com')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 別スキーム → false
  // ---------------------------------------------------------------------------

  it('ftp:// スキームは false を返す', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  it('javascript: スキームは false を返す', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('mailto: スキームは false を返す', () => {
    expect(isValidUrl('mailto:test@example.com')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 大文字スキーム → サーバーと同じ大文字小文字非依存の判定のため true
  // ---------------------------------------------------------------------------

  it('大文字の HTTPS:// はサーバーと同じ大文字小文字非依存の判定のため true を返す', () => {
    expect(isValidUrl('HTTPS://example.com')).toBe(true);
  });

  it('大文字の HTTP:// はサーバーと同じ大文字小文字非依存の判定のため true を返す', () => {
    expect(isValidUrl('HTTP://example.com')).toBe(true);
  });

  it('大文字小文字が混在する Https:// は true を返す', () => {
    expect(isValidUrl('Https://example.com')).toBe(true);
  });

  it('大文字小文字が混在する hTtPs:// は true を返す', () => {
    expect(isValidUrl('hTtPs://example.com')).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 前後に空白がある場合 → トリムしないため false
  // ---------------------------------------------------------------------------

  it('先頭に空白がある https:// URL は false を返す（トリムしない）', () => {
    expect(isValidUrl(' https://example.com')).toBe(false);
  });

  it('末尾に空白がある https:// URL も true を返す（前方一致のみを見るため末尾の空白は影響しない）', () => {
    expect(isValidUrl('https://example.com ')).toBe(true);
  });

  it('空白のみの文字列は false を返す（空文字ではないため）', () => {
    expect(isValidUrl('   ')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // スキームの一部だけ → false
  // ---------------------------------------------------------------------------

  it('スキームの一部（http）のみでは false を返す', () => {
    expect(isValidUrl('http')).toBe(false);
  });

  it('スキームの一部（https:）のみでは false を返す', () => {
    expect(isValidUrl('https:')).toBe(false);
  });

  it('スキームの一部（https:/）のみでは false を返す', () => {
    expect(isValidUrl('https:/')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 日本語を含む URL
  // ---------------------------------------------------------------------------

  it('日本語を含む https:// URL は true を返す', () => {
    expect(isValidUrl('https://example.com/盆栽/一覧')).toBe(true);
  });

  it('スキームなしの日本語文字列は false を返す', () => {
    expect(isValidUrl('盆栽サイト.com')).toBe(false);
  });
});
