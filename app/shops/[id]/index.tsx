/**
 * @module app/shops/[id]/index
 * 盆栽園詳細画面。地図アプリリンク・レビュープレビュー・owner のみ編集メニュー。
 * 仕様: docs/design/shops.md §3
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Sentry from '@sentry/react-native';
import { useShopDetailQuery, useShopReviewsQuery } from '@/lib/queries/shops';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { BonsaiMapView } from '@/components/shops/BonsaiMapView';
import { ReportDialog } from '@/components/report/ReportDialog';
import { REPORT_TARGET_LABELS } from '@/lib/constants/report';
import {
  colorBackground,
  colorSurfaceWashi,
  colorSurface,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorWarning,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusLg,
  shadowWashi,
  textBase,
  textSm,
  textXs,
  textLg,
  textXl,
} from '@/lib/constants/design-tokens';
import { routeShopEdit, routeShopReviews, routeShopReviewNew } from '@/lib/constants/routes';
import { ERR_NOT_FOUND, ERR_FORBIDDEN } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ICON_SIZE = 18;
const STAR_SIZE = 14;
const PREVIEW_REVIEW_COUNT = 3;

// ---------------------------------------------------------------------------
// 型ガード
// ---------------------------------------------------------------------------

function getIdParam(params: Record<string, string | string[] | undefined>): string {
  const id = params['id'];
  if (typeof id === 'string' && id.length > 0) return id;
  return '';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShopDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams<{ id: string }>();
  const shopId = getIdParam(params);

  const { data: shop, isLoading, isError, error, refetch } = useShopDetailQuery(shopId);
  const { data: reviewsData } = useShopReviewsQuery(shopId);
  const { data: currentUser } = useCurrentUserQuery();
  const [showReportDialog, setShowReportDialog] = useState(false);

  const isOwner = shop?.isOwner === true;
  // オーナー以外のログイン済みユーザーのみ通報導線を出す（自分の店舗は通報対象外）
  const canReportShop = currentUser !== undefined && !isOwner;
  const previewReviews = reviewsData?.pages.flatMap((p) => p.items).slice(0, PREVIEW_REVIEW_COUNT) ?? [];
  const reviewCount = shop?.reviewCount ?? 0;
  const averageRating = shop?.averageRating;

  const handleOpenMenu = useCallback(() => {
    Alert.alert(
      '店舗メニュー',
      undefined,
      [
        { text: '店舗情報を編集する', onPress: () => router.push(routeShopEdit(shopId)) },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  }, [shopId]);

  const handleOpenReportMenu = useCallback(() => {
    Alert.alert(
      `この${REPORT_TARGET_LABELS.shop}を通報しますか？`,
      undefined,
      [
        { text: '通報する', style: 'destructive', onPress: () => setShowReportDialog(true) },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  }, []);

  const handleOpenMapApp = useCallback(async (lat: number, lng: number, name: string) => {
    const url = Platform.OS === 'ios'
      ? `maps://?q=${encodeURIComponent(name)}&ll=${lat},${lng}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        const mapsUrl = `https://maps.google.com/maps?q=${lat},${lng}`;
        await Linking.openURL(mapsUrl);
      }
    } catch (err) {
      Sentry.captureException(err);
    }
  }, []);

  const handleOpenWebsite = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Sentry.captureException(err);
    }
  }, []);

  const handlePhoneCall = useCallback(async (phone: string) => {
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (err) {
      Sentry.captureException(err);
    }
  }, []);

  if (shopId.length === 0 || (isError && isNotFoundError(error))) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ShopDetailHeader title="盆栽園詳細" onMenuPress={undefined} />
        <ScreenError title="店舗が見つかりません" description={ERR_NOT_FOUND} onRetry={() => router.back()} retryLabel="戻る" />
      </View>
    );
  }

  if (isError && isForbiddenError(error)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ShopDetailHeader title="盆栽園詳細" onMenuPress={undefined} />
        <ScreenError title="閲覧できません" description={ERR_FORBIDDEN} onRetry={() => router.back()} retryLabel="戻る" />
      </View>
    );
  }

  if (isLoading || shop === undefined) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ShopDetailHeader title="盆栽園詳細" onMenuPress={undefined} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ShopDetailHeader title={shop.name} onMenuPress={undefined} />
        <ScreenError title="読み込めませんでした" onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />

      <ShopDetailHeader
        title={shop.name}
        onMenuPress={isOwner ? handleOpenMenu : (canReportShop ? handleOpenReportMenu : undefined)}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing8 }]}
      >
        {/* 店舗基本情報 */}
        <Text style={styles.shopName}>{shop.name}</Text>
        {shop.genres.length > 0 && (
          <Text style={styles.genres}>{shop.genres.map((g) => g.name).join(' / ')}</Text>
        )}
        {averageRating !== undefined && averageRating !== null && (
          <View style={styles.ratingRow} accessibilityLabel={`評価 ${averageRating.toFixed(1)} 点 / 5点。${reviewCount} 件のレビュー。`}>
            <StarDisplay rating={averageRating} />
            <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
            <Pressable
              onPress={() => router.push(routeShopReviews(shopId))}
              accessibilityRole="link"
              accessibilityLabel={`レビュー ${reviewCount} 件を見る`}
            >
              <Text style={styles.reviewCountLink}>{reviewCount}件のレビュー</Text>
            </Pressable>
          </View>
        )}

        {/* 店舗情報リスト */}
        <View style={styles.infoSection}>
          <ShopInfoRow iconName="location-outline" text={shop.address} />

          {shop.latitude !== null && shop.longitude !== null && (
            <Pressable
              style={({ pressed }) => [styles.infoRow, pressed && styles.infoRowPressed]}
              onPress={() => void handleOpenMapApp(shop.latitude!, shop.longitude!, shop.name)}
              accessibilityRole="link"
              accessibilityLabel="地図アプリで開く"
            >
              <Ionicons
                name="map-outline"
                size={ICON_SIZE}
                color={colorTextSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.linkText}>地図アプリで開く</Text>
            </Pressable>
          )}

          {shop.phone !== null && (
            <Pressable
              style={({ pressed }) => [styles.infoRow, pressed && styles.infoRowPressed]}
              onPress={() => void handlePhoneCall(shop.phone!)}
              accessibilityRole="link"
              accessibilityLabel={`電話をかける ${shop.phone}`}
            >
              <Ionicons
                name="call-outline"
                size={ICON_SIZE}
                color={colorTextSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.linkText}>{shop.phone}</Text>
            </Pressable>
          )}

          {shop.website !== null && (
            <Pressable
              style={({ pressed }) => [styles.infoRow, pressed && styles.infoRowPressed]}
              onPress={() => void handleOpenWebsite(shop.website!)}
              accessibilityRole="link"
              accessibilityLabel="公式サイトを開く（外部リンク）"
            >
              <Ionicons
                name="globe-outline"
                size={ICON_SIZE}
                color={colorTextSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.linkText}>公式サイトを見る</Text>
            </Pressable>
          )}

          {shop.businessHours !== null && (
            <ShopInfoRow iconName="time-outline" text={shop.businessHours} />
          )}

          {shop.closedDays !== null && (
            <ShopInfoRow iconName="close-circle-outline" text={`定休日: ${shop.closedDays}`} />
          )}
        </View>

        {/* 該当店舗マーカー付きの小地図（Web の MapWrapperSmall に相当） */}
        {shop.latitude !== null && shop.longitude !== null && (
          <View style={styles.mapSection}>
            <BonsaiMapView
              shops={[
                {
                  id: shop.id,
                  name: shop.name,
                  latitude: shop.latitude,
                  longitude: shop.longitude,
                  address: shop.address,
                  averageRating: shop.averageRating,
                  reviewCount: shop.reviewCount,
                },
              ]}
              isOnline={isOnline}
            />
          </View>
        )}

        {/* レビューセクション */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.reviewsTitle}>レビュー</Text>
            {currentUser !== undefined && (
              <Pressable
                onPress={() => router.push(routeShopReviewNew(shopId))}
                accessibilityRole="button"
                accessibilityLabel="レビューを書く"
              >
                <Text style={styles.writeReviewLink}>レビューを書く</Text>
              </Pressable>
            )}
          </View>

          {previewReviews.length === 0 ? (
            <Text style={styles.noReviews}>まだレビューはありません</Text>
          ) : (
            <>
              {previewReviews.map((review) => (
                <ReviewPreviewItem key={review.id} review={review} />
              ))}
              {reviewCount > PREVIEW_REVIEW_COUNT && (
                <Pressable
                  style={styles.allReviewsButton}
                  onPress={() => router.push(routeShopReviews(shopId))}
                  accessibilityRole="button"
                  accessibilityLabel={`すべてのレビューを見る（${reviewCount} 件）`}
                >
                  <Text style={styles.allReviewsText}>すべてのレビューを見る（{reviewCount} 件）</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {showReportDialog && (
        <ReportDialog
          targetType="shop"
          targetId={shopId}
          targetDisplayName={shop.name}
          onClose={() => setShowReportDialog(false)}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ShopDetailHeader
// ---------------------------------------------------------------------------

type ShopDetailHeaderProps = {
  title: string;
  onMenuPress?: () => void;
};

function ShopDetailHeader({ title, onMenuPress }: ShopDetailHeaderProps) {
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
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      {onMenuPress !== undefined ? (
        <Pressable
          onPress={onMenuPress}
          accessibilityRole="button"
          accessibilityLabel="店舗のメニューを開く"
          style={styles.menuButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colorTextSecondary} />
        </Pressable>
      ) : (
        <View style={styles.headerRight} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ShopInfoRow
// ---------------------------------------------------------------------------

type ShopInfoRowProps = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
};

function ShopInfoRow({ iconName, text }: ShopInfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={iconName}
        size={ICON_SIZE}
        color={colorTextSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

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
// ReviewPreviewItem
// ---------------------------------------------------------------------------

type ReviewPreviewItemProps = {
  review: {
    id: string;
    rating: number;
    content: string | null;
    user: { id: string; nickname: string; avatarUrl: string | null };
    createdAt: string;
  };
};

function ReviewPreviewItem({ review }: ReviewPreviewItemProps) {
  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{review.user.nickname}</Text>
        <StarDisplay rating={review.rating} />
        <Text style={styles.reviewDate}>{formatRelativeTime(review.createdAt)}</Text>
      </View>
      {review.content !== null && review.content.length > 0 && (
        <Text style={styles.reviewContent} numberOfLines={3}>{review.content}</Text>
      )}
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

function isNotFoundError(error: Error | null): boolean {
  if (error === null) return false;
  return error.message.includes('404') || error.message.includes('NOT_FOUND');
}

function isForbiddenError(error: Error | null): boolean {
  if (error === null) return false;
  return error.message.includes('403') || error.message.includes('FORBIDDEN');
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
  menuButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing3,
  },
  shopName: {
    ...textXl,
    color: colorTextPrimary,
  },
  genres: {
    ...textXs,
    color: colorTextTertiary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
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
  ratingText: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  reviewCountLink: {
    ...textSm,
    color: colorActionPrimary,
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingVertical: spacing3,
    gap: spacing2,
  },
  mapSection: {
    borderRadius: radiusLg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colorBorderLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    paddingVertical: spacing2,
    minHeight: 44,
  },
  infoRowPressed: {
    opacity: 0.7,
  },
  infoText: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
  linkText: {
    ...textBase,
    color: colorActionPrimary,
    flex: 1,
  },
  reviewsSection: {
    gap: spacing3,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  reviewsTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  writeReviewLink: {
    ...textSm,
    color: colorActionPrimary,
    fontWeight: '600',
  },
  noReviews: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
    paddingVertical: spacing4,
  },
  reviewItem: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    gap: spacing2,
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
  allReviewsButton: {
    paddingVertical: spacing3,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  allReviewsText: {
    ...textSm,
    color: colorActionPrimary,
    fontWeight: '600',
  },
});
