/**
 * @module app/hormones/[slug]/index
 * 植物ホルモン詳細画面。効果・季節的変動バー・実践のコツを表示する。
 * 仕様: docs/design/browse-screens.md §4.4
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHormoneDetailQuery } from '@/lib/queries/hormones';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { HormoneSeasonalChart } from '@/components/common/SimpleBarChart';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_HORMONES_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusSm,
  textBase,
  textLg,
  textMd,
  textSm,
  textXl,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormoneDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const rawSlug = params['slug'];
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const { data, isLoading, isError, refetch } = useHormoneDetailQuery(slug ?? '');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: data?.name ?? 'ホルモン詳細',
          headerShown: true,
        }}
      />

      <OfflineBanner isVisible={!isOnline} />

      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError || slug === '' ? (
        <ScreenError
          title="このホルモンは見つかりません。"
          description={ERR_HORMONES_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      ) : data === undefined ? null : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing8 },
          ]}
        >
          {/* ヘッダー */}
          <Text style={styles.name}>{data.name}</Text>
          {data.nameEn !== null && (
            <Text style={styles.nameEn}>{data.nameEn}</Text>
          )}
          {data.chemicalFormula !== null && (
            <Text style={styles.formula}>{data.chemicalFormula}</Text>
          )}
          {data.category.length > 0 && (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{data.category}</Text>
            </View>
          )}

          {/* 説明 */}
          {data.description !== null && (
            <Text style={styles.description}>{data.description}</Text>
          )}
          {data.bonsaiRole !== null && (
            <Text style={styles.bonsaiRole}>{data.bonsaiRole}</Text>
          )}

          {/* 産生部位 */}
          {data.productionSite !== null && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                産生部位
              </Text>
              <Text style={styles.sectionBody}>{data.productionSite}</Text>
            </View>
          )}

          {/* 主な効果 */}
          {data.effects.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                主な効果
              </Text>
              {data.effects.map((effect, i) => (
                <Text key={i} style={styles.bulletItem} accessibilityRole="text">
                  {`・${effect.effectName}（${effect.isPromoting ? '促進' : '抑制'}）`}
                </Text>
              ))}
            </View>
          )}

          {/* 季節的変動 */}
          {data.seasonalLevels.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                季節的変動
              </Text>
              <HormoneSeasonalChart seasonalLevels={data.seasonalLevels} />
            </View>
          )}

          {/* 活性化方法 */}
          {data.activationMethod !== null && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                活性化方法
              </Text>
              <Text style={styles.sectionBody}>{data.activationMethod}</Text>
            </View>
          )}

          {/* 実践のコツ */}
          {data.practicalTips !== null && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                実践のコツ
              </Text>
              {data.practicalTips.split('\n').map((tip, i) => (
                <Text key={i} style={styles.bulletItem} accessibilityRole="text">
                  {`・${tip}`}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
  },
  name: {
    ...textXl,
    color: colorTextPrimary,
    marginBottom: spacing2,
  },
  nameEn: {
    ...textMd,
    color: colorTextSecondary,
    marginBottom: spacing2,
  },
  formula: {
    ...textSm,
    color: colorTextSecondary,
    fontStyle: 'italic',
    marginBottom: spacing2,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    marginBottom: spacing4,
  },
  categoryChipText: {
    ...textXs,
    color: colorTextSecondary,
  },
  description: {
    ...textBase,
    color: colorTextPrimary,
    lineHeight: 22,
    marginBottom: spacing3,
  },
  bonsaiRole: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
    marginBottom: spacing4,
  },
  section: {
    borderTopWidth: 2,
    borderTopColor: colorBorderLight,
    paddingTop: spacing4,
    marginTop: spacing4,
    gap: spacing2,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
    marginBottom: spacing2,
  },
  sectionBody: {
    ...textBase,
    color: colorTextPrimary,
    lineHeight: 22,
  },
  bulletItem: {
    ...textBase,
    color: colorTextSecondary,
    lineHeight: 22,
  },
});
