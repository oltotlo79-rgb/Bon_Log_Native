/**
 * @module components/user/FollowButton
 * フォローボタン。3状態（未フォロー/申請中/フォロー中）・pressIn フィードバック・
 * 未認証/オフライン/エラー対応・default/compact サイズを含む。
 * 仕様: docs/design/follow-and-engagement.md §2・§4・§6・§7・§8
 *
 * 設計の要点:
 * - props（キャッシュ由来）を受け取る「controlled」設計。
 *   楽観更新・ロールバックは useToggleFollowMutation が担う。
 *   コンポーネントはキャッシュへの書き込みを一切行わない。
 * - pressIn 中のみローカル state でプレスフィードバックを表示する。
 *   API 結果の反映は props 変化（キャッシュ更新）経由。
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useToggleFollowMutation } from '@/lib/queries/follows';
import { isApiError } from '@/lib/api/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/common/Toast';
import {
  colorActionPrimary,
  colorActionPrimaryText,
  colorBackground,
  colorBorder,
  colorError,
  colorErrorBg,
  colorTextPrimary,
  radiusMd,
  spacing2,
  spacing3,
  textBase,
} from '@/lib/constants/design-tokens';
import {
  ERR_FOLLOW_FAILED,
  ERR_RATE_LIMIT,
  ERR_USER_NOT_FOUND,
  ERR_FORBIDDEN,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';
import { ROUTE_LOGIN } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FOLLOW_BUTTON_MIN_WIDTH_DEFAULT = 120;
const FOLLOW_BUTTON_HEIGHT_DEFAULT = 44;
const FOLLOW_BUTTON_MIN_WIDTH_COMPACT = 80;
const FOLLOW_BUTTON_HEIGHT_COMPACT = 36;

// compact サイズではタップ領域を 44pt 以上確保する
const COMPACT_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 } as const;

const BORDER_WIDTH = 1.5;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type FollowButtonProps = {
  targetUserId: string;
  isPublic: boolean;
  following: boolean;
  requested: boolean;
  currentUserId: string | undefined;
  size?: 'default' | 'compact';
  /** アクセシビリティラベル用のニックネーム。未指定時は汎用文言を使う */
  targetNickname?: string;
};

// ---------------------------------------------------------------------------
// ラベル解決
// ---------------------------------------------------------------------------

type FollowState = 'notFollowing' | 'requested' | 'following';

function resolveFollowState(following: boolean, requested: boolean): FollowState {
  if (following) return 'following';
  if (requested) return 'requested';
  return 'notFollowing';
}

type LabelSet = { normal: string; pressIn: string };

function resolveLabels(
  state: FollowState,
  isCompact: boolean
): LabelSet {
  switch (state) {
    case 'notFollowing':
      return { normal: 'フォロー', pressIn: 'フォロー' };
    case 'requested':
      return {
        normal: '申請中',
        pressIn: isCompact ? '取消' : '申請を取り消す',
      };
    case 'following':
      return {
        normal: 'フォロー中',
        pressIn: isCompact ? '解除' : 'フォローを解除',
      };
  }
}

