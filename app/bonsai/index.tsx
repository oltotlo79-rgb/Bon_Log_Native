/**
 * @module app/bonsai/index
 * マイ盆栽一覧画面。
 * FAB で新規登録、カードタップで詳細へ遷移する。
 * 仕様: docs/design/bonsai.md §2
 */

import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { routeBonsaiDetail } from '@/lib/constants/routes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBonsaiListQuery, type BonsaiListResponse } from '@/lib/queries/bonsai';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { BonsaiCard } from '@/components/bonsai/BonsaiCard';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorBorderLight,
  spacing3,
  spacing4,
  spacing6,
  radiusFull,
  shadowWashi,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FAB_SIZE = 56;
const FAB_ICON_SIZE = 24;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type BonsaiItem = BonsaiListResponse['items'][number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BonsaiScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useBonsaiListQuery();

  const allItems: BonsaiItem[] = data?.pages.flatMap((page) => page.items) ?? [];

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: BonsaiItem }) => {
      const thumbnailUrl = item.latestRecord?.thumbnailUrl ?? null;
      return (
        <BonsaiCard
          id={item.id}
          name={item.name}
          species={item.species}
          thumbnailUrl={thumbnailUrl}
          recordCount={item.recordCount}
          updatedAt={item.updatedAt}
          onPress={() => router.push(routeBonsaiDetail(item.id))}
        />
      );
    },
    []
  );

  const keyExtractor = useCallback((item: BonsaiItem) => item.id, []);

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
        <BonsaiHeader />
        <ScreenLoading variant="skeleton" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BonsaiHeader />
        <ScreenError
          title="読み込めませんでした"
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />

      <BonsaiHeader />

      {allItems.length === 0 ? (
        <ScreenEmpty
          iconName="leaf-outline"
          title="まだ盆栽が登録されていません"
          description="右下のボタンから盆栽を登録してみましょう。"
        />
      ) : (
        <FlatList
          data={allItems}
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
          {
            bottom: insets.bottom + spacing4,
          },
        ]}
        onPress={() => router.push('/bonsai/new')}
        accessibilityRole="button"
        accessibilityLabel="盆栽を登録する"
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

function BonsaiHeader() {
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
      <Text style={styles.headerTitle}>マイ盆栽</Text>
      <View style={styles.headerRight} />
    </View>
  );
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
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing3,
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
});
