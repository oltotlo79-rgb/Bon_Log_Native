/**
 * @module app/scheduled-posts/index
 * 予約投稿一覧画面（プレミアム限定）。
 * 非プレミアムユーザーはロック画面へリダイレクトする。
 * Web 版 components/post/ScheduledPostList.tsx と同じ 予約中/公開済み/その他 タブ構成に準拠する。
 * 仕様: docs/design/scheduled-posts.md §3
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { routeScheduledPostDetail } from '@/lib/constants/routes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useScheduledPostsQuery, type ScheduledPostItem } from '@/lib/queries/scheduled-posts';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { isApiError } from '@/lib/api/client';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { CatalogTabs } from '@/components/browse/CatalogTabs';
import {
  colorBackground,
  colorSurfaceWashi,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorSuccess,
  colorSuccessBg,
  colorError,
  colorErrorBg,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusFull,
  radiusSm,
  radiusLg,
  shadowWashi,
  textBase,
  textSm,
  textXs,
  textLg,
} from '@/lib/constants/design-tokens';
import {
  ERR_SCHEDULED_POSTS_LOAD_FAILED,
  ERR_PREMIUM_ONLY,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FAB_SIZE = 56;
const FAB_ICON_SIZE = 24;
const PENDING_LIMIT = 10;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type ScheduledPostStatus = 'pending' | 'published' | 'failed' | 'cancelled';

// Web 版 ScheduledPostList.tsx の Tabs 構成（予約中/公開済み/その他）に対応
type ScheduledPostsTab = 'pending' | 'published' | 'other';

const TAB_LABEL: Record<ScheduledPostsTab, string> = {
  pending: '予約中',
  published: '公開済み',
  other: 'その他',
};

const TAB_EMPTY_TITLE: Record<ScheduledPostsTab, string> = {
  pending: '予約中の投稿はありません',
  published: '公開済みの予約投稿はありません',
  other: '失敗・キャンセルされた投稿はありません',
};

function isScheduledPostsTab(value: string): value is ScheduledPostsTab {
  return value === 'pending' || value === 'published' || value === 'other';
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

type StatusBadgeProps = {
  status: ScheduledPostStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_BADGE_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text
        style={[styles.badgeText, { color: config.color }]}
        accessibilityRole="text"
        accessibilityLabel={config.label}
      >
        {config.label}
      </Text>
    </View>
  );
}

const STATUS_BADGE_CONFIG: Record<
  ScheduledPostStatus,
  { label: string; bg: string; color: string }
> = {
  pending: { label: '予約中', bg: colorSurfaceMuted, color: colorTextPrimary },
  published: { label: '公開済み', bg: colorSuccessBg, color: colorSuccess },
  failed: { label: '失敗', bg: colorErrorBg, color: colorError },
  cancelled: { label: 'キャンセル済み', bg: colorSurfaceMuted, color: colorTextSecondary },
};

// ---------------------------------------------------------------------------
// ScheduledPostCard
// ---------------------------------------------------------------------------

type ScheduledPostCardProps = {
  item: ScheduledPostItem;
};

function isKnownStatus(s: string): s is ScheduledPostStatus {
  return ['pending', 'published', 'failed', 'cancelled'].includes(s);
}

function ScheduledPostCardInner({ item }: ScheduledPostCardProps) {
  const dateStr = formatScheduledAt(item.scheduledAt);
  const preview = (item.content ?? '').slice(0, 80);
  const status: ScheduledPostStatus = isKnownStatus(item.status) ? item.status : 'pending';
  const a11yLabel = `${STATUS_BADGE_CONFIG[status].label}、${dateStr}、${preview}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(routeScheduledPostDetail(item.id))}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.cardTop}>
        <StatusBadge status={status} />
        <Text style={styles.scheduledAt}>{dateStr}</Text>
      </View>
      {preview.length > 0 && (
        <Text style={styles.preview} numberOfLines={2}>
          {preview}
        </Text>
      )}
    </Pressable>
  );
}

const ScheduledPostCard = React.memo(ScheduledPostCardInner);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScheduledPostsScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<ScheduledPostsTab>('pending');

  const { data: currentUser, isLoading: isUserLoading } = useCurrentUserQuery();

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
  } = useScheduledPostsQuery();

  const isPremiumRequired =
    isError && isApiError(error) && error.code === 'PREMIUM_REQUIRED';

  // 非プレミアム判定をユーザー情報からも行う（一覧取得より先に判定）
  React.useEffect(() => {
    if (!isUserLoading && currentUser !== undefined && !currentUser.isPremium) {
      router.replace('/scheduled-posts/locked');
    }
  }, [isUserLoading, currentUser]);

  const allItems: ScheduledPostItem[] =
    data?.pages.flatMap((page) => page.items) ?? [];

  // 予約投稿は件数が少ないため、タブ切替をクライアント側で行えるよう
  // 次ページが存在する間は自動取得して全件を確保する（イベントカレンダーと同じ方式）。
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const pendingItems = allItems.filter((item) => item.status === 'pending');
  const publishedItems = allItems.filter((item) => item.status === 'published');
  const otherItems = allItems.filter(
    (item) => item.status === 'failed' || item.status === 'cancelled'
  );

  const tabItems: Record<ScheduledPostsTab, ScheduledPostItem[]> = {
    pending: pendingItems,
    published: publishedItems,
    other: otherItems,
  };

  const displayedItems = tabItems[activeTab];

  const tabs = (['pending', 'published', 'other'] as const).map((tab) => ({
    key: tab,
    label: `${TAB_LABEL[tab]} (${tabItems[tab].length})`,
  }));

  const pendingCount = pendingItems.length;
  const isFabDisabled = pendingCount >= PENDING_LIMIT;

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((item: ScheduledPostItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ScheduledPostItem }) => <ScheduledPostCard item={item} />,
    []
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  if (isUserLoading || isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScheduledPostsHeader />
        <ScreenLoading variant="skeleton" />
      </View>
    );
  }

  if (isPremiumRequired) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScheduledPostsHeader />
        <ScreenError
          title="プレミアム機能です"
          description={ERR_PREMIUM_ONLY}
          onRetry={() => router.replace('/scheduled-posts/locked')}
          retryLabel="アップグレードする"
        />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScheduledPostsHeader />
        <ScreenError
          title="読み込めませんでした"
          description={ERR_SCHEDULED_POSTS_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />

      <ScheduledPostsHeader />

      <CatalogTabs
        tabs={tabs}
        activeKey={activeTab}
        onChange={(key) => {
          if (isScheduledPostsTab(key)) {
            setActiveTab(key);
          }
        }}
      />

      {displayedItems.length === 0 ? (
        <ScreenEmpty
          iconName="calendar-outline"
          title={TAB_EMPTY_TITLE[activeTab]}
          description={activeTab === 'pending' ? '右下のボタンから投稿を予約してみましょう。' : undefined}
        />
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + FAB_SIZE + spacing6 * 2 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={handleRefresh}
              tintColor={colorActionPrimary}
            />
          }
          accessibilityRole="list"
        />
      )}

      {/* FAB */}
      <Pressable
        style={[
          styles.fab,
          { bottom: insets.bottom + spacing4 },
          isFabDisabled && styles.fabDisabled,
        ]}
        onPress={() => {
          if (!isFabDisabled) {
            router.push('/scheduled-posts/new');
          }
        }}
        disabled={isFabDisabled}
        accessibilityRole="button"
        accessibilityLabel="予約投稿を作成する"
        accessibilityState={{ disabled: isFabDisabled }}
        accessibilityHint={isFabDisabled ? '保留中の予約投稿が上限の10件に達しています。' : undefined}
      >
        <Ionicons
          name="add"
          size={FAB_ICON_SIZE}
          color={colorActionPrimaryText}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ヘッダー
// ---------------------------------------------------------------------------

function ScheduledPostsHeader() {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="戻る"
        style={styles.headerButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backText}>‹ 戻る</Text>
      </Pressable>
      <Text style={styles.headerTitle}>予約投稿</Text>
      <View style={styles.headerRight} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function formatScheduledAt(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingHorizontal: spacing4,
    minHeight: 44,
  },
  headerButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: colorTextSecondary,
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...textLg,
    color: colorTextPrimary,
  },
  headerRight: {
    minWidth: 60,
  },
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing3,
  },
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
    marginBottom: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    ...shadowWashi,
    gap: spacing2,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  badge: {
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  badgeText: {
    ...textXs,
    fontWeight: '600',
  },
  scheduledAt: {
    ...textSm,
    color: colorTextSecondary,
  },
  preview: {
    ...textBase,
    color: colorTextPrimary,
  },
  footer: {
    paddingVertical: spacing4,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing4,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowWashi,
  },
  fabDisabled: {
    opacity: 0.4,
  },
});
