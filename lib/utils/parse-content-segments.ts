/**
 * @module lib/utils/parse-content-segments
 * 投稿本文をプレーン / メンション / ハッシュタグ のセグメント列に変換する純粋関数。
 * Web 版 Bon_Log_cfw/lib/mention-utils.ts の parseContentSegments と挙動互換を維持する。
 * React に依存しない。
 */

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** プレーンテキストセグメント */
export type TextSegment = {
  type: 'text';
  content: string;
};

/**
 * メンションセグメント。
 * サーバーが <@userId> 形式で本文に埋め込む。表示名解決は呼び出し側が行う。
 */
export type MentionSegment = {
  type: 'mention';
  userId: string;
};

/**
 * ハッシュタグセグメント。
 * tag には # プレフィックスを含む（例: "#盆栽"）。
 * Web 版 parseContentSegments と同じ仕様。
 */
export type HashtagSegment = {
  type: 'hashtag';
  tag: string;
};

/** コンテンツセグメントのユニオン型 */
export type ContentSegment = TextSegment | MentionSegment | HashtagSegment;

// ---------------------------------------------------------------------------
// 正規表現
// ---------------------------------------------------------------------------

/**
 * メンション <@userId> を抽出する正規表現。
 * グループ 1: ユーザー ID（英数字・アンダースコア・ハイフン）。
 * Web 版 MENTION_ID_REGEX と同一パターン。
 */
const MENTION_REGEX = /<@([a-zA-Z0-9_-]+)>/g;

/**
 * ハッシュタグを抽出する正規表現。
 * 英数字・アンダースコア・ひらがな・カタカナ・漢字をサポート。
 * Web 版 HASHTAG_REGEX と同一パターン。
 */
const HASHTAG_REGEX = /#[\w぀-ゟ゠-ヿ一-龯]+/g;

// ---------------------------------------------------------------------------
// 内部型
// ---------------------------------------------------------------------------

type MatchInfo =
  | { type: 'mention'; start: number; end: number; userId: string }
  | { type: 'hashtag'; start: number; end: number; tag: string };

// ---------------------------------------------------------------------------
// 公開関数
// ---------------------------------------------------------------------------

/**
 * 投稿本文をセグメント列にパースする。
 *
 * - 空文字・null・undefined は空配列を返す
 * - メンション・ハッシュタグが重複しても各マッチを独立したセグメントとして扱う
 * - 出現順にソートするため、テキスト中の順番がそのまま保持される
 *
 * @param text - サーバーから受け取った生の投稿本文
 * @returns ContentSegment の配列
 */
export function parseContentSegments(text: string | null | undefined): ContentSegment[] {
  if (!text) return [];

  const matches: MatchInfo[] = [];

  // メンションをすべて収集（lastIndex リセットで複数呼び出しに安全）
  MENTION_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const userId = match[1];
    if (userId !== undefined) {
      matches.push({
        type: 'mention',
        start: match.index,
        end: match.index + match[0].length,
        userId,
      });
    }
  }

  // ハッシュタグをすべて収集
  HASHTAG_REGEX.lastIndex = 0;
  while ((match = HASHTAG_REGEX.exec(text)) !== null) {
    matches.push({
      type: 'hashtag',
      start: match.index,
      end: match.index + match[0].length,
      tag: match[0],
    });
  }

  // テキスト内の出現順に並べる
  matches.sort((a, b) => a.start - b.start);

  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  for (const m of matches) {
    // マッチ前のテキスト部分をプレーンセグメントとして追加
    if (m.start > lastIndex) {
      const content = text.slice(lastIndex, m.start);
      if (content) {
        segments.push({ type: 'text', content });
      }
    }

    if (m.type === 'mention') {
      segments.push({ type: 'mention', userId: m.userId });
    } else {
      segments.push({ type: 'hashtag', tag: m.tag });
    }

    lastIndex = m.end;
  }

  // 末尾の残りテキスト
  if (lastIndex < text.length) {
    const content = text.slice(lastIndex);
    if (content) {
      segments.push({ type: 'text', content });
    }
  }

  // マッチが一切なければテキスト全体を単一セグメントとして返す（Web 版と同挙動）
  if (segments.length === 0) {
    segments.push({ type: 'text', content: text });
  }

  return segments;
}
