/**
 * @module app/follow-requests/index
 * フォローリクエスト管理画面（follow-requests.md §2 準拠）。
 * store-compliance.md 要件: UGC 管理導線をアプリ内に露出する。
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  type ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFollowRequestsQuery,
  useApproveFollowRequestMutation,
  useRejectFollowRequestMutation,
  type FollowRequestItem,
} from '@/lib/queries/follows';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { FollowRequestListItem } from '@/components/follows/FollowRequestListItem';
import { Toast } from '@/components/common/Toast';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { isApiError } from '@/lib/api/errors';
import { routeUserDetail } from '@/lib/constants/routes';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  spacing2,
  spacing4,
  textBase,
  textLg,
  textSm,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import {
  ERR_FOLLOW_REQUESTS_LOAD_FAILED,
  ERR_FOLLOW_REQUEST_APPROVE_FAILED,
  ERR_FOLLOW_REQUEST_REJECT_FAILED,
  ERR_OFFLINE_ACTION,
  ERR_RATE_LIMIT,
  ERR_NOT_FOUND,
  ERR_AUTH_REQUIRED,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 画面本体
// ---------------------------------------------------------------------------

export default function FollowRequestsScreen() {
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;

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
  } = useFollowRequestsQuery();

  const approveMutation = useApproveFollowRequestMutation();
  const rejectMutation = useRejectFollowRequestMutation();
  const { toast, showToast, hideToast } = useToast();

  // 承認処理中のリクエスト ID セット
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  // 拒否処理中のリクエスト ID セット
  const [decliningIds, setDecliningIds] = useState<Set<string>>(new Set());

  const requests = useMemo(
    () => data?.pages.flatMap((page) => page.requests) ?? [],
    [data]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage === true && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleApprove = useCallback(
    (requestId: string) => {
      if (isOffline) {
        showToast(ERR_OFFLINE_ACTION, 'error');
        return;
      }

      const request = requests.find((r) => r.id === requestId);
      if (request === undefined) return;

      setApprovingIds((prev) => new Set(prev).add(requestId));

      approveMutation.mutate(
        { requestId, requesterId: request.requester.id },
        {
          onSuccess: () => {
            showToast(`@${request.requester.nickname} のフォローリクエストを承認しました`, 'default');
          },
          onError: (err) => {
            const message = resolveApproveErrorMessage(err);
            showToast(message, 'error');
          },
          onSettled: () => {
            setApprovingIds((prev) => {
              const next = new Set(prev);
              next.delete(requestId);
              return next;
            });
          },
        }
      );
    },
    [isOffline, approveMutation, showToast, requests]
  );

  const handleDecline = useCallback(
    (requestId: string) => {
      if (isOffline) {
        showToast(ERR_OFFLINE_ACTION, 'error');
        return;
      }

      const request = requests.find((r) => r.id === requestId);
      if (request === undefined) return;

      setDecliningIds((prev) => new Set(prev).add(requestId));

      rejectMutation.mutate(
        { requestId },
        {
          onSuccess: () => {
            showToast(`@${request.requester.nickname} のフォローリクエストを拒否しました`, 'default');
          },
          onError: (err) => {
            const message = resolveDeclineErrorMessage(err);
            showToast(message, 'error');
          },
          onSettled: () => {
            setDecliningIds((prev) => {
              const next = new Set(prev);
              next.delete(requestId);
              return next;
            });
          },
        }
      );
    },
    [isOffline, rejectMutation, showToast, requests]
  );

  const handlePressUser = useCallback((requesterId: string) => {
    router.push(routeUserDetail(requesterId));
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FollowRequestItem>) => (
      <FollowRequestListItem
        request={item}
        onApprove={handleApprove}
        onDecline={handleDecline}
        isApproving={approvingIds.has(item.id)}
        isDeclining={decliningIds.has(item.id)}
        onPressUser={handlePressUser}
      />
    ),
    [handleApprove, handleDecline, approvingIds, decliningIds, handlePressUser]
  );

  const keyExtractor = useCallback((item: FollowRequestItem) => item.id, []);

  // ---------------------------------------------------------------------------
  // ローディング状態
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="戻る"
          >
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole="header">
            フォローリクエスト
          </Text>
          <View style={styles.headerRight} />
        </View>
        <ScreenLoading variant="skeleton" skeletonCount={4} />
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // エラー状態
  // ---------------------------------------------------------------------------

  if (isError) {
    const isOfflineError = isOffline && data === undefined;
    const debugMsg = error instanceof Error ? error.message : undefined;
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <OfflineBanner isVisible={isOffline} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="戻る"
          >
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole="header">
            フォローリクエスト
          </Text>
          <View style={styles.headerRight} />
        </View>
        <ScreenError
          title="読み込めませんでした"
          description={isOfflineError ? ERR_OFFLINE_ACTION : ERR_FOLLOW_REQUESTS_LOAD_FAILED}
          onRetry={() => void refetch()}
          debugMessage={debugMsg}
        />
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // 正常状態
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={isOffline} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          フォローリクエスト
        </Text>
        <View style={styles.headerRight} />
      </View>

      {requests.length === 0 ? (
        <ScreenEmpty
          iconName="person-add-outline"
          title="承認待ちのフォローリクエストはありません"
          description="フォローリクエストが届くとここに表示されます"
        />
      ) : (
        <FlatList
          data={requests}
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
              colors={[colorActionPrimary]}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator
                  size="small"
                  color={colorActionPrimary}
                  accessibilityLabel="読み込み中"
                />
                <Text style={styles.footerText}>読み込み中...</Text>
              </View>
            ) : !hasNextPage && requests.length > 0 ? (
              <Text
                style={styles.endText}
                accessibilityRole="text"
              >
                これ以上リクエストはありません
              </Text>
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
// エラーメッセージ解決
// ---------------------------------------------------------------------------

function resolveApproveErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    if (err.code === 'NOT_FOUND') return ERR_NOT_FOUND;
    if (err.code === 'GUEST_NOT_ALLOWED') return ERR_AUTH_REQUIRED;
    if (err.code === 'RATE_LIMITED') return ERR_RATE_LIMIT;
  }
  return ERR_FOLLOW_REQUEST_APPROVE_FAILED;
}

function resolveDeclineErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    if (err.code === 'NOT_FOUND') return ERR_NOT_FOUND;
    if (err.code === 'GUEST_NOT_ALLOWED') return ERR_AUTH_REQUIRED;
    if (err.code === 'RATE_LIMITED') return ERR_RATE_LIMIT;
  }
  return ERR_FOLLOW_REQUEST_REJECT_FAILED;
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
    paddingHorizontal: spacing4,
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    ...textBase,
    color: colorTextPrimary,
  },
  headerRight: {
    minWidth: 44,
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
