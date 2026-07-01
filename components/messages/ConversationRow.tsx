/**
 * @module components/messages/ConversationRow
 * 会話一覧の 1 行コンポーネント。
 * 相手のアバター / ニックネーム / 最後のメッセージプレビュー / 時刻 / 未読バッジを表示する。
 * FlatList の renderItem で使用するため React.memo 化している。
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ConversationItem } from '@/lib/queries/messages';
import {
  colorBackground,
  colorBorderLight,
  colorActionPrimary,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  spacing4,
  radiusFull,
  textBase,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 48;
const UNREAD_BADGE_SIZE = 10;

// ---------------------------------------------------------------------------
// 時刻フォーマット（相対表示）
// date-fns を使わず純 JS で実装し、バンドルサイズを抑える。
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHr < 24) return `${diffHr}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ConversationRowProps = {
  item: ConversationItem;
  onPress: (conversationId: string, item: ConversationItem) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ConversationRowInner({ item, onPress }: ConversationRowProps) {
  const nickname = item.otherUser?.nickname ?? '削除されたユーザー';
  const preview = item.lastMessage?.content ?? 'メッセージなし';
  const timeLabel = formatRelativeTime(item.updatedAt);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(item.id, item)}
      accessibilityRole="button"
      accessibilityLabel={`${nickname}との会話${item.hasUnread ? '（未読あり）' : ''}`}
      activeOpacity={0.7}
    >
      <UserAvatar
        avatarUrl={item.otherUser?.avatarUrl ?? null}
        userId={item.otherUser?.id}
        size={AVATAR_SIZE}
        accessibilityLabel={`${nickname}のアバター`}
        recyclingKey={item.id}
      />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.nickname} numberOfLines={1} accessibilityRole="text">
            {nickname}
          </Text>
          <Text style={styles.time} accessibilityRole="text">
            {timeLabel}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, item.hasUnread && styles.previewUnread]}
            numberOfLines={1}
            accessibilityRole="text"
          >
            {preview}
          </Text>
          {item.hasUnread && (
            <View
              style={styles.unreadBadge}
              accessibilityLabel="未読"
              accessibilityRole="image"
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ConversationRow = React.memo(ConversationRowInner);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorBackground,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    gap: spacing3,
    minHeight: 72,
  },
  body: {
    flex: 1,
    gap: spacing2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing2,
  },
  nickname: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
    flex: 1,
  },
  time: {
    ...textXs,
    color: colorTextSecondary,
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  preview: {
    ...textSm,
    color: colorTextSecondary,
    flex: 1,
  },
  previewUnread: {
    color: colorTextPrimary,
    fontWeight: '600',
  },
  unreadBadge: {
    width: UNREAD_BADGE_SIZE,
    height: UNREAD_BADGE_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
    flexShrink: 0,
  },
});
