/**
 * @module components/notification/NotificationItem
 * 通知一覧 1 件表示コンポーネント（notifications-screen.md §4 / §6）。
 * 既読化はセルタップではなく画面マウント時の自動全件既読化（§8）で行うため、このコンポーネントは表示のみ担う。
 * FlatList 内での再レンダリング抑制のため React.memo でラップ。
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NotificationItem as NotificationItemType } from '@/lib/queries/notifications';
import { getNotificationMessage } from '@/lib/utils/notification-message';
import { formatRelativeTime } from '@/lib/utils/relative-time';
import {
  colorBackground,
  colorSurface,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  colorError,
  colorSuccess,
  colorWarning,
  colorSurfaceMuted,
  spacing2,
  spacing3,
  spacing4,
  radiusFull,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';
import { UserAvatar } from '@/components/common/UserAvatar';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 44;
const TYPE_BADGE_SIZE = 20;
const TYPE_BADGE_ICON_SIZE = 12;
const UNREAD_DOT_SIZE = 8;
const CELL_MIN_HEIGHT = 72;

// ---------------------------------------------------------------------------
// 通知 type 別アイコン・色の定義（notifications-screen.md §6.1）
// ---------------------------------------------------------------------------

type NotificationTypeConfig = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

function getTypeConfig(type: string): NotificationTypeConfig {
  switch (type) {
    case 'like':
    case 'comment_like':
      return { iconName: 'heart', color: colorError };
    case 'comment':
    case 'reply':
      return { iconName: 'chatbubble', color: colorTextSecondary };
    case 'follow':
    case 'follow_request_approved':
      return { iconName: 'person-add', color: colorSuccess };
    case 'follow_request':
      return { iconName: 'person-add', color: colorTextSecondary };
    case 'quote':
    case 'repost':
      return { iconName: 'repeat', color: colorTextSecondary };
    case 'mention':
      return { iconName: 'at', color: colorTextSecondary };
    case 'message':
      return { iconName: 'mail', color: colorTextSecondary };
    case 'subscription_expiring':
      return { iconName: 'star', color: colorWarning };
    case 'system':
    default:
      return { iconName: 'notifications', color: colorTextSecondary };
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type NotificationItemProps = {
  notification: NotificationItemType;
  onPress: () => void;
};

// ---------------------------------------------------------------------------
// アクター名の太字強調テキスト（本文のニックネーム部分を太字にするため分割）
// ---------------------------------------------------------------------------

function BoldedMessage({ message, nickname }: { message: string; nickname: string | null }) {
  if (nickname === null || !message.startsWith(nickname)) {
    return <Text style={styles.bodyText}>{message}</Text>;
  }

  const rest = message.slice(nickname.length);
  return (
    <Text style={styles.bodyText}>
      <Text style={styles.bodyNickname}>{nickname}</Text>
      {rest}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function NotificationItemBase({ notification, onPress }: NotificationItemProps) {
  const {
    type,
    isRead,
    createdAt,
    actor,
    post,
    comment,
  } = notification;

  const actorNickname = actor?.nickname ?? null;
  const message = getNotificationMessage(type, actorNickname);
  const relativeTime = formatRelativeTime(createdAt);
  const typeConfig = getTypeConfig(type);

  const hasContentPreview =
    (post !== null && post !== undefined) ||
    (comment !== null && comment !== undefined);
  const contentPreviewText = comment?.content ?? post?.content ?? null;

  const cellAccessibilityLabel = [
    message,
    relativeTime,
    isRead ? '既読' : '未読',
  ].join('。');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        isRead ? styles.containerRead : styles.containerUnread,
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={cellAccessibilityLabel}
    >
      {/* 未読ドット */}
      {!isRead && (
        <View
          style={styles.unreadDot}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}

      {/* アバター + タイプバッジ */}
      <View style={styles.avatarContainer}>
        {actor !== null && actor !== undefined ? (
          <UserAvatar
            avatarUrl={actor.avatarUrl}
            userId={actor.id}
            size={AVATAR_SIZE}
            accessibilityLabel={`${actor.nickname}のプロフィール画像`}
          />
        ) : (
          <View
            style={[styles.avatar, styles.avatarFallback]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
        )}

        {/* type バッジ */}
        <View style={styles.typeBadge}>
          <Ionicons
            name={typeConfig.iconName}
            size={TYPE_BADGE_ICON_SIZE}
            color={typeConfig.color}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
      </View>

      {/* 本文エリア */}
      <View style={styles.body}>
        <BoldedMessage message={message} nickname={actorNickname} />

        {hasContentPreview && contentPreviewText !== null && (
          <Text
            style={styles.preview}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {contentPreviewText}
          </Text>
        )}

        <Text style={styles.time}>{relativeTime}</Text>
      </View>
    </Pressable>
  );
}

export const NotificationItem = React.memo(NotificationItemBase);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    minHeight: CELL_MIN_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  containerRead: {
    backgroundColor: colorBackground,
  },
  containerUnread: {
    backgroundColor: colorSurface,
    borderLeftWidth: 3,
    borderLeftColor: colorActionPrimary,
  },
  containerPressed: {
    opacity: 0.85,
  },
  unreadDot: {
    position: 'absolute',
    left: spacing2,
    top: CELL_MIN_HEIGHT / 2 - UNREAD_DOT_SIZE / 2,
    width: UNREAD_DOT_SIZE,
    height: UNREAD_DOT_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing3,
    marginTop: spacing2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radiusFull,
  },
  avatarFallback: {
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: TYPE_BADGE_SIZE,
    height: TYPE_BADGE_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingTop: spacing2,
    gap: spacing2,
  },
  bodyText: {
    ...textBase,
    color: colorTextPrimary,
  },
  bodyNickname: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '700',
  },
  preview: {
    ...textSm,
    color: colorTextSecondary,
  },
  time: {
    ...textSm,
    color: colorTextSecondary,
  },
});
