/**
 * @module app/settings/blocked/index
 * ブロック中ユーザー一覧画面（ugc-safety.md §6.1）。
 * store-compliance.md 要件: ブロック解除導線をアプリ内に露出する。
 */

import React, { useCallback, useState } from 'react';
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
  useBlockedUsersQuery,
  useUnblockUserMutation,
  type UserMinimalWithBio,
} from '@/lib/queries/moderation';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { BlockedUserListItem } from '@/components/settings/BlockedUserListItem';
import { Toast } from '@/components/common/Toast';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { OfflineBanner } from '@/components/common/OfflineBanner';
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
  ERR_BLOCK_LIST_LOAD_FAILED,
  ERR_UNBLOCK_FAILED,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 画面本体
// ---------------------------------------------------------------------------

export default function SettingsBlockedScreen() {
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
  } = useBlockedUsersQuery();

  const unblockMutation = useUnblockUserMutation();
  const { toast, showToast, hideToast } = useToast();

  // 解除処理中のユーザー ID セット（複数同時 disabled 管理）
  const [unblockingIds, setUnblockingIds] = useState<Set<string>>(new Set());

  const blockedUsers = data?.pages.flatMap((page) => page.items) ?? [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage === true && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleUnblock = useCallback(
    (userId: string) => {
      if (isOffline) {
        showToast(ERR_OFFLINE_ACTION, 'error');
        return;
      }

      setUnblockingIds((prev) => new Set(prev).add(userId));

      unblockMutation.mutate(
        { userId },
        {
          onError: () => {
            showToast(ERR_UNBLOCK_FAILED, 'error');
          },
          onSettled: () => {
            setUnblockingIds((prev) => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
          },
        }
      );
    },
    [isOffline, unblockMutation, showToast]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<UserMinimalWithBio>) => (
      <BlockedUserListItem
        user={item}
        onUnblock={handleUnblock}
        isUnblocking={unblockingIds.has(item.id)}
      />
    ),
    [handleUnblock, unblockingIds]
  );

  const keyExtractor = useCallback((item: UserMinimalWithBio) => item.id, []);

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
            ブロックリスト
          </Text>
          <View style={styles.headerRight} />
        </View>
        <ScreenLoading variant="skeleton" skeletonCount={4} />
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // エラー状態（オフラインでキャッシュなし含む）
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
            ブロックリスト
          </Text>
          <View style={styles.headerRight} />
        </View>
        <ScreenError
          title="読み込めませんでした"
          description={isOfflineError ? ERR_OFFLINE_ACTION : ERR_BLOCK_LIST_LOAD_FAILED}
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
          ブロックリスト
        </Text>
        <View style={styles.headerRight} />
      </View>

      {blockedUsers.length === 0 ? (
        <ScreenEmpty
          iconName="person-remove-outline"
          title="ブロック中のユーザーはいません"
          description="ブロックしたユーザーがここに表示されます"
        />
      ) : (
        <FlatList
          data={blockedUsers}
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
            ) : !hasNextPage && blockedUsers.length > 0 ? (
              <Text style={styles.endText}>これ以上ありません</Text>
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
