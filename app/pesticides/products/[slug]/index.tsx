/**
 * @module app/pesticides/products/[slug]/index
 * 農薬製品詳細画面。有効成分・対象病害虫・混用不可農薬を表示する。
 * 仕様: docs/design/browse-screens.md §5.4
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePesticideProductDetailQuery } from '@/lib/queries/pesticides';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';
import { EffectRatingBadge } from '@/components/pesticide/EffectRatingBadge';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
import {
  routeFormulations,
  routeSpreaderTypeDetail,
  routePesticideIngredientDetail,
  routeDiseasePestDetail,
  routePesticideProductDetail,
} from '@/lib/constants/routes';
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
  colorWarning,
  colorWarningBg,
  colorPesticideWarningBorder,
  colorPesticideWarningBg,
  colorPesticideWarningDivider,
  colorCategoryGreenBg,
  colorCategoryGreenText,
  colorCategoryAmberBg,
  colorCategoryRoseBg,
  colorCategoryRoseText,
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
type ResistanceRisk = 'low' | 'medium' | 'high';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const PESTICIDE_TYPE_LABEL: Record<PesticideType, string> = {
  fungicide:   '殺菌剤',
  insecticide: '殺虫剤',
  acaricide:   '殺ダニ剤',
  compound:    '複合剤',
  other:       'その他',
};

const RESISTANCE_RISK_LABEL: Record<ResistanceRisk, string> = {
  low:    'つきにくい',
  medium: 'ややつきやすい',
  high:   'つきやすい',
};

/** Web: bg-rose-100 text-rose-700 (high), bg-amber-100 text-amber-700 (medium), bg-emerald-100 text-emerald-700 (low) */
const RESISTANCE_RISK_COLORS: Record<ResistanceRisk, { bg: string; text: string }> = {
  high:   { bg: colorCategoryRoseBg,  text: colorCategoryRoseText },
  medium: { bg: colorCategoryAmberBg, text: colorWarning },
  low:    { bg: colorCategoryGreenBg, text: colorCategoryGreenText },
};

const MAFF_PESTICIDE_BASE_URL = 'https://pesticide.maff.go.jp/agricultural-chemicals/details';

function buildMaffUrl(registrationNumber: string): string {
  return `${MAFF_PESTICIDE_BASE_URL}/${registrationNumber}`;
}

function isResistanceRisk(value: string | null | undefined): value is ResistanceRisk {
  return value === 'low' || value === 'medium' || value === 'high';
}

