/**
 * @module app/(tabs)/notifications/index
 * 通知一覧画面（notifications-screen.md §2 準拠）。
 * 既読化方式: 画面マウント時に自動全件既読化（§8.2）＋「すべて既読にする」ボタン（§8.3）。
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { useNotificationsQuery, useUnreadCountQuery, useMarkNotificationsReadMutation, type NotificationItem as NotificationItemType } from '@/lib/queries/notifications';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { NotificationItem } from '@/components/notification/NotificationItem';
import { Toast } from '@/components/common/Toast';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { isApiError } from '@/lib/api/errors';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  colorBorderLight,
  colorActionPrimary,
  spacing2,
  spacing4,
  textLg,
  textSm,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import {
  ERR_NOTIFICATIONS_LOAD_FAILED,
  ERR_AUTH_REQUIRED,
  ERR_NOTIFICATION_READ_FAILED,
} from '@/lib/constants/errors';
import { routes } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 通知 type → 遷移先（notifications-screen.md §6.1 / PM 決定事項に従う）
// ---------------------------------------------------------------------------

function resolveNotificationRoute(notification: NotificationItemType): Href | null {
  const { type, postId, actorId } = notification;

  switch (type) {
    case 'like':
    case 'comment_like':
    case 'comment':
    case 'reply':
    case 'quote':
    case 'repost':
    case 'mention':
      return postId !== null ? routes.postDetail(postId) : null;
    case 'follow':
    case 'follow_request_approved':
      return actorId !== null ? routes.userDetail(actorId) : null;
    case 'follow_request':
      return routes.followRequests;
    case 'subscription_expiring':
      // notifications-screen.md §6.1 PM 決定: サブスクリプション設定画面へ遷移
      return routes.settingsSubscription;
    case 'message':
    case 'system':
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 画面本体
// ---------------------------------------------------------------------------

export default function NotificationsScreen() {
  const isOffline = !useOnlineStatus();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useNotificationsQuery();

  const { data: unreadCountData } = useUnreadCountQuery();
  const unreadCount = unreadCountData?.count ?? 0;

  const markRead = useMarkNotificationsReadMutation();

  const { toast, showToast, hideToast } = useToast();

  // 自動全件既読化の多重発火防止フラグ（マウント後に一度だけ実行する）
  const autoMarkReadCalledRef = useRef(false);

  const notifications = data?.pages.flatMap((page) => page.items) ?? [];

  // §8.2: 画面マウント時、データ取得完了かつ未読がある場合のみ全件既読化を一度だけ呼ぶ。
  // 失敗時はサイレント（トーストなし・未読スタイル維持）。
  useEffect(() => {
    if (autoMarkReadCalledRef.current) return;
    if (data === undefined) return;
    if (unreadCount <= 0) return;

    autoMarkReadCalledRef.current = true;
    markRead.mutate({});
  // markRead.mutate は useMutation の安定参照のため依存配列には含めない
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, unreadCount]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage === true && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleNotificationPress = useCallback((notification: NotificationItemType) => {
    const route = resolveNotificationRoute(notification);
    if (route !== null) {
      router.push(route);
    }
  }, []);

  // §8.3: 「すべて既読にする」ボタン。失敗時のみトーストを表示する。
  const handleMarkAllRead = useCallback(() => {
    markRead.mutate(
      {},
      {
        onError: () => {
          showToast(ERR_NOTIFICATION_READ_FAILED, 'error');
        },
      }
    );
  }, [markRead, showToast]);

  // ゲスト 403 のハンドリング（通常は AuthGuard 済みで到達しないが念のため）
  if (isError && isApiError(error) && error.code === 'GUEST_NOT_ALLOWED') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">通知</Text>
        </View>
        <ScreenError
          title="通知を表示するにはログインが必要です"
          description={ERR_AUTH_REQUIRED}
          onRetry={() => void refetch()}
          subLinkLabel="ログインする"
          onSubLink={() => router.replace(routes.login)}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">通知</Text>
        </View>
        <ScreenLoading variant="skeleton" skeletonCount={4} />
      </SafeAreaView>
    );
  }

  if (isError) {
    const debugMsg = error instanceof Error ? error.message : undefined;
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">通知</Text>
        </View>
        <ScreenError
          title="読み込めませんでした"
          description={ERR_NOTIFICATIONS_LOAD_FAILED}
          onRetry={() => void refetch()}
          debugMessage={debugMsg}
        />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: ListRenderItemInfo<NotificationItemType>) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
    />
  );

  const keyExtractor = (item: NotificationItemType) => item.id;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={isOffline} />

      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">通知</Text>
        {unreadCount > 0 && (
          <Pressable
            style={styles.markAllReadButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="すべての通知を既読にする"
            disabled={markRead.isPending}
            onPress={handleMarkAllRead}
          >
            <Text style={[styles.markAllReadText, markRead.isPending && styles.markAllReadTextDisabled]}>
              すべて既読にする
            </Text>
          </Pressable>
        )}
      </View>

      {/* 通知リスト */}
      {notifications.length === 0 ? (
        <ScreenEmpty
          variant="notification"
          title="まだ通知はありません"
          description="いいねやコメントが届くとここに表示されます"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          onEndReachedThreshold={0.3}
          onEndReached={handleLoadMore}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={() => void refetch()}
              tintColor={colorActionPrimary}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colorActionPrimary} />
                <Text style={styles.footerText}>読み込み中...</Text>
              </View>
            ) : !hasNextPage && notifications.length > 0 ? (
              <Text style={styles.endText}>これ以上通知はありません</Text>
            ) : null
          }
        />
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  header: {
    height: 48,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  markAllReadButton: {
    position: 'absolute',
    right: spacing4,
    height: 44,
    justifyContent: 'center',
  },
  markAllReadText: {
    ...textSm,
    color: colorTextLink,
  },
  markAllReadTextDisabled: {
    opacity: 0.4,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing4,
    gap: spacing2,
  },
  footerText: {
    ...textSm,
    color: colorTextSecondary,
  },
  endText: {
    ...textSm,
    color: colorTextSecondary,
    textAlign: 'center',
    paddingVertical: spacing4,
  },
});
