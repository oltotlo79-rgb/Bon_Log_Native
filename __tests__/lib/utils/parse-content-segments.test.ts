import {
  parseContentSegments,
  type ContentSegment,
} from '@/lib/utils/parse-content-segments';

describe('parseContentSegments', () => {
  // ---------------------------------------------------------------------------
  // 空・null・undefined
  // ---------------------------------------------------------------------------

  it('空文字を渡すと空配列を返す', () => {
    expect(parseContentSegments('')).toEqual([]);
  });

  it('null を渡すと空配列を返す', () => {
    expect(parseContentSegments(null)).toEqual([]);
  });

  it('undefined を渡すと空配列を返す', () => {
    expect(parseContentSegments(undefined)).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // プレーンテキストのみ
  // ---------------------------------------------------------------------------

  it('メンション・ハッシュタグのないテキストを単一 text セグメントとして返す', () => {
    const result = parseContentSegments('こんにちは盆栽');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'text', content: 'こんにちは盆栽' },
    ]);
  });

  it('記号を含むプレーンテキストも単一セグメントで返す', () => {
    const result = parseContentSegments('Hello, world! (テスト)');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'text', content: 'Hello, world! (テスト)' },
    ]);
  });

  // ---------------------------------------------------------------------------
  // メンション
  // ---------------------------------------------------------------------------

  it('メンションのみのテキストを mention セグメントとして返す', () => {
    const result = parseContentSegments('<@user123>');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'mention', userId: 'user123' },
    ]);
  });

  it('テキスト + メンション + テキストを正しく分割する', () => {
    const result = parseContentSegments('Hello <@cl123>!');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'text', content: 'Hello ' },
      { type: 'mention', userId: 'cl123' },
      { type: 'text', content: '!' },
    ]);
  });

  it('先頭のメンションを正しく扱う', () => {
    const result = parseContentSegments('<@user1> よろしく');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'mention', userId: 'user1' },
      { type: 'text', content: ' よろしく' },
    ]);
  });

  it('末尾のメンションを正しく扱う', () => {
    const result = parseContentSegments('よろしく <@user1>');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'text', content: 'よろしく ' },
      { type: 'mention', userId: 'user1' },
    ]);
  });

  it('連続するメンションを独立したセグメントとして返す', () => {
    const result = parseContentSegments('<@user1><@user2>');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'mention', userId: 'user1' },
      { type: 'mention', userId: 'user2' },
    ]);
  });

  it('ハイフン・アンダースコアを含む userId を正しく抽出する', () => {
    const result = parseContentSegments('<@user_name-123>');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'mention', userId: 'user_name-123' },
    ]);
  });

  // ---------------------------------------------------------------------------
  // ハッシュタグ
  // ---------------------------------------------------------------------------

  it('ハッシュタグのみのテキストを hashtag セグメントとして返す', () => {
    const result = parseContentSegments('#盆栽');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'hashtag', tag: '#盆栽' },
    ]);
  });

  it('tag には # プレフィックスが含まれる', () => {
    const result = parseContentSegments('#bonsai2024');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'hashtag', tag: '#bonsai2024' },
    ]);
  });

  it('テキスト + ハッシュタグを正しく分割する', () => {
    const result = parseContentSegments('今日の作業 #松柏類');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'text', content: '今日の作業 ' },
      { type: 'hashtag', tag: '#松柏類' },
    ]);
  });

  it('先頭のハッシュタグを正しく扱う', () => {
    const result = parseContentSegments('#盆栽 今日の記録');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'hashtag', tag: '#盆栽' },
      { type: 'text', content: ' 今日の記録' },
    ]);
  });

  it('末尾のハッシュタグを正しく扱う', () => {
    const result = parseContentSegments('今日の記録 #盆栽');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'text', content: '今日の記録 ' },
      { type: 'hashtag', tag: '#盆栽' },
    ]);
  });

  it('連続するハッシュタグを独立したセグメントとして返す', () => {
    const result = parseContentSegments('#松柏類#雑木類');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'hashtag', tag: '#松柏類' },
      { type: 'hashtag', tag: '#雑木類' },
    ]);
  });

  it('カタカナのハッシュタグを正しく抽出する', () => {
    const result = parseContentSegments('#ボンサイ');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'hashtag', tag: '#ボンサイ' },
    ]);
  });

  // ---------------------------------------------------------------------------
  // メンション + ハッシュタグ の混在
  // ---------------------------------------------------------------------------

  it('メンションとハッシュタグが混在するテキストを出現順に分割する', () => {
    const result = parseContentSegments('Hello <@cl123>! Check out #bonsai');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'text', content: 'Hello ' },
      { type: 'mention', userId: 'cl123' },
      { type: 'text', content: '! Check out ' },
      { type: 'hashtag', tag: '#bonsai' },
    ]);
  });

  it('ハッシュタグが先でメンションが後のテキストも正しく処理する', () => {
    const result = parseContentSegments('#盆栽 <@user1> の投稿です');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'hashtag', tag: '#盆栽' },
      { type: 'text', content: ' ' },
      { type: 'mention', userId: 'user1' },
      { type: 'text', content: ' の投稿です' },
    ]);
  });

  it('複数のメンションと複数のハッシュタグが混在するケース', () => {
    const result = parseContentSegments('<@user1> と <@user2> が #松柏類 と #雑木類 を育てています');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'mention', userId: 'user1' },
      { type: 'text', content: ' と ' },
      { type: 'mention', userId: 'user2' },
      { type: 'text', content: ' が ' },
      { type: 'hashtag', tag: '#松柏類' },
      { type: 'text', content: ' と ' },
      { type: 'hashtag', tag: '#雑木類' },
      { type: 'text', content: ' を育てています' },
    ]);
  });

  // ---------------------------------------------------------------------------
  // 記号隣接・エッジケース
  // ---------------------------------------------------------------------------

  it('メンション直前に句読点があっても正しく分割する', () => {
    const result = parseContentSegments('お知らせ、<@admin>さんへ');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'text', content: 'お知らせ、' },
      { type: 'mention', userId: 'admin' },
      { type: 'text', content: 'さんへ' },
    ]);
  });

  it('ハッシュタグ直後に句読点がある場合、句読点はテキストセグメントに含まれる', () => {
    const result = parseContentSegments('#盆栽、今日の記録');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'hashtag', tag: '#盆栽' },
      { type: 'text', content: '、今日の記録' },
    ]);
  });

  it('テキストが空白のみの場合は単一 text セグメントとして返す', () => {
    const result = parseContentSegments('   ');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'text', content: '   ' },
    ]);
  });

  it('複数回呼び出しても正規表現の状態がリセットされて正しい結果を返す', () => {
    const input = '<@user1> #タグ';
    const first = parseContentSegments(input);
    const second = parseContentSegments(input);
    expect(first).toEqual(second);
  });

  it('同一メンションが複数回登場しても各出現を独立したセグメントとして返す', () => {
    const result = parseContentSegments('<@user1> と <@user1>');
    expect(result).toEqual<ContentSegment[]>([
      { type: 'mention', userId: 'user1' },
      { type: 'text', content: ' と ' },
      { type: 'mention', userId: 'user1' },
    ]);
  });
});
