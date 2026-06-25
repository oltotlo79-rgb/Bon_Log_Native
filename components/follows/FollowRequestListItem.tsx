/**
 * @module components/follows/FollowRequestListItem
 * フォローリクエスト 1 件行（follow-requests.md §3.2）。
 * FlatList 内での再レンダリング抑制のため React.memo でラップ。
 */

import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { FollowRequestItem } from '@/lib/queries/follows';
import {
  colorBackground,
  colorBorder,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  radiusMd,
  spacing2,
  spacing4,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';
import { UserAvatar } from '@/components/common/UserAvatar';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 44;
const BUTTON_HEIGHT = 36;
const BUTTON_MIN_WIDTH = 56;
const BUTTON_HIT_SLOP = { top: 4, bottom: 4, left: 8, right: 8 };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type FollowRequestListItemProps = {
  request: FollowRequestItem;
  onApprove: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  isApproving: boolean;
  isDeclining: boolean;
  onPressUser: (requesterId: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FollowRequestListItemBase({
  request,
  onApprove,
  onDecline,
  isApproving,
  isDeclining,
  onPressUser,
}: FollowRequestListItemProps) {
  const { id: requestId, requester } = request;
  const { id: requesterId, nickname, avatarUrl, bio } = requester;

  const isAnyLoading = isApproving || isDeclining;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPressUser(requesterId)}
      disabled={isAnyLoading}
      accessibilityRole="button"
      accessibilityLabel={`${nickname} のプロフィールを表示する`}
      activeOpacity={0.7}
    >
      {/* アバター */}
      <View style={styles.avatarWrapper}>
        <UserAvatar
          avatarUrl={avatarUrl}
          userId={requesterId}
          size={AVATAR_SIZE}
          accessibilityLabel={`${nickname}のプロフィール画像`}
        />
      </View>

      {/* ユーザー情報 */}
      <View style={styles.info}>
        <Text style={styles.nickname} numberOfLines={1}>
          {nickname}
        </Text>
        {bio !== null && bio.length > 0 && (
          <Text style={styles.bio} numberOfLines={1} ellipsizeMode="tail">
            {bio}
          </Text>
        )}
      </View>

      {/* アクションボタン */}
      <View style={styles.actions}>
        {/* 承認ボタン */}
        <TouchableOpacity
          testID="follow-request-approve"
          style={[styles.approveButton, isApproving && styles.buttonLoading]}
          onPress={() => onApprove(requestId)}
          disabled={isAnyLoading}
          hitSlop={BUTTON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`${nickname} のフォローリクエストを承認する`}
          accessibilityState={{ busy: isApproving, disabled: isAnyLoading }}
        >
          {isApproving ? (
            <ActivityIndicator
              size="small"
              color={colorActionPrimaryText}
              accessibilityElementsHidden
            />
          ) : (
            <Text style={styles.approveButtonText}>承認</Text>
          )}
        </TouchableOpacity>

        {/* 拒否ボタン */}
        <TouchableOpacity
          testID="follow-request-reject"
          style={[styles.declineButton, isDeclining && styles.buttonLoading]}
          onPress={() => onDecline(requestId)}
          disabled={isAnyLoading}
          hitSlop={BUTTON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`${nickname} のフォローリクエストを拒否する`}
          accessibilityState={{ busy: isDeclining, disabled: isAnyLoading }}
        >
          {isDeclining ? (
            <ActivityIndicator
              size="small"
              color={colorTextSecondary}
              accessibilityElementsHidden
            />
          ) : (
            <Text style={styles.declineButtonText}>拒否</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export const FollowRequestListItem = React.memo(FollowRequestListItemBase);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    paddingVertical: spacing4,
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    backgroundColor: colorBackground,
  },
  avatarWrapper: {
    marginRight: spacing4,
  },
  info: {
    flex: 1,
    marginRight: spacing2,
  },
  nickname: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  bio: {
    ...textSm,
    color: colorTextTertiary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing2,
    flexShrink: 0,
  },
  approveButton: {
    height: BUTTON_HEIGHT,
    minWidth: BUTTON_MIN_WIDTH,
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  declineButton: {
    height: BUTTON_HEIGHT,
    minWidth: BUTTON_MIN_WIDTH,
    backgroundColor: colorBackground,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  approveButtonText: {
    ...textSm,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
  declineButtonText: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '600',
  },
});