function resolveAccessibilityLabel(
  state: FollowState,
  targetNickname: string | undefined
): string {
  const name = targetNickname ?? 'このユーザー';
  switch (state) {
    case 'notFollowing':
      return `${name} をフォローする`;
    case 'requested':
      return `${name} へのフォローリクエストを取り消す`;
    case 'following':
      return `${name} のフォローを解除する`;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FollowButtonBase({
  targetUserId,
  isPublic,
  following,
  requested,
  currentUserId,
  size = 'default',
  targetNickname,
}: FollowButtonProps) {
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();
  const mutation = useToggleFollowMutation();

  // pressIn 中かどうかのローカル state（プレスフィードバックのみ）
  const [isPressedIn, setIsPressedIn] = useState(false);

  const isCompact = size === 'compact';
  const followState = resolveFollowState(following, requested);
  const labels = resolveLabels(followState, isCompact);
  const isLoading = mutation.isPending;

  // pressIn フィードバックは「解除/取消」予告が必要な状態のみ表示する
  const showPressInFeedback =
    isPressedIn && (followState === 'following' || followState === 'requested');

  const handlePress = useCallback(() => {
    if (currentUserId === undefined) {
      router.push(ROUTE_LOGIN);
      return;
    }

    if (!isOnline) {
      showToast(ERR_OFFLINE_ACTION, 'warning');
      return;
    }

    const isActive = following || requested;

    mutation.mutate(
      { userId: targetUserId, isActive, isPublic },
      {
        onError: (error) => {
          if (isApiError(error)) {
            if (error.code === 'RATE_LIMITED') {
              showToast(ERR_RATE_LIMIT, 'warning');
            } else if (error.code === 'NOT_FOUND') {
              showToast(ERR_USER_NOT_FOUND, 'error');
            } else if (
              error.code === 'GUEST_NOT_ALLOWED' ||
              error.code === 'ACCOUNT_SUSPENDED'
            ) {
              showToast(ERR_FORBIDDEN, 'error');
            } else {
              showToast(ERR_FOLLOW_FAILED, 'error');
            }
          } else {
            showToast(ERR_FOLLOW_FAILED, 'error');
          }
        },
      }
    );
  }, [
    currentUserId,
    isOnline,
    following,
    requested,
    mutation,
    targetUserId,
    isPublic,
    showToast,
  ]);

  const handlePressIn = useCallback(() => {
    setIsPressedIn(true);
  }, []);

  const handlePressOut = useCallback(() => {
    setIsPressedIn(false);
  }, []);

  const accessibilityLabel = resolveAccessibilityLabel(followState, targetNickname);

  // スタイル決定
  const containerStyle = [
    isCompact ? styles.containerCompact : styles.containerDefault,
    followState === 'notFollowing'
      ? styles.filled
      : showPressInFeedback
        ? styles.pressInWarning
        : styles.outlined,
    isLoading && styles.loading,
  ];

  const textStyle = [
    styles.label,
    followState === 'notFollowing'
      ? styles.labelFilled
      : showPressInFeedback
        ? styles.labelWarning
        : styles.labelOutlined,
  ];

  const displayLabel = showPressInFeedback ? labels.pressIn : labels.normal;

  // ActivityIndicator の色はテキスト色と揃える
  const spinnerColor =
    followState === 'notFollowing' ? colorActionPrimaryText : colorTextPrimary;

  return (
    <View>
      <Pressable
        style={containerStyle}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isLoading}
        hitSlop={isCompact ? COMPACT_HIT_SLOP : undefined}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy: isLoading, disabled: isLoading }}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={spinnerColor}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : (
          <Text style={textStyle} numberOfLines={1}>
            {displayLabel}
          </Text>
        )}
      </Pressable>
      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
    </View>
  );
}

export const FollowButton = React.memo(FollowButtonBase);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  containerDefault: {
    minWidth: FOLLOW_BUTTON_MIN_WIDTH_DEFAULT,
    height: FOLLOW_BUTTON_HEIGHT_DEFAULT,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing3,
  },
  containerCompact: {
    minWidth: FOLLOW_BUTTON_MIN_WIDTH_COMPACT,
    height: FOLLOW_BUTTON_HEIGHT_COMPACT,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing2,
  },
  filled: {
    backgroundColor: colorActionPrimary,
  },
  outlined: {
    backgroundColor: colorBackground,
    borderWidth: BORDER_WIDTH,
    borderColor: colorBorder,
  },
  pressInWarning: {
    backgroundColor: colorErrorBg,
    borderWidth: BORDER_WIDTH,
    borderColor: colorError,
  },
  loading: {
    opacity: 0.6,
  },
  label: {
    ...textBase,
    fontWeight: '600',
  },
  labelFilled: {
    color: colorActionPrimaryText,
  },
  labelOutlined: {
    color: colorTextPrimary,
  },
  labelWarning: {
    color: colorError,
  },
});
