/**
 * @module app/hormones/index
 * 植物ホルモン一覧画面。
 * Web 版 /hormones/page.tsx のスマホ表示を忠実に再現する。
 * - ヘッダーバナー画像（header-hormone.webp）
 * - 五大ホルモン（category === 'major'）と二次ホルモン（category === 'secondary'）を
 *   SectionList でセクション分け表示
 * - HormoneCard: 名前・英名・カテゴリバッジ・説明・化学式 + 五大ホルモンはサムネイル付き
 * 仕様: docs/design/browse-screens.md §4
 */

import React, { useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHormonesQuery } from '@/lib/queries/hormones';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { HormoneCard } from '@/components/hormone/HormoneCard';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_HORMONES_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  spacing3,
  spacing4,
  spacing8,
  textSm,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type HormoneItem = components['schemas']['HormoneItem'];

// ---------------------------------------------------------------------------
// セクション定義
// ---------------------------------------------------------------------------

type HormoneSection = {
  key: 'major' | 'secondary';
  title: string;
  subtitle: string;
  data: HormoneItem[];
};

// ---------------------------------------------------------------------------
// ヘッダーバナー画像（Metro bundler はトップレベルの require() を解決する）
// ---------------------------------------------------------------------------

const HEADER_IMG: number = require('@/assets/images/hormones/header-hormone.webp') as number;

// ---------------------------------------------------------------------------
// ListHeaderComponent — バナー画像 + 説明文
// ---------------------------------------------------------------------------

const ListHeader = memo(function ListHeader() {
  return (
    <View style={styles.listHeader}>
      <Image
        source={HEADER_IMG}
        style={styles.headerBanner}
        contentFit="cover"
        accessibilityLabel="植物ホルモン"
      />
      <Text style={styles.headerDescription}>
        盆栽の成長・休眠・発根に関わる植物ホルモンの役割と相互作用を学べます
      </Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// セクションヘッダー
// ---------------------------------------------------------------------------

type SectionHeaderProps = { title: string; subtitle: string };

const HormoneSectionHeader = memo(function HormoneSectionHeader({
  title,
  subtitle,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// HormoneCell（リストアイテム memo 化）
// ---------------------------------------------------------------------------

type HormoneCellProps = { item: HormoneItem };

const HormoneCell = memo(function HormoneCell({ item }: HormoneCellProps) {
  const handlePress = useCallback(() => {
    router.push({ pathname: '/hormones/[slug]', params: { slug: item.slug } });
  }, [item.slug]);

  return (
    <View style={styles.cardWrapper}>
      <HormoneCard
        name={item.name}
        nameEn={item.nameEn}
        slug={item.slug}
        category={item.category}
        description={item.description}
        chemicalFormula={item.chemicalFormula}
        onPress={handlePress}
        accessibilityLabel={`${item.name}${item.nameEn !== null ? `（${item.nameEn}）` : ''}の詳細を見る`}
      />
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormonesScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch } = useHormonesQuery();

  // major / secondary でセクション分けする（Web 版 /hormones/page.tsx と同じ分類）
  const sections = useMemo<HormoneSection[]>(() => {
    if (data === undefined) return [];

    const major = data.filter((h) => h.category === 'major');
    const secondary = data.filter((h) => h.category === 'secondary');

    const result: HormoneSection[] = [];

    if (major.length > 0) {
      result.push({
        key: 'major',
        title: '五大ホルモン',
        subtitle: '植物の成長・分化・休眠を制御する主要な5つのホルモンです。',
        data: major,
      });
    }

    if (secondary.length > 0) {
      result.push({
        key: 'secondary',
        title: '二次ホルモン',
        subtitle: '近年注目されているホルモンで、ストレス応答や成長調節に関与します。',
        data: secondary,
      });
    }

    return result;
  }, [data]);

  const renderItem = useCallback(
    ({ item }: { item: HormoneItem }) => <HormoneCell item={item} />,
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: HormoneSection }) => (
      <HormoneSectionHeader title={section.title} subtitle={section.subtitle} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: HormoneItem) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: '植物ホルモン', headerShown: true }} />

      <OfflineBanner isVisible={!isOnline} />

      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError ? (
        <ScreenError
          title="植物ホルモン情報を読み込めませんでした。"
          description={ERR_HORMONES_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      ) : sections.length === 0 ? (
        <ScreenEmpty title="ホルモン情報はありません" />
      ) : (
        <SectionList<HormoneItem, HormoneSection>
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing8 },
          ]}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
          }
        />
      )}
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

  // ---- バナーヘッダー ----
  listHeader: {
    backgroundColor: colorBackground,
  },
  headerBanner: {
    width: '100%',
    aspectRatio: 21 / 9,
  },
  headerDescription: {
    ...textSm,
    color: colorTextSecondary,
    paddingHorizontal: spacing4,
    paddingTop: spacing3,
    paddingBottom: spacing4,
  },

  // ---- セクションヘッダー ----
  sectionHeaderContainer: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing3,
    gap: spacing3,
    backgroundColor: colorBackground,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  sectionSubtitle: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
    marginTop: -spacing3,
  },

  // ---- リスト共通 ----
  listContent: {
    paddingHorizontal: spacing4,
  },
  cardWrapper: {
    marginBottom: spacing3,
  },
});
