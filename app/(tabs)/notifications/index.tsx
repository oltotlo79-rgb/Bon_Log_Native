/**
 * @module app/(tabs)/notifications/index
 * 通知一覧画面（notifications-screen.md §2 準拠）。
 * 既読化 API（PATCH /api/v1/notifications）は cfw Batch 2b 未実装のため no-op で実装する。
 */

import React, { useCallback } from 'react';
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
import { router } from 'expo-router';
import { useNotificationsQuery, useUnreadCountQuery, type NotificationItem as NotificationItemType } from '@/lib/queries/notifications';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { NotificationItem } from '@/components/notification/NotificationItem';
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
} from '@/lib/constants/errors';
import { routes } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 通知 type → 遷移先（notifications-screen.md §6.1 / PM 決定事項に従う）
// ---------------------------------------------------------------------------

function resolveNotificationRoute(notification: NotificationItemType): string | null {
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
    case 'follow_request':
    case 'follow_request_approved':
      return actorId !== null ? routes.userDetail(actorId) : null;
    case 'message':
    case 'subscription_expiring':
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

  const notifications = data?.pages.flatMap((page) => page.items) ?? [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage === true && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleNotificationPress = useCallback((notification: NotificationItemType) => {
    const route = resolveNotificationRoute(notification);
    if (route !== null) {
      router.push(route as Parameters<typeof router.push>[0]);
    }
    // onMarkRead は cfw Batch 2b 接続後に実装する（no-op）
  }, []);

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
      onMarkRead={() => {
        // cfw Batch 2b 接続後に既読化 API を呼び出す（現時点は no-op）
      }}
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
            onPress={() => {
              // cfw Batch 2b 接続後に markAllAsRead を呼び出す（現時点は no-op）
            }}
          >
            <Text style={styles.markAllReadText}>すべて既読にする</Text>
          </Pressable>
        )}
      </View>

      {/* 通知リスト */}
      {notifications.length === 0 ? (
        <ScreenEmpty
          iconName="notifications-outline"
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
