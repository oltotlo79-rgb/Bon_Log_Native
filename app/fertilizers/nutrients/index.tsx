/**
 * @module app/fertilizers/nutrients/index
 * 栄養素一覧画面。Web 版 /fertilizers/nutrients の再現。
 * primary / secondary / trace の 3 カテゴリをセクション分けして NutrientCard で表示する。
 */

import React, { useCallback, useMemo, memo } from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFertilizerNutrientsQuery } from '@/lib/queries/fertilizers';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { NutrientCard } from '@/components/fertilizer/NutrientCard';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorTextPrimary,
  spacing3,
  spacing4,
  spacing8,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type NutrientItem = components['schemas']['NutrientItem'];
type NutrientCategory = 'primary' | 'secondary' | 'trace';

type NutrientSection = {
  key: NutrientCategory;
  label: string;
  data: NutrientItem[];
};

// ---------------------------------------------------------------------------
// カテゴリ順（Web と同一）
// ---------------------------------------------------------------------------

const NUTRIENT_CATEGORY_ORDER: { key: NutrientCategory; label: string }[] = [
  { key: 'primary',   label: '三大要素' },
  { key: 'secondary', label: '二次要素' },
  { key: 'trace',     label: '微量要素' },
];

// ---------------------------------------------------------------------------
// セクションヘッダー
// ---------------------------------------------------------------------------

const SectionHeader = memo(function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// アイテムセル
// ---------------------------------------------------------------------------

const NutrientItemCell = memo(function NutrientItemCell({ item }: { item: NutrientItem }) {
  const handlePress = useCallback(
    (slug: string) =>
      router.push({ pathname: '/fertilizers/nutrients/[slug]', params: { slug } }),
    [],
  );
  return (
    <View style={styles.cardWrapper}>
      <NutrientCard
        symbol={item.symbol}
        name={item.name}
        category={item.category}
        bonsaiRole={item.bonsaiRole}
        slug={item.slug}
        onPress={handlePress}
      />
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function FertilizerNutrientsScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch } = useFertilizerNutrientsQuery();

  const sections = useMemo<NutrientSection[]>(() => {
    if (data === undefined) return [];
    return NUTRIENT_CATEGORY_ORDER.map(({ key, label }) => ({
      key,
      label,
      data: data.filter((n) => n.category === key),
    })).filter((s) => s.data.length > 0);
  }, [data]);

  const totalCount = data?.length ?? 0;

  if (isLoading) return <ScreenLoading variant="spinner" />;

  if (isError) {
    return (
      <>
        <Stack.Screen
          options={{ title: '栄養素一覧', headerShown: true }}
        />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="栄養素情報を読み込めませんでした。"
          description={ERR_FERTILIZERS_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  if (sections.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{ title: '栄養素一覧', headerShown: true }}
        />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenEmpty title="データがありません" />
      </>
    );
  }

  const subtitle = totalCount > 0 ? `${totalCount}件` : '';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '栄養素一覧',
          headerShown: true,
          ...(subtitle.length > 0 ? {} : {}),
        }}
      />
      <OfflineBanner isVisible={!isOnline} />

      <SectionList<NutrientItem, NutrientSection>
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => <SectionHeader title={section.label} />}
        renderItem={({ item }) => <NutrientItemCell item={item} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
        }
      />
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
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing3,
  },
  cardWrapper: {
    marginBottom: spacing3,
  },
  sectionHeaderContainer: {
    paddingTop: spacing4,
    marginBottom: spacing3,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
});
