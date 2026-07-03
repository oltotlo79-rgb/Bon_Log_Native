/**
 * @module app/fertilizers/columns/[slug]/index
 * 施肥コラム記事詳細画面。農薬コラム詳細（/pesticides/columns/[slug]）と同構成。
 * タイトル・カテゴリ・公開日・本文を表示する。
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFertilizerColumnDetailQuery } from '@/lib/queries/fertilizers';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { FertilizerDisclaimer } from '@/components/fertilizer/FertilizerDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceMuted,
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusSm,
  textSm,
  textXs,
  textXl,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// カテゴリラベル対応表
// ---------------------------------------------------------------------------

const COLUMN_CATEGORY_LABELS: Record<string, string> = {
  basics:          '基礎知識',
  seasonal:        '季節の施肥',
  technique:       '施肥技術',
  troubleshooting: 'トラブル解決',
  product_guide:   '定番肥料ガイド',
  trouble:         'トラブル事例',
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function FertilizerColumnDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const rawParams = useLocalSearchParams();

  const slugParam = rawParams['slug'];
  const slug = typeof slugParam === 'string' ? slugParam : '';

  const { data, isLoading, isError, refetch } = useFertilizerColumnDetailQuery(slug);

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const screenTitle = data !== undefined ? data.title : 'コラム記事';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'コラム記事', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError || data === undefined) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'コラム記事', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="記事を読み込めませんでした"
          description={ERR_FERTILIZERS_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const categoryLabel = COLUMN_CATEGORY_LABELS[data.category] ?? data.category;
  const publishedDate = new Date(data.publishedAt).toLocaleDateString('ja-JP');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: screenTitle, headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing8 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          <View style={styles.meta}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
            </View>
            <Text style={styles.publishedDate}>{publishedDate}</Text>
          </View>
        </View>

        <FertilizerDisclaimer />

        <Text style={styles.content}>{data.content}</Text>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing6,
  },
  header: {
    gap: spacing3,
  },
  title: {
    ...textXl,
    color: colorTextPrimary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: colorSurfaceMuted,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    ...textXs,
    color: colorTextSecondary,
  },
  publishedDate: {
    ...textXs,
    color: colorTextSecondary,
  },
  content: {
    ...textSm,
    color: colorTextPrimary,
    lineHeight: 22,
  },
});
