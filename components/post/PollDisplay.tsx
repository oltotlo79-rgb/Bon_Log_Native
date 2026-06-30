/**
 * @module components/post/PollDisplay
 * アンケートの読み取り専用表示。
 * poll フィールドはスキーマ上 unknown のため、型ガードで安全に絞り込む。
 * 投票操作は近日対応予定のため現在は無効（理由: サーバー側投票エンドポイントが未公開）。
 * Web: components/post/PollDisplay.tsx の結果表示モードを移植。
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  colorBorder,
  colorSuccessBg,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  radiusMd,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型定義 + 型ガード
// ---------------------------------------------------------------------------

type PollOption = {
  id: string;
  text: string;
  _count: { votes: number };
};

type PollData = {
  id: string;
  expiresAt: string;
  options: PollOption[];
  _count: { votes: number };
};

function isPollOption(value: unknown): value is PollOption {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj['id'] !== 'string') return false;
  if (typeof obj['text'] !== 'string') return false;
  const count = obj['_count'];
  if (typeof count !== 'object' || count === null) return false;
  const countObj = count as Record<string, unknown>;
  return typeof countObj['votes'] === 'number';
}

function isPollData(value: unknown): value is PollData {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj['id'] !== 'string') return false;
  if (typeof obj['expiresAt'] !== 'string') return false;
  if (!Array.isArray(obj['options'])) return false;
  if (!obj['options'].every(isPollOption)) return false;
  const count = obj['_count'];
  if (typeof count !== 'object' || count === null) return false;
  const countObj = count as Record<string, unknown>;
  return typeof countObj['votes'] === 'number';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PollDisplayProps = {
  /** スキーマ上 unknown。型ガードで安全に使用する */
  poll: unknown;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PollDisplay = React.memo(function PollDisplay({ poll }: PollDisplayProps) {
  if (!isPollData(poll)) return null;

  return <PollDisplayInner poll={poll} />;
});

type PollDisplayInnerProps = {
  poll: PollData;
};

function PollDisplayInner({ poll }: PollDisplayInnerProps) {
  const totalVotes = poll._count.votes;

  // useState の lazy initializer はマウント時に1度だけ呼ばれるため purity 安全。
  const [nowMs] = useState<number>(() => Date.now());

  const expiresAtMs = new Date(poll.expiresAt).getTime();

  const isExpired = useMemo(
    () => nowMs >= expiresAtMs,
    [nowMs, expiresAtMs]
  );

  const timeLabel = useMemo(() => {
    if (isExpired) return '終了済み';
    const diffMs = expiresAtMs - nowMs;
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `残り約 ${diffHours} 時間`;
    const diffDays = Math.ceil(diffHours / 24);
    return `残り約 ${diffDays} 日`;
  }, [poll.expiresAt, isExpired, nowMs, expiresAtMs]);

  return (
    <View style={styles.container}>
      {/* 選択肢ごとに割合バーと得票率を表示する（結果表示モード固定） */}
      {poll.options.map((option) => {
        const count = option._count.votes;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

        return (
          <View key={option.id} style={styles.optionRow}>
            {/* 背景バー */}
            <View
              style={[
                styles.barBackground,
                { width: `${pct}%` },
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            {/* テキスト層 */}
            <View style={styles.optionContent}>
              <Text style={styles.optionText} numberOfLines={2}>
                {option.text}
              </Text>
              <Text style={styles.pctText}>{pct}%</Text>
            </View>
          </View>
        );
      })}

      {/* フッター: 票数・期限 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{totalVotes}票</Text>
        <Text style={styles.footerDot}>・</Text>
        <Text style={styles.footerText}>{timeLabel}</Text>
        {!isExpired && (
          <>
            <Text style={styles.footerDot}>・</Text>
            <Text style={styles.footerNote}>投票機能は近日対応予定</Text>
          </>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: spacing2,
    marginVertical: spacing3,
  },
  optionRow: {
    position: 'relative',
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
  },
  barBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: colorSuccessBg,
    borderRadius: radiusMd,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    gap: spacing2,
  },
  optionText: {
    ...textSm,
    color: colorTextPrimary,
    flex: 1,
    flexShrink: 1,
  },
  pctText: {
    ...textSm,
    color: colorTextSecondary,
    flexShrink: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginTop: spacing2,
  },
  footerText: {
    ...textXs,
    color: colorTextSecondary,
  },
  footerDot: {
    ...textXs,
    color: colorTextSecondary,
    marginHorizontal: spacing2,
  },
  footerNote: {
    ...textXs,
    color: colorTextSecondary,
    fontStyle: 'italic',
  },
});
