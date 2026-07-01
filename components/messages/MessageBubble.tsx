/**
 * @module components/messages/MessageBubble
 * DM メッセージ 1 件の吹き出しコンポーネント。
 * 自分のメッセージは右寄せ（自分アバターなし）、相手は左寄せ＋アバター付き。
 * FlatList の inverted 表示で使うため React.memo 化している。
 * 長押しで削除（自分のメッセージのみ）を onLongPress で通知する。
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserAvatar } from '@/components/common/UserAvatar';
import type { MessageItem } from '@/lib/queries/messages';
import {
  colorActionPrimary,
  colorActionPrimaryText,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextInverse,
  spacing1,
  spacing2,
  spacing3,
  radiusLg,
  radiusFull,
  textBase,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 32;
// Web に合わせて吹き出しの最大幅を 70% に揃える
const BUBBLE_MAX_WIDTH_PERCENT = '70%' as const;

// ---------------------------------------------------------------------------
// 時刻フォーマット（HH:mm）
// ---------------------------------------------------------------------------

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type MessageBubbleProps = {
  item: MessageItem;
  isOwn: boolean;
  /** 長押し（削除）コールバック。自分のメッセージのみ呼び出し元から渡す。 */
  onLongPress?: (messageId: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function MessageBubbleInner({ item, isOwn, onLongPress }: MessageBubbleProps) {
  const timeLabel = formatMessageTime(item.createdAt);
  const senderNickname = item.sender.nickname;

  const handleLongPress = () => {
    if (isOwn && onLongPress !== undefined) {
      onLongPress(item.id);
    }
  };

  return (
    <View
      style={[
        styles.row,
        isOwn ? styles.rowOwn : styles.rowOther,
      ]}
      accessible={false}
    >
      {/* 相手のアバター（自分には表示しない） */}
      {!isOwn && (
        <UserAvatar
          avatarUrl={item.sender.avatarUrl}
          userId={item.sender.id}
          size={AVATAR_SIZE}
          accessibilityLabel={`${senderNickname}のアバター`}
          recyclingKey={item.sender.id}
        />
      )}

      {/* 吹き出し本体 */}
      <TouchableOpacity
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
        ]}
        onLongPress={handleLongPress}
        delayLongPress={500}
        activeOpacity={isOwn ? 0.8 : 1}
        accessibilityRole="text"
        accessibilityLabel={
          `${isOwn ? '自分' : senderNickname}のメッセージ: ${item.content}、${timeLabel}`
        }
        accessibilityHint={isOwn ? '長押しで削除' : undefined}
      >
        <Text style={[styles.content, isOwn ? styles.contentOwn : styles.contentOther]}>
          {item.content}
        </Text>
        <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
          {timeLabel}
        </Text>
      </TouchableOpacity>

      {/* 自分側の右余白（アバターなしの場合のレイアウト補正） */}
      {isOwn && <View style={styles.avatarPlaceholder} />}
    </View>
  );
}

export const MessageBubble = React.memo(MessageBubbleInner);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: spacing1,
    paddingHorizontal: spacing3,
    gap: spacing2,
  },
  rowOwn: {
    flexDirection: 'row-reverse',
  },
  rowOther: {
    flexDirection: 'row',
  },
  bubble: {
    maxWidth: BUBBLE_MAX_WIDTH_PERCENT,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
  },
  bubbleOwn: {
    backgroundColor: colorActionPrimary,
    borderTopLeftRadius: radiusLg,
    borderTopRightRadius: radiusLg,
    borderBottomLeftRadius: radiusLg,
    borderBottomRightRadius: spacing1,
  },
  bubbleOther: {
    backgroundColor: colorSurfaceMuted,
    borderTopLeftRadius: radiusLg,
    borderTopRightRadius: radiusLg,
    borderBottomLeftRadius: spacing1,
    borderBottomRightRadius: radiusLg,
  },
  content: {
    ...textBase,
  },
  contentOwn: {
    color: colorActionPrimaryText,
  },
  contentOther: {
    color: colorTextPrimary,
  },
  time: {
    ...textXs,
    marginTop: spacing1,
  },
  timeOwn: {
    color: colorTextInverse,
    opacity: 0.7,
    textAlign: 'right',
  },
  timeOther: {
    color: colorTextSecondary,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radiusFull,
  },
});
