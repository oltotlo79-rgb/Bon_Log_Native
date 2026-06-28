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
import type { components } from '@/lib/api/generated/schema.d.ts';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  colorError,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusSm,
  radiusMd,
  shadowWashi,
  textBase,
  textLg,
  textMd,
  textSm,
  textXl,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型エイリアス
// ---------------------------------------------------------------------------

type PesticideType = components['schemas']['PesticideType'];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const PESTICIDE_TYPE_LABEL: Record<PesticideType, string> = {
  fungicide:   '殺菌剤',
  insecticide: '殺虫剤',
  acaricide:   '殺ダニ剤',
  compound:    '複合剤',
  other:       'その他',
};

const RESISTANCE_RISK_LABEL: Record<string, string> = {
  low:    'つきにくい',
  medium: 'ややつきやすい',
  high:   'つきやすい',
};

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const rawSlug = params['slug'];
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const { data, isLoading, isError, refetch } = usePesticideProductDetailQuery(slug ?? '');

  const handleIngredientPress = useCallback((ingredientSlug: string) => {
    router.push({ pathname: '/pesticides/ingredients/[slug]', params: { slug: ingredientSlug } });
  }, []);

  const handleDiseasePestPress = useCallback((diseasePestSlug: string) => {
    router.push({ pathname: '/pesticides/disease-pests/[slug]', params: { slug: diseasePestSlug } });
  }, []);

  const hasIncompatibilities = (data?.incompatibilities.length ?? 0) > 0;

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
          {/* ヘッダー：薬剤名 + 種別バッジ */}
          <View style={styles.headerBlock}>
            <Text style={styles.name}>{data.name}</Text>
            <View style={styles.chipsRow}>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>
                  {PESTICIDE_TYPE_LABEL[data.pesticideType]}
                </Text>
              </View>
              {data.formulationType !== null && (
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{data.formulationType.name}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 説明 */}
          {data.description !== null && (
            <Text style={styles.description}>{data.description}</Text>
          )}

          {/* 基本情報（Web版 <dl> グリッドに対応） */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              基本情報
            </Text>
            {data.registrationNumber !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>登録番号</Text>
                <Text style={styles.infoValue}>{data.registrationNumber}</Text>
              </View>
            )}
            {data.formulationType !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>剤型</Text>
                <Text style={styles.infoValue}>{data.formulationType.name}</Text>
              </View>
            )}
          </View>

          {/* 有効成分（Web版のFRAC/IRACタグ付き） */}
          {data.activeIngredients.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                有効成分
              </Text>
              {data.activeIngredients.map((ingredient) => (
                <TouchableOpacity
                  key={ingredient.id}
                  style={styles.ingredientRow}
                  onPress={() => handleIngredientPress(ingredient.slug)}
                  accessibilityRole="button"
                  accessibilityLabel={`${ingredient.name}の詳細を見る`}
                >
                  <View style={styles.ingredientRowContent}>
                    <Text style={styles.relatedName}>{ingredient.name}</Text>
                    <View style={styles.ingredientTagRow}>
                      {ingredient.fracCode !== null && (
                        <View style={styles.codeTag}>
                          <Text style={styles.codeTagText}>FRAC: {ingredient.fracCode}</Text>
                        </View>
                      )}
                      {ingredient.iracCode !== null && (
                        <View style={styles.codeTag}>
                          <Text style={styles.codeTagText}>IRAC: {ingredient.iracCode}</Text>
                        </View>
                      )}
                      {ingredient.resistanceRisk !== null && (
                        <View style={styles.codeTag}>
                          <Text style={styles.codeTagText}>
                            耐性: {RESISTANCE_RISK_LABEL[ingredient.resistanceRisk] ?? ingredient.resistanceRisk}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={styles.sectionNote}>
                各成分ページでは同じ成分を含む薬剤の一覧を確認できます。
              </Text>
            </View>
          )}

          {/* 対象病害虫 */}
          {data.effects.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                効果のある病害虫
              </Text>
              <Text style={styles.sectionNote}>
                病害虫名をタップすると病害虫図鑑の詳細ページへ移動します。
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

          {/* 混用不可農薬（Web版の警告スタイルに対応） */}
          <View style={[
            styles.infoSection,
            hasIncompatibilities && styles.incompatSection,
          ]}>
            <Text style={[
              styles.sectionTitle,
              hasIncompatibilities && styles.incompatSectionTitle,
            ]} accessibilityRole="header">
              混用不可の農薬（代表例）
            </Text>
            {hasIncompatibilities ? (
              <>
                <Text style={styles.incompatWarning}>
                  このリストは一般的な物理・化学的性質に基づく代表的な組み合わせです。実際の使用前には必ず製品ラベル・説明書の注意書きをご確認ください。
                </Text>
                {data.incompatibilities.map((incompat) => (
                  <View key={incompat.id} style={styles.incompatRow}>
                    <Text style={styles.incompatName}>{incompat.name}</Text>
                    {incompat.formulationTypeName !== null && (
                      <Text style={styles.relatedType}>{incompat.formulationTypeName}</Text>
                    )}
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.relatedType}>
                特に登録・記載されている混用不可情報はありません。
              </Text>
            )}
          </View>
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
    gap: spacing4,
  },

  // ヘッダーブロック
  headerBlock: {
    gap: spacing2,
  },
  name: {
    ...textXl,
    color: colorTextPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
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
  },

  // 情報セクション（Web版 rounded-lg border p-4 に対応）
  infoSection: {
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    backgroundColor: colorSurface,
    gap: spacing3,
    ...shadowWashi,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  sectionNote: {
    ...textXs,
    color: colorTextSecondary,
  },

  // 基本情報 key-value（Web版 <dl> グリッドに対応）
  infoRow: {
    flexDirection: 'row',
    gap: spacing4,
    alignItems: 'flex-start',
    paddingVertical: spacing2,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  infoLabel: {
    ...textSm,
    color: colorTextSecondary,
    width: 72,
    flexShrink: 0,
  },
  infoValue: {
    ...textSm,
    color: colorTextPrimary,
    flex: 1,
  },

  // 有効成分行（FRAC/IRACタグ付き）
  ingredientRow: {
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    minHeight: 44,
    justifyContent: 'center',
  },
  ingredientRowContent: {
    gap: spacing2,
  },
  ingredientTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  codeTag: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  codeTagText: {
    ...textXs,
    color: colorTextSecondary,
  },

  // 関連行（病害虫等）
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

  // 混用不可農薬セクション（警告スタイル：Web版の border-destructive/30 bg-destructive/5 に対応）
  incompatSection: {
    borderColor: '#f87171',
    backgroundColor: '#fff5f5',
  },
  incompatSectionTitle: {
    color: colorError,
  },
  incompatWarning: {
    ...textXs,
    color: colorError,
    lineHeight: 16,
  },
  incompatRow: {
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
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

