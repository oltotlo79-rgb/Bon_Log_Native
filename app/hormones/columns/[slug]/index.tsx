/**
 * @module app/hormones/columns/[slug]/index
 * ホルモンコラム記事詳細画面。Web 版 /hormones/columns/[slug] の完全再現。
 * タイトル・公開日・カテゴリ・本文（whitespace-pre-wrap 相当）を表示する。
 * 農薬コラム詳細（app/pesticides/columns/[slug]）と同パターン。
 * 仕様: docs/design/hormones-fertilizers-web-parity.md §4.20
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
import { useHormoneColumnDetailQuery } from '@/lib/queries/hormones';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { HormoneDisclaimer } from '@/components/hormone/HormoneDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_HORMONES_LOAD_FAILED } from '@/lib/constants/errors';
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
// category ラベル対応表（columns/index.tsx と同一）
// ---------------------------------------------------------------------------

const COLUMN_CATEGORY_LABELS: Record<string, string> = {
  bonsai_practice: '盆栽実践',
  seasonal: '季節の管理',
  basics: '基礎知識',
  application: '応用テクニック',
  research: '最新研究',
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormoneColumnDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const rawParams = useLocalSearchParams();

  const slugParam = rawParams['slug'];
  const slug = typeof slugParam === 'string' ? slugParam : '';

  const { data, isLoading, isError, refetch } = useHormoneColumnDetailQuery(slug);

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
          description={ERR_HORMONES_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const categoryLabel = COLUMN_CATEGORY_LABELS[data.category] ?? data.category;
  const publishedDate =
    data.publishedAt !== null
      ? new Date(data.publishedAt).toLocaleDateString('ja-JP')
      : '';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: screenTitle, headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* タイトルとメタ情報 */}
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          <View style={styles.meta}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
            </View>
            {publishedDate.length > 0 && (
              <Text style={styles.publishedDate}>{publishedDate}</Text>
            )}
          </View>
        </View>

        <HormoneDisclaimer />

        {/* 本文（whitespace-pre-wrap 相当） */}
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
