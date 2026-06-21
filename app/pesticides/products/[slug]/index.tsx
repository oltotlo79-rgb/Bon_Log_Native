/**
 * @module app/pesticides/products/[slug]/index
 * 農薬製品詳細画面。有効成分・対象病害虫・混用不可農薬を表示する。
 * 仕様: docs/design/browse-screens.md §5.4
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePesticideProductDetailQuery } from '@/lib/queries/pesticides';
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
// Screen
// ---------------------------------------------------------------------------

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const rawSlug = params['slug'];
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const { data, isLoading, isError, refetch } = usePesticideProductDetailQuery(slug ?? '');

  const handleIngredientPress = useCallback((ingredientSlug: string) => {
    router.push({ pathname: '/pesticides/ingredients/[slug]/index', params: { slug: ingredientSlug } });
  }, []);

  const handleDiseasePestPress = useCallback((diseasePestSlug: string) => {
    router.push({ pathname: '/pesticides/disease-pests/[slug]/index', params: { slug: diseasePestSlug } });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: data?.name ?? '農薬製品詳細',
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
          {data.registrationNumber !== null && (
            <Text style={styles.registrationNumber}>
              登録番号: {data.registrationNumber}
            </Text>
          )}
          <View style={styles.chipsRow}>
            {data.pesticideType.length > 0 && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{data.pesticideType}</Text>
              </View>
            )}
            {data.formulationType !== null && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{data.formulationType.name}</Text>
              </View>
            )}
          </View>

          {/* 説明 */}
          {data.description !== null && (
            <Text style={styles.description}>{data.description}</Text>
          )}

          {/* 有効成分 */}
          {data.activeIngredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                有効成分
              </Text>
              {data.activeIngredients.map((ingredient) => (
                <TouchableOpacity
                  key={ingredient.id}
                  style={styles.relatedRow}
                  onPress={() => handleIngredientPress(ingredient.slug)}
                  accessibilityRole="button"
                  accessibilityLabel={`${ingredient.name}の詳細を見る`}
                >
                  <Text style={styles.relatedName}>{ingredient.name}</Text>
                  {ingredient.resistanceRisk !== null && (
                    <Text style={styles.relatedType}>
                      耐性リスク: {ingredient.resistanceRisk}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 対象病害虫 */}
          {data.effects.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                対象病害虫
              </Text>
              {data.effects.map((effect) => (
                <TouchableOpacity
                  key={effect.diseasePest.id}
                  style={styles.relatedRow}
                  onPress={() => handleDiseasePestPress(effect.diseasePest.slug)}
                  accessibilityRole="button"
                  accessibilityLabel={`${effect.diseasePest.name}の詳細を見る`}
                >
                  <Text style={styles.relatedName}>{effect.diseasePest.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 混用不可農薬 */}
          {data.incompatibilities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                混用不可農薬
              </Text>
              {data.incompatibilities.map((incompat) => (
                <View key={incompat.id} style={styles.incompatRow}>
                  <Text style={styles.incompatName}>{incompat.name}</Text>
                  {incompat.formulationTypeName !== null && (
                    <Text style={styles.relatedType}>{incompat.formulationTypeName}</Text>
                  )}
                </View>
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
  registrationNumber: {
    ...textSm,
    color: colorTextSecondary,
    marginBottom: spacing3,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
    marginBottom: spacing4,
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
  incompatRow: {
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    minHeight: 44,
    justifyContent: 'center',
    gap: 2,
  },
  incompatName: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
});

