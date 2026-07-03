/**
 * @module app/pesticides/columns/[slug]/index
 * 農薬コラム記事詳細画面。Web 版 /pesticides/columns/[slug] に対応。
 * タイトル・公開日・カテゴリ・本文（whitespace-pre-wrap 相当）を表示する。
 * 仕様: docs/design/pesticides-web-parity.md §4-9
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
import { usePesticideColumnDetailQuery } from '@/lib/queries/pesticides';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
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
// カテゴリラベル対応表（Web版 CATEGORY_LABELS と同一）
// ---------------------------------------------------------------------------

const COLUMN_CATEGORY_LABELS: Record<string, string> = {
  mixing_order: '混用技術',
  temperature: '散布条件',
  general: '一般知識',
  management: '月別管理',
  resistance: '耐性対策',
  formulation: '剤型選択',
  active_ingredient: '原体・コード',
  safety: '安全管理',
  diagnosis: '診断',
  technique: '実践技術',
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ColumnDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const rawParams = useLocalSearchParams();

  const slugParam = rawParams['slug'];
  const slug = typeof slugParam === 'string' ? slugParam : '';

  const { data, isLoading, isError, refetch } = usePesticideColumnDetailQuery(slug);

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
          description={ERR_PESTICIDES_LOAD_FAILED}
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
        {/* タイトルとメタ情報 */}
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          <View style={styles.meta}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
            </View>
            <Text style={styles.publishedDate}>{publishedDate}</Text>
          </View>
        </View>

        <PesticideDisclaimer />

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
