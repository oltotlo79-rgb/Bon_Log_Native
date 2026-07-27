/**
 * lib/utils/normalize-url-scheme の単体テスト。
 * スキーム部分のみの大文字小文字正規化と、ホスト・パス・クエリ・フラグメントが
 * 変更されないことを検証する。妥当性検証（isValidUrl の責務）はここでは扱わない。
 */

import { normalizeUrlScheme } from '@/lib/utils/normalize-url-scheme';

describe('normalizeUrlScheme', () => {
  // ---------------------------------------------------------------------------
  // 小文字スキーム → 変化なし
  // ---------------------------------------------------------------------------

  it('https:// で始まる URL はそのまま返す', () => {
    expect(normalizeUrlScheme('https://example.com')).toBe('https://example.com');
  });

  it('http:// で始まる URL はそのまま返す', () => {
    expect(normalizeUrlScheme('http://example.com')).toBe('http://example.com');
  });

  // ---------------------------------------------------------------------------
  // 大文字スキーム → スキームのみ小文字化
  // ---------------------------------------------------------------------------

  it('HTTPS:// のスキームを小文字化する', () => {
    expect(normalizeUrlScheme('HTTPS://example.com')).toBe('https://example.com');
  });

  it('HTTP:// のスキームを小文字化する', () => {
    expect(normalizeUrlScheme('HTTP://example.com')).toBe('http://example.com');
  });

  // ---------------------------------------------------------------------------
  // 混在スキーム → スキームのみ小文字化
  // ---------------------------------------------------------------------------

  it('Https:// のスキームを小文字化する', () => {
    expect(normalizeUrlScheme('Https://example.com')).toBe('https://example.com');
  });

  it('hTtPs:// のスキームを小文字化する', () => {
    expect(normalizeUrlScheme('hTtPs://example.com')).toBe('https://example.com');
  });

  // ---------------------------------------------------------------------------
  // ホスト名・パス・クエリ・フラグメントは変更されない
  // ---------------------------------------------------------------------------

  it('ホスト名の大文字小文字を変更しない', () => {
    expect(normalizeUrlScheme('HTTPS://EXAMPLE.COM')).toBe('https://EXAMPLE.COM');
  });

  it('パスの大文字小文字を変更しない（パスは大文字小文字を区別するため）', () => {
    expect(normalizeUrlScheme('HTTPS://example.com/Path/To/Page')).toBe(
      'https://example.com/Path/To/Page'
    );
  });

  it('クエリ・フラグメントの大文字小文字を変更しない', () => {
    expect(normalizeUrlScheme('HTTPS://example.com/path?Key=Value#Section')).toBe(
      'https://example.com/path?Key=Value#Section'
    );
  });

  it('ホスト・パス・クエリ・フラグメントを含む URL 全体でスキームのみを小文字化する', () => {
    expect(
      normalizeUrlScheme('HTTPS://Example.COM/Path/To/Page?Key=Value#Section')
    ).toBe('https://Example.COM/Path/To/Page?Key=Value#Section');
  });

  // ---------------------------------------------------------------------------
  // 非 http(s) スキーム → 変更しない
  // ---------------------------------------------------------------------------

  it('javascript: スキームは変更せずそのまま返す', () => {
    expect(normalizeUrlScheme('javascript:alert(1)')).toBe('javascript:alert(1)');
  });

  it('ftp:// スキームは変更せずそのまま返す', () => {
    expect(normalizeUrlScheme('ftp://example.com')).toBe('ftp://example.com');
  });

  it('mailto: スキームは変更せずそのまま返す', () => {
    expect(normalizeUrlScheme('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('data: スキームは変更せずそのまま返す', () => {
    expect(normalizeUrlScheme('data:text/plain;base64,SGVsbG8=')).toBe(
      'data:text/plain;base64,SGVsbG8='
    );
  });

  it('大文字の FTP:// スキームも変更せずそのまま返す（http/https のみが対象）', () => {
    expect(normalizeUrlScheme('FTP://example.com')).toBe('FTP://example.com');
  });

  // ---------------------------------------------------------------------------
  // 空文字 → そのまま返す
  // ---------------------------------------------------------------------------

  it('空文字を渡すとそのまま返す', () => {
    expect(normalizeUrlScheme('')).toBe('');
  });

  // ---------------------------------------------------------------------------
  // 前後の空白 → トリムしない
  // ---------------------------------------------------------------------------

  it('先頭に空白がある場合はスキームとして一致せず変更しない（トリムしない）', () => {
    expect(normalizeUrlScheme(' HTTPS://example.com')).toBe(' HTTPS://example.com');
  });

  it('末尾に空白がある場合でもスキームのみ小文字化しそれ以外は変更しない', () => {
    expect(normalizeUrlScheme('HTTPS://example.com ')).toBe('https://example.com ');
  });

  // ---------------------------------------------------------------------------
  // スキーム断片 → 前方一致しないため変更しない
  // ---------------------------------------------------------------------------

  it('スキームの一部（http）のみでは変更しない', () => {
    expect(normalizeUrlScheme('http')).toBe('http');
  });

  it('スキームの一部（https:）のみでは変更しない', () => {
    expect(normalizeUrlScheme('https:')).toBe('https:');
  });

  it('スキームの一部（https:/）のみでは変更しない', () => {
    expect(normalizeUrlScheme('https:/')).toBe('https:/');
  });

  it('大文字のスキーム断片（HTTPS:/）のみでは変更しない', () => {
    expect(normalizeUrlScheme('HTTPS:/')).toBe('HTTPS:/');
  });

  // ---------------------------------------------------------------------------
  // 日本語を含む URL
  // ---------------------------------------------------------------------------

  it('日本語を含む URL でもスキームのみ小文字化しパスは変更しない', () => {
    expect(normalizeUrlScheme('HTTPS://example.com/盆栽/一覧')).toBe(
      'https://example.com/盆栽/一覧'
    );
  });
});
