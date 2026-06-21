/**
 * @module app/fertilizers/nutrients/[slug]/index
 * 栄養素詳細画面。欠乏症状・過剰症状・多く含む資材を表示する。
 * 仕様: docs/design/browse-screens.md §3.4
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFertilizerNutrientDetailQuery } from '@/lib/queries/fertilizers';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceMuted,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusSm,
  textBase,
  textLg,
  textMd,
  textSm,
  textXs,
  text2xl,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function NutrientDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const rawSlug = params['slug'];
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const { data, isLoading, isError, refetch } = useFertilizerNutrientDetailQuery(slug ?? '');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: data?.name ?? '栄養素詳細',
          headerShown: true,
        }}
      />

      <OfflineBanner isVisible={!isOnline} />

      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError || slug === '' ? (
        <ScreenError
          title="施肥情報を読み込めませんでした。"
          description={ERR_FERTILIZERS_LOAD_FAILED}
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
          <View style={styles.header}>
            <Text style={styles.symbol}>{data.symbol}</Text>
            <View style={styles.headerText}>
              <Text style={styles.name}>{data.name}</Text>
              {data.category.length > 0 && (
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{data.category}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 説明 */}
          {data.description !== null && (
            <Text style={styles.description}>{data.description}</Text>
          )}
          {data.bonsaiRole !== null && (
            <Text style={styles.bonsaiRole}>{data.bonsaiRole}</Text>
          )}

          {/* 欠乏症状 */}
          {data.deficiencySymptoms !== null && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                欠乏症状
              </Text>
              <Text style={styles.sectionBody}>{data.deficiencySymptoms}</Text>
            </View>
          )}

          {/* 過剰症状 */}
          {data.excessSymptoms !== null && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                過剰症状
              </Text>
              <Text style={styles.sectionBody}>{data.excessSymptoms}</Text>
            </View>
          )}

          {/* 多く含む資材 */}
          {data.foodSources !== null && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                多く含む肥料・資材
              </Text>
              {data.foodSources.split('\n').map((line, i) => (
                <Text key={i} style={styles.bulletItem}>
                  {`・${line}`}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing3,
    marginBottom: spacing4,
  },
  symbol: {
    ...text2xl,
    color: colorTextPrimary,
    width: 40,
    textAlign: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing2,
  },
  name: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
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
