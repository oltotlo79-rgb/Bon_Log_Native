/**
 * @module app/shops/[id]/reviews/index
 * 盆栽園レビュー一覧画面。FAB でレビュー投稿（未投稿ユーザーのみ）。
 * 仕様: docs/design/shops.md §5
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { routeShopReviewNew } from '@/lib/constants/routes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useShopDetailQuery, useShopReviewsQuery } from '@/lib/queries/shops';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorWarning,
  colorActionPrimary,
  colorActionPrimaryText,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusFull,
  radiusLg,
  shadowWashi,
  textBase,
  textSm,
  textXs,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FAB_SIZE = 56;
const FAB_ICON_SIZE = 24;
const STAR_SIZE = 14;

// ---------------------------------------------------------------------------
// 型ガード
// ---------------------------------------------------------------------------

function getIdParam(params: Record<string, string | string[] | undefined>): string {
  const id = params['id'];
  if (typeof id === 'string' && id.length > 0) return id;
  return '';
}

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type ReviewListItem = {
  id: string;
  rating: number;
  content: string | null;
  images: { url: string }[];
  user: { id: string; nickname: string; avatarUrl: string | null };
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShopReviewsScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams<{ id: string }>();
  const shopId = getIdParam(params);

  const { data: shop } = useShopDetailQuery(shopId);
  const { data: currentUser } = useCurrentUserQuery();

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useShopReviewsQuery(shopId);

  const allItems: ReviewListItem[] = data?.pages.flatMap((page) => page.items) ?? [];
  const isLoggedIn = currentUser !== undefined;
  const averageRating = shop?.averageRating;
  const reviewCount = shop?.reviewCount ?? 0;

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ReviewListItem }) => <ReviewItem review={item} />,
    []
  );

  const keyExtractor = useCallback((item: ReviewListItem) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ReviewsHeader />
        <ScreenLoading variant="skeleton" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ReviewsHeader />
        <ScreenError title="読み込めませんでした" onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />
      <ReviewsHeader />

      {allItems.length === 0 ? (
        <ScreenEmpty
          iconName="star-outline"
          title="まだレビューはありません"
          description="最初のレビューを書いてみましょう。"
        />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            averageRating !== undefined && averageRating !== null ? (
              <ReviewSummaryHeader
                averageRating={averageRating}
                reviewCount={reviewCount}
              />
            ) : null
          }
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

      {/* FAB（ログイン済みユーザーのみ） */}
      {isLoggedIn && (
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + spacing4 }]}
          onPress={() => router.push(routeShopReviewNew(shopId))}
          accessibilityRole="button"
          accessibilityLabel="レビューを書く"
        >
          <Ionicons
            name="create-outline"
            size={FAB_ICON_SIZE}
            color={colorActionPrimaryText}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ReviewsHeader
// ---------------------------------------------------------------------------

function ReviewsHeader() {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="戻る"
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backButtonText}>‹ 戻る</Text>
      </Pressable>
      <Text style={styles.headerTitle}>レビュー</Text>
      <View style={styles.headerRight} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// ReviewSummaryHeader
// ---------------------------------------------------------------------------

type ReviewSummaryHeaderProps = {
  averageRating: number;
  reviewCount: number;
};

function ReviewSummaryHeader({ averageRating, reviewCount }: ReviewSummaryHeaderProps) {
  return (
    <View
      style={styles.summaryHeader}
      accessibilityLabel={`平均評価 ${averageRating.toFixed(1)} 点 / 5点。${reviewCount} 件のレビュー。`}
    >
      <Text style={styles.summaryRating}>{averageRating.toFixed(1)}</Text>
      <StarDisplay rating={averageRating} />
      <Text style={styles.summaryCount}>{reviewCount}件のレビュー</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ReviewItem
// ---------------------------------------------------------------------------

type ReviewItemProps = {
  review: ReviewListItem;
};

function ReviewItemInner({ review }: ReviewItemProps) {
  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{review.user.nickname}</Text>
        <StarDisplay rating={review.rating} />
        <Text style={styles.reviewDate}>{formatRelativeTime(review.createdAt)}</Text>
      </View>
      {review.content !== null && review.content.length > 0 && (
        <Text style={styles.reviewContent}>{review.content}</Text>
      )}
    </View>
  );
}

const ReviewItem = React.memo(ReviewItemInner);

// ---------------------------------------------------------------------------
// StarDisplay
// ---------------------------------------------------------------------------

type StarDisplayProps = {
  rating: number;
};

function StarDisplay({ rating }: StarDisplayProps) {
  return (
    <View style={styles.stars} accessibilityElementsHidden importantForAccessibility="no">
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={[styles.star, i <= Math.round(rating) ? styles.starFilled : styles.starEmpty]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
  return `${Math.floor(diffDays / 365)}年前`;
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
  backButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
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
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  summaryRating: {
    ...textLg,
    color: colorTextPrimary,
  },
  stars: {
    flexDirection: 'row',
  },
  star: {
    fontSize: STAR_SIZE,
  },
  starFilled: {
    color: colorWarning,
  },
  starEmpty: {
    color: colorTextSecondary,
  },
  summaryCount: {
    ...textSm,
    color: colorTextSecondary,
  },
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing3,
  },
  footer: {
    paddingVertical: spacing4,
    alignItems: 'center',
  },
  reviewItem: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    gap: spacing2,
    marginBottom: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    ...shadowWashi,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    flexWrap: 'wrap',
  },
  reviewerName: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  reviewDate: {
    ...textXs,
    color: colorTextTertiary,
    marginLeft: 'auto',
  },
  reviewContent: {
    ...textBase,
    color: colorTextPrimary,
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
});
