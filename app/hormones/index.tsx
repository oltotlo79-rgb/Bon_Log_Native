/**
 * @module app/hormones/index
 * 植物ホルモントップ画面。Web 版 /hormones の完全準拠ハブ構成。
 *
 * スクロール不具合防止:
 * 施肥トップと同じ「画面全体を単一の ScrollView で包む縦一本スクロール」構成を採用する。
 * ListHeaderComponent を持つ SectionList を廃止し、ScrollView + View に置き換えることで
 * ヘッダーの高さによる残余空間消失を根本的に回避する。
 *
 * 仕様: docs/design/hormones-fertilizers-web-parity.md §4.13
 */

import React, { useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { HormoneDisclaimer } from '@/components/hormone/HormoneDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_HORMONES_LOAD_FAILED } from '@/lib/constants/errors';
import { routeHormoneDetail } from '@/lib/constants/routes';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  textSm,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type HormoneItem = components['schemas']['HormoneItem'];

// ---------------------------------------------------------------------------
// ヘッダーバナー画像（Metro bundler はトップレベルの require() を解決する）
// ---------------------------------------------------------------------------

const HEADER_IMG: number = require('@/assets/images/hormones/header-hormone.webp') as number;

// ---------------------------------------------------------------------------
// HormoneCard ラッパー（memo 化でリスト再レンダリングを抑制）
// ---------------------------------------------------------------------------

const HormoneItemCell = memo(function HormoneItemCell({ item }: { item: HormoneItem }) {
  const handlePress = useCallback(() => {
    router.push(routeHormoneDetail(item.slug));
  }, [item.slug]);

  return (
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
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormonesScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch } = useHormonesQuery();

  const majorHormones = useMemo<HormoneItem[]>(
    () => (data ?? []).filter((h) => h.category === 'major'),
    [data],
  );

  const secondaryHormones = useMemo<HormoneItem[]>(
    () => (data ?? []).filter((h) => h.category === 'secondary'),
    [data],
  );

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) return <ScreenLoading variant="spinner" />;

  if (isError && data === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: '植物ホルモン', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="植物ホルモン情報を読み込めませんでした。"
          description={ERR_HORMONES_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  if (majorHormones.length === 0 && !isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '植物ホルモン', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenEmpty title="ホルモン情報はありません" />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '植物ホルモン', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      {/* 画面全体を単一の ScrollView で包む */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダーバナー */}
        <Image
          source={HEADER_IMG}
          style={styles.headerBanner}
          contentFit="cover"
          accessibilityLabel="植物ホルモン"
        />

        <Text style={styles.headerDescription}>
          盆栽の成長・休眠・発根に関わる植物ホルモンの役割と相互作用を学べます
        </Text>

        {/* 免責注記 */}
        <View style={styles.disclaimerWrapper}>
          <HormoneDisclaimer />
        </View>

        {/* 五大ホルモン セクション */}
        {majorHormones.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>五大ホルモン</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              植物の成長・分化・休眠を制御する主要な5つのホルモンです。
            </Text>
            <View style={styles.cardList}>
              {majorHormones.map((item) => (
                <View key={item.id} style={styles.cardItem}>
                  <HormoneItemCell item={item} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 二次ホルモン セクション */}
        {secondaryHormones.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>二次ホルモン</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              近年注目されているホルモンで、ストレス応答や成長調節に関与します。
            </Text>
            <View style={styles.cardList}>
              {secondaryHormones.map((item) => (
                <View key={item.id} style={styles.cardItem}>
                  <HormoneItemCell item={item} />
                </View>
              ))}
            </View>
          </View>
        )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing6,
    paddingTop: 0,
  },

  // ---- ヘッダーバナー ----
  headerBanner: {
    width: '100%',
    aspectRatio: 21 / 9,
  },
  headerDescription: {
    ...textSm,
    color: colorTextSecondary,
    paddingHorizontal: spacing4,
  },

  // ---- 免責注記 ----
  disclaimerWrapper: {
    paddingHorizontal: spacing4,
  },

  // ---- セクション ----
  section: {
    paddingHorizontal: spacing4,
    gap: spacing3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  cardList: {
    gap: spacing3,
  },
  cardItem: {
    // gap で制御するためマージン不要
  },
});
