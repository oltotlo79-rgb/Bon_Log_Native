/**
 * @module app/pesticides/disease-pests/[slug]/index
 * 病害虫詳細画面。症状・効果評価付き関連農薬製品リストを表示する。
 * 仕様: docs/design/browse-screens.md §5.4
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePesticideDiseasePestDetailQuery } from '@/lib/queries/pesticides';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
import { resolveApiImageUrl } from '@/lib/utils/resolve-api-image-url';
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
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusMd,
  radiusSm,
  shadowWashi,
  textBase,
  textLg,
  textMd,
  textSm,
  textXl,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型エイリアス（スキーマから）
// ---------------------------------------------------------------------------

type DiseasePestCategory = components['schemas']['DiseasePestCategory'];
type EffectRating = components['schemas']['EffectRating'];
type PesticideType = components['schemas']['PesticideType'];

// ---------------------------------------------------------------------------
// 体長表示ヘルパー（Web の BodySizeDisplay に準拠）
// ---------------------------------------------------------------------------

function buildBodySizeText(minMm: number | null, maxMm: number | null): string | null {
  if (minMm === null && maxMm === null) return null;
  if (minMm !== null && maxMm !== null && minMm === maxMm) return `約 ${minMm} mm`;
  if (minMm !== null && maxMm !== null) return `${minMm}〜${maxMm} mm`;
  if (minMm !== null) return `${minMm} mm 以上`;
  return `${maxMm} mm 以下`;
}

// ---------------------------------------------------------------------------
// カテゴリバッジ定義
// ---------------------------------------------------------------------------

const CATEGORY_BADGE: Record<DiseasePestCategory, { label: string; bg: string; text: string }> = {
  disease:           { label: '病害', bg: '#fee2e2', text: '#b91c1c' },
  pest:              { label: '害虫', bg: '#fef3c7', text: '#b45309' },
  beneficial_insect: { label: '益虫', bg: '#d1fae5', text: '#065f46' },
};

const CATEGORY_EMOJI: Record<DiseasePestCategory, string> = {
  disease:           '🦠',
  pest:              '🐛',
  beneficial_insect: '🐝',
};

// ---------------------------------------------------------------------------
// 農薬タイプバッジ定義（Web版 PESTICIDE_TYPE_BADGE を RN カラーで移植）
// ---------------------------------------------------------------------------

const PESTICIDE_TYPE_BADGE: Record<PesticideType, { label: string; bg: string; text: string }> = {
  fungicide:   { label: '殺菌剤', bg: '#e0f2fe', text: '#0369a1' },
  insecticide: { label: '殺虫剤', bg: '#ffedd5', text: '#c2410c' },
  acaricide:   { label: '殺ダニ剤', bg: '#ede9fe', text: '#6d28d9' },
  compound:    { label: '複合剤', bg: '#fdf4ff', text: '#a21caf' },
  other:       { label: 'その他', bg: '#f2f2f2', text: '#484848' },
};

// ---------------------------------------------------------------------------
// 効果評価バッジ定義（Web版 EffectRatingBadge を RN で再実装）
// ---------------------------------------------------------------------------

const EFFECT_RATING_CONFIG: Record<EffectRating, { mark: string; bg: string; text: string; border: string }> = {
  excellent: { mark: '◎', bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  good:      { mark: '○', bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },
  fair:      { mark: '△', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  poor:      { mark: '×', bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  none:      { mark: '—', bg: '#f2f2f2', text: '#8a8a8a', border: '#e4e4e4' },
};

type EffectRatingBadgeProps = {
  rating: EffectRating | null;
  label: string;
};

function EffectRatingBadge({ rating, label }: EffectRatingBadgeProps) {
  if (rating === null) return null;
  const config = EFFECT_RATING_CONFIG[rating];
  return (
    <View style={styles.ratingBadgeWrapper}>
      <Text style={styles.ratingBadgeLabel}>{label}</Text>
      <View style={[
        styles.ratingBadgeMark,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}>
        <Text style={[styles.ratingBadgeMarkText, { color: config.text }]}>{config.mark}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DiseasePestDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const rawSlug = params['slug'];
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const { data, isLoading, isError, refetch } = usePesticideDiseasePestDetailQuery(slug ?? '');
  const headerImageUri = resolveApiImageUrl(data?.imageUrl ?? null);

  const handleProductPress = useCallback((productSlug: string) => {
    router.push({ pathname: '/pesticides/products/[slug]', params: { slug: productSlug } });
  }, []);

  const categoryBadge = data !== undefined ? CATEGORY_BADGE[data.category] : null;
  const categoryEmoji = data !== undefined ? CATEGORY_EMOJI[data.category] : '🐛';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: data?.name ?? '病害虫詳細',
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
          {/* ヘッダー：画像 + 名前 + カテゴリバッジ（Web版の flex gap-4 ブロックに対応） */}
          <View style={styles.headerBlock}>
            {headerImageUri !== null ? (
              <Image
                source={{ uri: headerImageUri }}
                style={styles.headerImage}
                contentFit="cover"
                accessibilityLabel={`${data.name}の画像`}
              />
            ) : (
              <View style={styles.headerImagePlaceholder}>
                <Text style={styles.headerEmoji}>{categoryEmoji}</Text>
              </View>
            )}
            <View style={styles.headerMeta}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.name}>{data.name}</Text>
                {categoryBadge !== null && (
                  <View style={[styles.categoryBadge, { backgroundColor: categoryBadge.bg }]}>
                    <Text style={[styles.categoryBadgeText, { color: categoryBadge.text }]}>
                      {categoryBadge.label}
                    </Text>
                  </View>
                )}
              </View>
              {data.nameKana !== null && (
                <Text style={styles.nameKana}>{data.nameKana}</Text>
              )}
              {(data.category === 'pest' || data.category === 'beneficial_insect') && (() => {
                const sizeText = buildBodySizeText(data.bodySizeMinMm, data.bodySizeMaxMm);
                return sizeText !== null ? (
                  <Text style={styles.bodySize} accessibilityLabel={`体長: ${sizeText}`}>
                    体長: {sizeText}
                  </Text>
                ) : null;
              })()}
            </View>
          </View>

          {/* 概要説明（Web版 概要セクション） */}
          {data.description !== null && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                概要
              </Text>
              <Text style={styles.description}>{data.description}</Text>
            </View>
          )}

          {/* 効果評価凡例（Web版の効果評価説明行） */}
          {data.effects.length > 0 && (
            <View style={[styles.section, styles.sectionEffects]}>
              <View style={styles.effectsSectionHeader}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {data.category === 'beneficial_insect' ? '関連薬剤' : '効く薬剤'}
                </Text>
                <Text style={styles.effectsCount}>（{data.effects.length}件）</Text>
              </View>

              <View style={styles.ratingLegend}>
                <Text style={styles.ratingLegendLabel}>効果評価:</Text>
                {(['excellent', 'good', 'fair', 'poor'] as const).map((r) => {
                  const cfg = EFFECT_RATING_CONFIG[r];
                  return (
                    <View key={r} style={styles.ratingLegendItem}>
                      <View style={[styles.ratingBadgeMark, styles.ratingLegendMark, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                        <Text style={[styles.ratingBadgeMarkText, { color: cfg.text }]}>{cfg.mark}</Text>
                      </View>
                      <Text style={styles.ratingLegendText}>
                        {r === 'excellent' ? '優秀' : r === 'good' ? '良好' : r === 'fair' ? 'やや有効' : '効果低い'}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {data.effects.map((effect) => {
                const p = effect.pesticide;
                const typeBadge = PESTICIDE_TYPE_BADGE[p.pesticideType];
                const isFungicideOrCompound = p.pesticideType === 'fungicide' || p.pesticideType === 'compound';
                const isInsecticideOrAcaricide = p.pesticideType === 'insecticide' || p.pesticideType === 'acaricide';

                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.effectCard}
                    onPress={() => handleProductPress(p.slug)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name}の詳細を見る`}
                  >
                    <View style={styles.effectCardHeader}>
                      <Text style={styles.effectProductName} numberOfLines={1}>{p.name}</Text>
                      <View style={styles.effectCardBadgeGroup}>
                        {p.formulationType !== null && (
                          <Text style={styles.formulationTypeText}>{p.formulationType.name}</Text>
                        )}
                        <View style={[styles.pestTypeBadge, { backgroundColor: typeBadge.bg }]}>
                          <Text style={[styles.pestTypeBadgeText, { color: typeBadge.text }]}>
                            {typeBadge.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {p.activeIngredients.length > 0 && (
                      <View style={styles.ingredientTagRow}>
                        {p.activeIngredients.map((ing) => (
                          <View key={ing.id} style={styles.ingredientTag}>
                            <Text style={styles.ingredientTagText}>
                              {ing.name}
                              {ing.fracCode !== null ? `  FRAC:${ing.fracCode}` : ''}
                              {ing.iracCode !== null ? `  IRAC:${ing.iracCode}` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.ratingRow}>
                      {(isFungicideOrCompound || p.pesticideType === 'compound') && (
                        <>
                          <EffectRatingBadge rating={effect.rating.preventionLevel} label="予防" />
                          <EffectRatingBadge rating={effect.rating.treatmentLevel} label="治療" />
                        </>
                      )}
                      {(isInsecticideOrAcaricide || p.pesticideType === 'compound') && (
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

  // ヘッダーブロック（Web版 flex gap-4）
  headerBlock: {
    flexDirection: 'row',
    gap: spacing4,
    alignItems: 'flex-start',
  },
  headerImage: {
    width: 100,
    height: 100,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
    flexShrink: 0,
  },
  headerImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerEmoji: {
    fontSize: 36,
  },
  headerMeta: {
    flex: 1,
    gap: spacing2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  name: {
    ...textXl,
    color: colorTextPrimary,
  },
  nameKana: {
    ...textMd,
    color: colorTextSecondary,
  },
  bodySize: {
    ...textSm,
    color: colorTextSecondary,
  },
  categoryBadge: {
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    ...textXs,
    fontWeight: '600',
  },

  // 概要セクション（Web版の rounded-lg border p-4 ブロック）
  section: {
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    backgroundColor: colorSurface,
    gap: spacing3,
    ...shadowWashi,
  },
  sectionEffects: {
    gap: spacing3,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  description: {
    ...textBase,
    color: colorTextSecondary,
    lineHeight: 22,
  },

  // 効果評価セクション
  effectsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  effectsCount: {
    ...textSm,
    color: colorTextSecondary,
  },

  // 効果評価凡例（Web版の inline-flex 凡例行）
  ratingLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing2,
    paddingVertical: spacing2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colorBorderLight,
  },
  ratingLegendLabel: {
    ...textXs,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  ratingLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  ratingLegendMark: {
    width: 20,
    height: 20,
  },
  ratingLegendText: {
    ...textXs,
    color: colorTextSecondary,
  },

  // 農薬製品カード（Web版 rounded-lg border p-3 hover ブロック）
  effectCard: {
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing3,
    gap: spacing2,
    minHeight: 44,
    backgroundColor: colorBackground,
  },
  effectCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing2,
  },
  effectProductName: {
    ...textMd,
    color: colorTextLink,
    fontWeight: '600',
    flex: 1,
  },
  effectCardBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    flexShrink: 0,
  },
  formulationTypeText: {
    ...textXs,
    color: colorTextSecondary,
  },
  pestTypeBadge: {
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    flexShrink: 0,
  },
  pestTypeBadgeText: {
    ...textXs,
    fontWeight: '600',
  },
  ingredientTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  ingredientTag: {
    borderRadius: radiusSm,
    borderWidth: 1,
    borderColor: colorBorderLight,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  ingredientTagText: {
    ...textXs,
    color: colorTextSecondary,
  },

  // 効果評価バッジ
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  ratingBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  ratingBadgeLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  ratingBadgeMark: {
    width: 24,
    height: 24,
    borderRadius: radiusSm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadgeMarkText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