function getMaxResistanceRisk(
  activeIngredients: { resistanceRisk: string | null }[]
): ResistanceRisk | null {
  const ORDER: Record<ResistanceRisk, number> = { high: 3, medium: 2, low: 1 };
  let max: ResistanceRisk | null = null;
  for (const { resistanceRisk } of activeIngredients) {
    if (!isResistanceRisk(resistanceRisk)) continue;
    if (max === null || ORDER[resistanceRisk] > ORDER[max]) {
      max = resistanceRisk;
    }
  }
  return max;
}

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
    router.push(routePesticideIngredientDetail(ingredientSlug));
  }, []);

  const handleDiseasePestPress = useCallback((diseasePestSlug: string) => {
    router.push(routeDiseasePestDetail(diseasePestSlug));
  }, []);

  const handleIncompatPress = useCallback((incompatSlug: string) => {
    router.push(routePesticideProductDetail(incompatSlug));
  }, []);

  const handleFormulationPress = useCallback((formulationCode: string) => {
    router.push(routeFormulations(formulationCode));
  }, []);

  const handleSpreaderPress = useCallback((spreaderSlug: string) => {
    router.push(routeSpreaderTypeDetail(spreaderSlug));
  }, []);

  const handleMaffLinkPress = useCallback((registrationNumber: string) => {
    void Linking.openURL(buildMaffUrl(registrationNumber));
  }, []);

  const hasIncompatibilities = (data?.incompatibilities.length ?? 0) > 0;
  const resistanceRisk = data !== undefined ? getMaxResistanceRisk(data.activeIngredients) : null;

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

          {/* 登録番号未掲載バッジ（Web: MaffUnverifiedBadge） */}
          {data.registrationNumber === null && (
            <View style={styles.unverifiedBadge} accessibilityRole="alert">
              <Text style={styles.unverifiedTitle}>登録番号は未掲載です</Text>
              <Text style={styles.unverifiedBody}>
                この製品の農薬登録番号は当サイトで確認できていません。ご使用前に農林水産省の農薬登録情報提供システムで最新の登録情報をご確認ください。
              </Text>
            </View>
          )}

          {/* 農薬情報免責注記 */}
          <PesticideDisclaimer />

          {/* 基本情報（Web版 <dl> グリッドに対応） */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              基本情報
            </Text>
            {data.registrationNumber !== null && (() => {
              const registrationNumber = data.registrationNumber;
              return (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>登録番号</Text>
                  <TouchableOpacity
                    onPress={() => handleMaffLinkPress(registrationNumber)}
                    accessibilityRole="link"
                    accessibilityLabel={`${registrationNumber} 農林水産省の詳細ページを開く`}
                  >
                    <Text style={styles.infoValueLink}>
                      {registrationNumber}（農林水産省）↗
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
            {data.formulationType !== null && (() => {
              const ft = data.formulationType;
              return (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>剤型</Text>
                  <View style={styles.formulationCell}>
                    <TouchableOpacity
                      onPress={() => handleFormulationPress(ft.code)}
                      accessibilityRole="link"
                      accessibilityLabel={`${ft.name}の詳細を見る`}
                    >
                      <Text style={styles.infoValueLink}>{ft.name}</Text>
                    </TouchableOpacity>
                    <Text style={styles.formulationSeparator}>·</Text>
                    <TouchableOpacity
                      onPress={() => handleFormulationPress(ft.code)}
                      accessibilityRole="link"
                      accessibilityLabel="同じ剤型の薬剤一覧を見る"
                    >
                      <Text style={styles.infoValueLinkSm}>同じ剤型の薬剤を見る</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
            {data.spreaderTypes.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>展着剤の分類</Text>
                <View style={styles.spreaderChipRow}>
                  {data.spreaderTypes.map((spreader) => (
                    <TouchableOpacity
                      key={spreader.id}
                      style={styles.spreaderChip}
                      onPress={() => handleSpreaderPress(spreader.slug)}
                      hitSlop={{ top: spacing2, bottom: spacing2, left: spacing2, right: spacing2 }}
                      accessibilityRole="button"
                      accessibilityLabel={`${spreader.name}の詳細を見る`}
                    >
                      <Text style={styles.spreaderChipText}>{spreader.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {resistanceRisk !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>耐性がつきやすいか</Text>
                <View
                  style={[
                    styles.resistanceBadge,
                    { backgroundColor: RESISTANCE_RISK_COLORS[resistanceRisk].bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.resistanceBadgeText,
                      { color: RESISTANCE_RISK_COLORS[resistanceRisk].text },
                    ]}
                  >
                    {RESISTANCE_RISK_LABEL[resistanceRisk]}
                  </Text>
                </View>
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
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={styles.sectionNote}>
                各成分ページでは同じ成分を含む薬剤の一覧を確認できます。
              </Text>
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
                  <TouchableOpacity
                    key={incompat.id}
                    style={styles.incompatRow}
                    onPress={() => handleIncompatPress(incompat.slug)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${incompat.name}の詳細を見る`}
                  >
                    <Text style={styles.incompatName}>{incompat.name}</Text>
                    {incompat.formulationTypeName !== null && (
                      <Text style={styles.relatedType}>{incompat.formulationTypeName}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text style={styles.relatedType}>
                特に登録・記載されている混用不可情報はありません。
              </Text>
            )}
          </View>

          {/* 対象病害虫（Webではセクション順序が最後） */}
          {data.effects.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                効果のある病害虫
              </Text>
              <Text style={styles.sectionNote}>
                病害虫名をタップすると病害虫図鑑の詳細ページへ移動します。
              </Text>
              {data.effects.map((effect) => {
                const isFungicideOrCompound =
                  data.pesticideType === 'fungicide' || data.pesticideType === 'compound';
                const isInsecticideOrAcaricideOrCompound =
                  data.pesticideType === 'insecticide' ||
                  data.pesticideType === 'acaricide' ||
                  data.pesticideType === 'compound';
                return (
                  <TouchableOpacity
                    key={effect.diseasePest.id}
                    style={styles.relatedRow}
                    onPress={() => handleDiseasePestPress(effect.diseasePest.slug)}
                    accessibilityRole="button"
                    accessibilityLabel={`${effect.diseasePest.name}の詳細を見る`}
                  >
                    <Text style={styles.relatedName}>{effect.diseasePest.name}</Text>
                    <View style={styles.effectRatingRow}>
                      {isFungicideOrCompound && (
                        <>
                          <EffectRatingBadge rating={effect.rating.preventionLevel} label="予防" />
                          <EffectRatingBadge rating={effect.rating.treatmentLevel} label="治療" />
                        </>
                      )}
                      {isInsecticideOrAcaricideOrCompound && (
                        <EffectRatingBadge rating={effect.rating.efficacyLevel} label="効果" />
                      )}
                      <EffectRatingBadge rating={effect.rating.persistenceLevel} label="持続" />
                    </View>
                  </TouchableOpacity>
                );
              })}
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

  // 登録番号未掲載バッジ（Web: MaffUnverifiedBadge amber-50 border-amber-300）
  unverifiedBadge: {
    borderWidth: 1,
    borderColor: colorPesticideWarningBorder,
    backgroundColor: colorWarningBg,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing2,
  },
  unverifiedTitle: {
    ...textSm,
    color: colorWarning,
    fontWeight: '600',
  },
  unverifiedBody: {
    ...textXs,
    color: colorWarning,
    lineHeight: 18,
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
    width: 96,
    flexShrink: 0,
  },
  infoValue: {
    ...textSm,
    color: colorTextPrimary,
    flex: 1,
  },
  infoValueLink: {
    ...textSm,
    color: colorTextLink,
    flex: 1,
    textDecorationLine: 'underline',
  },
  infoValueLinkSm: {
    ...textXs,
    color: colorTextLink,
    textDecorationLine: 'underline',
  },
  formulationCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  formulationSeparator: {
    ...textXs,
    color: colorTextSecondary,
  },
  spreaderChipRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  spreaderChip: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: spacing2,
  },
  spreaderChipText: {
    ...textXs,
    color: colorTextPrimary,
    fontWeight: '500',
  },

  // 耐性リスクバッジ（Web: rounded px-2 py-0.5 text-xs font-medium）
  resistanceBadge: {
    alignSelf: 'flex-start',
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  resistanceBadgeText: {
    ...textXs,
    fontWeight: '600',
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

  // 効果評価バッジ行（製品詳細の病害虫セクション内）
  effectRatingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
    marginTop: 4,
  },

  // 混用不可農薬セクション（警告スタイル：Web版の border-destructive/30 bg-destructive/5 に対応）
  incompatSection: {
    borderColor: colorPesticideWarningBorder,
    backgroundColor: colorPesticideWarningBg,
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
    borderBottomColor: colorPesticideWarningDivider,
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
