/**
 * @module components/post/RepostButton
 * リポスト / 引用 の選択メニュー付きボタン。
 * タップでアクションシートを開き、「リポスト」か「引用」を選択できる。
 * Web: components/post/RepostButton.tsx の DropdownMenu 方式を Android/iOS 向けに ActionSheetIOS / Alert で再現する。
 * 未認証ユーザーはタップでログイン画面へ誘導する。
 * オフライン中はトーストのみ表示し API を呼ばない。
 */

import React, { useCallback } from 'react';
import { Pressable, Text, StyleSheet, View, ActionSheetIOS, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useToggleRepostMutation } from '@/lib/queries/posts';
import { isApiError } from '@/lib/api/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/common/Toast';
import {
  colorTextSecondary,
  colorSuccess,
  spacing1,
  spacing2,
  textSm,
} from '@/lib/constants/design-tokens';
import {
  ERR_RATE_LIMIT,
  ERR_OFFLINE_ACTION,
  ERR_GENERIC,
} from '@/lib/constants/errors';
import { ROUTE_LOGIN, routePostQuote } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ICON_SIZE = 20;
const ACTION_HIT_SLOP = { top: 12, bottom: 12, left: 8, right: 8 } as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type RepostButtonProps = {
  postId: string;
  isReposted: boolean;
  repostCount: number;
  currentUserId: string | undefined;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RepostButton({
  postId,
  isReposted,
  repostCount,
  currentUserId,
}: RepostButtonProps) {
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();
  const { mutate } = useToggleRepostMutation();

  const handleRepost = useCallback(() => {
    if (!isOnline) {
      showToast(ERR_OFFLINE_ACTION, 'warning');
      return;
    }

    mutate(
      { postId, reposted: isReposted },
      {
        onError: (error) => {
          if (isApiError(error) && error.code === 'RATE_LIMITED') {
            showToast(ERR_RATE_LIMIT, 'warning');
          } else {
            showToast(ERR_GENERIC, 'error');
          }
        },
      }
    );
  }, [isOnline, isReposted, postId, mutate, showToast]);

  const handleQuote = useCallback(() => {
    router.push(routePostQuote(postId));
  }, [postId]);

  const showMenu = useCallback(() => {
    if (currentUserId === undefined) {
      router.push(ROUTE_LOGIN);
      return;
    }

    const repostLabel = isReposted ? 'リポストを取り消す' : 'リポスト';

    // iOS は ActionSheetIOS、Android は Alert でメニューを再現する
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [repostLabel, '引用', 'キャンセル'],
          cancelButtonIndex: 2,
          // 取り消し操作は destructive スタイルにして視覚的に区別する
          destructiveButtonIndex: isReposted ? 0 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handleRepost();
          if (buttonIndex === 1) handleQuote();
        }
      );
    } else {
      Alert.alert('', '', [
        { text: repostLabel, onPress: handleRepost, style: isReposted ? 'destructive' : 'default' },
        { text: '引用', onPress: handleQuote },
        { text: 'キャンセル', style: 'cancel' },
      ]);
    }
  }, [currentUserId, isReposted, handleRepost, handleQuote]);

  const accessibilityLabel =
    currentUserId === undefined
      ? `ログインしてリポストする。現在 ${repostCount} 件`
      : isReposted
        ? `リポスト済み。現在 ${repostCount} 件。メニューを開く`
        : `リポストする。現在 ${repostCount} 件。メニューを開く`;

  return (
    <View>
      <Pressable
        style={styles.button}
        onPress={showMenu}
        hitSlop={ACTION_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: isReposted }}
      >
        <Ionicons
          name="repeat"
          size={ICON_SIZE}
          color={isReposted ? colorSuccess : colorTextSecondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        {repostCount > 0 && (
          <Text
            style={[
              styles.countText,
              isReposted && styles.countTextActive,
            ]}
          >
            {repostCount}
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

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
    minHeight: 44,
    paddingHorizontal: spacing2,
  },
  countText: {
    ...textSm,
    color: colorTextSecondary,
  },
  countTextActive: {
    color: colorSuccess,
  },
});
