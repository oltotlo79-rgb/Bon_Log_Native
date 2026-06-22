/**
 * @module app/pesticides/ingredients/[slug]/index
 * 農薬有効成分詳細画面。成分グループ・説明・含む製品一覧を表示する。
 * 仕様: docs/design/browse-screens.md §5.4
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePesticideIngredientDetailQuery } from '@/lib/queries/pesticides';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceMuted,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
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
// 耐性リスクの日本語ラベル
// ---------------------------------------------------------------------------

const RESISTANCE_RISK_LABEL: Record<string, string> = {
  low: 'つきにくい',
  medium: 'ややつきやすい',
  high: 'つきやすい',
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function IngredientDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const rawSlug = params['slug'];
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const { data, isLoading, isError, refetch } = usePesticideIngredientDetailQuery(slug ?? '');

  const handleProductPress = useCallback((productSlug: string) => {
    router.push({ pathname: '/pesticides/products/[slug]', params: { slug: productSlug } });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: data?.name ?? '農薬成分詳細',
          headerShown: true,
        }}
      />

      <OfflineBanner isVisible={!isOnline} />

      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError || slug === '' ? (
        <ScreenError
          title="この情報は見つかりません。"
          description={ERR_PESTICIDES_LOAD_FAILED}
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
          <View style={styles.metaRow}>
            {data.fracCode !== null && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>FRAC: {data.fracCode}</Text>
              </View>
            )}
            {data.iracCode !== null && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>IRAC: {data.iracCode}</Text>
              </View>
            )}
            {data.resistanceRisk !== null && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>
                  耐性: {RESISTANCE_RISK_LABEL[data.resistanceRisk] ?? data.resistanceRisk}
                </Text>
              </View>
            )}
          </View>

          {/* 成分グループ */}
          {data.ingredientGroup !== null && (
            <Text style={styles.group}>{data.ingredientGroup}</Text>
          )}

          {/* 説明 */}
          {data.description !== null && (
            <Text style={styles.description}>{data.description}</Text>
          )}

          {/* 含む製品 */}
          {data.pesticides.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                含む製品
              </Text>
              {data.pesticides.map((p) => (
                <TouchableOpacity
                  key={p.pesticide.id}
                  style={styles.relatedRow}
                  onPress={() => handleProductPress(p.pesticide.slug)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.pesticide.name}の詳細を見る`}
                >
                  <View style={styles.relatedRowContent}>
                    <Text style={styles.relatedName}>{p.pesticide.name}</Text>
                    {p.pesticide.formulationTypeName !== null && (
                      <Text style={styles.relatedType}>{p.pesticide.formulationTypeName}</Text>
                    )}
                    {p.contentLabel !== null && (
                      <Text style={styles.contentLabel}>{p.contentLabel}</Text>
                    )}
                  </View>
                </TouchableOpacity>
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
    marginBottom: spacing3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
    marginBottom: spacing4,
  },
  metaChip: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  metaChipText: {
    ...textXs,
    color: colorTextSecondary,
  },
  group: {
    ...textSm,
    color: colorTextSecondary,
    marginBottom: spacing3,
  },
  description: {
    ...textBase,
    color: colorTextPrimary,
    lineHeight: 22,
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
  relatedRow: {
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    minHeight: 44,
    justifyContent: 'center',
  },
  relatedRowContent: {
    gap: 2,
  },
  relatedName: {
    ...textMd,
    color: colorTextLink,
    fontWeight: '600',
  },
  relatedType: {
    ...textXs,
    color: colorTextSecondary,
  },
  contentLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
});
