/**
 * @module app/fertilizers/schedules/index
 * 樹種別施肥スケジュール一覧。Web 版 /fertilizers/schedules の再現。
 * 松柏・雑木にはセクション挿絵付き。
 */

import React, { useCallback, useMemo, memo } from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFertilizerTreeSpeciesQuery } from '@/lib/queries/fertilizers';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { TreeSpeciesCard } from '@/components/fertilizer/TreeSpeciesCard';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorTextPrimary,
  spacing3,
  spacing4,
  spacing8,
  radiusMd,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type TreeSpeciesItem = components['schemas']['TreeSpeciesItem'];
type TreeCategory = 'conifer' | 'deciduous' | 'flowering' | 'fruiting' | 'grass' | 'evergreen';

type TreeSection = {
  key: TreeCategory;
  label: string;
  image: number | null;
  data: TreeSpeciesItem[];
};

// ---------------------------------------------------------------------------
// 画像（松柏・雑木のみ挿絵あり）
// ---------------------------------------------------------------------------

const IMG_SCHEDULE_CONIFER: number = require('@/assets/images/fertilizers/schedule-conifer.webp');
const IMG_SCHEDULE_DECIDUOUS: number = require('@/assets/images/fertilizers/schedule-deciduous.webp');

const TREE_CATEGORY_ORDER: { key: TreeCategory; label: string; image: number | null }[] = [
  { key: 'conifer',   label: '松柏類',     image: IMG_SCHEDULE_CONIFER },
  { key: 'deciduous', label: '雑木類',     image: IMG_SCHEDULE_DECIDUOUS },
  { key: 'flowering', label: '花物',       image: null },
  { key: 'fruiting',  label: '実物',       image: null },
  { key: 'grass',     label: '草物',       image: null },
  { key: 'evergreen', label: '常緑広葉樹', image: null },
];

// ---------------------------------------------------------------------------
// セクションヘッダー
// ---------------------------------------------------------------------------

type SectionHeaderProps = {
  title: string;
  image: number | null;
};

const SectionHeader = memo(function SectionHeader({ title, image }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeaderContainer}>
      {image !== null && (
        <Image
          source={image}
          style={styles.sectionImage}
          contentFit="cover"
          accessibilityLabel={title}
        />
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// アイテムセル
// ---------------------------------------------------------------------------

const TreeSpeciesItemCell = memo(function TreeSpeciesItemCell({
  item,
}: {
  item: TreeSpeciesItem;
}) {
  const handlePress = useCallback(
    (slug: string, name: string) =>
      router.push({
        pathname: '/fertilizers/tree-species/[slug]',
        params: { slug, name },
      }),
    [],
  );
  return (
    <View style={styles.cardWrapper}>
      <TreeSpeciesCard
        name={item.name}
        category={item.category}
        fertilizingPolicy={item.fertilizingPolicy}
        slug={item.slug}
        onPress={handlePress}
      />
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function FertilizerSchedulesScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch } = useFertilizerTreeSpeciesQuery();

  const sections = useMemo<TreeSection[]>(() => {
    if (data === undefined) return [];
    return TREE_CATEGORY_ORDER.map(({ key, label, image }) => ({
      key,
      label,
      image,
      data: data.filter((s) => s.category === key),
    })).filter((s) => s.data.length > 0);
  }, [data]);

  if (isLoading) return <ScreenLoading variant="spinner" />;

  if (isError) {
    return (
      <>
        <Stack.Screen options={{ title: '樹種別施肥スケジュール', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="樹種情報を読み込めませんでした。"
          description={ERR_FERTILIZERS_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  if (sections.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: '樹種別施肥スケジュール', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenEmpty title="データがありません" />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '樹種別施肥スケジュール', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      <SectionList<TreeSpeciesItem, TreeSection>
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.label} image={section.image} />
        )}
        renderItem={({ item }) => <TreeSpeciesItemCell item={item} />}
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
    marginBottom: spacing3,
    marginTop: spacing4,
    gap: spacing3,
  },
  sectionImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radiusMd,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
});
