/**
 * @module app/hormones/[slug]/index
 * 植物ホルモン詳細画面。効果・季節的変動バー・実践のコツ・相互作用・関連技法を表示する。
 * 仕様: docs/design/hormones-fertilizers-web-parity.md §4.14
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHormoneDetailQuery } from '@/lib/queries/hormones';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { HormoneSeasonalChart } from '@/components/common/SimpleBarChart';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_HORMONES_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusSm,
  radiusMd,
  radiusFull,
  textBase,
  textLg,
  textMd,
  textSm,
  textXl,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

type HormoneDetailInteraction = components['schemas']['HormoneDetail']['interactions'][number];
type HormoneDetailTechnique = components['schemas']['HormoneDetail']['techniques'][number];

// ---------------------------------------------------------------------------
// 相互作用タイプ設定
// ---------------------------------------------------------------------------

const INTERACTION_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  synergistic: { label: '相乗', bg: '#dcfce7', text: '#166534' },
  antagonistic: { label: '拮抗', bg: '#fee2e2', text: '#991b1b' },
  modulatory: { label: '調節', bg: '#fef9c3', text: '#854d0e' },
};

// 技法 effectType 設定
const TECH_EFFECT_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  increase: { label: '増加', bg: '#dcfce7', text: '#166534' },
  decrease: { label: '減少', bg: '#fee2e2', text: '#991b1b' },
  redistribute: { label: '再分配', bg: '#dbeafe', text: '#1e40af' },
};

const MAGNITUDE_LABELS: Record<string, string> = {
  strong: '強',
  moderate: '中',
  mild: '弱',
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormoneDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const handleInteractionsPress = useCallback(() => {
    router.push('/hormones/interactions');
  }, []);

  const handleTechniquesPress = useCallback(() => {
    router.push('/hormones/techniques');
  }, []);

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

          {/* 相互作用セクション */}
          {data.interactions !== undefined && data.interactions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  相互作用
                </Text>
                <TouchableOpacity
                  onPress={handleInteractionsPress}
                  accessibilityRole="button"
                  accessibilityLabel="相互作用一覧をすべて見る"
                >
                  <Text style={styles.seeAllLink}>すべて見る →</Text>
                </TouchableOpacity>
              </View>
              {data.interactions.map((interaction: HormoneDetailInteraction) => {
                const typeConf = INTERACTION_TYPE_CONFIG[interaction.type] ?? {
                  label: interaction.type,
                  bg: colorSurfaceMuted,
                  text: colorTextSecondary,
                };
                return (
                  <View
                    key={interaction.id}
                    style={styles.interactionCard}
                    accessibilityRole="text"
                    accessibilityLabel={`${interaction.hormoneAName} と ${interaction.hormoneBName} の${typeConf.label}関係`}
                  >
                    <View style={styles.pairRow}>
                      <Text style={styles.interactionHormoneName}>{interaction.hormoneAName}</Text>
                      <Text style={styles.arrowText}>⟷</Text>
                      <Text style={styles.interactionHormoneName}>{interaction.hormoneBName}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: typeConf.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: typeConf.text }]}>
                          {typeConf.label}
                        </Text>
                      </View>
                    </View>
                    {interaction.description !== null && interaction.description.length > 0 && (
                      <Text style={styles.interactionDesc}>{interaction.description}</Text>
                    )}
                    {interaction.bonsaiRelevance !== null && interaction.bonsaiRelevance.length > 0 && (
                      <View style={styles.relevanceDivider}>
                        <Text style={styles.relevance}>{interaction.bonsaiRelevance}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* 関連する盆栽技法セクション */}
          {data.techniques !== undefined && data.techniques.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  関連する盆栽技法
                </Text>
                <TouchableOpacity
                  onPress={handleTechniquesPress}
                  accessibilityRole="button"
                  accessibilityLabel="技法一覧をすべて見る"
                >
                  <Text style={styles.seeAllLink}>すべて見る →</Text>
                </TouchableOpacity>
              </View>
              {data.techniques.map((tech: HormoneDetailTechnique) => {
                const effectConf = TECH_EFFECT_TYPE_CONFIG[tech.effectType] ?? {
                  label: tech.effectType,
                  bg: colorSurfaceMuted,
                  text: colorTextSecondary,
                };
                const magnitudeLabel = MAGNITUDE_LABELS[tech.magnitude] ?? tech.magnitude;
                return (
                  <View
                    key={`${tech.techniqueKey}-${tech.effectType}`}
                    style={styles.techniqueRow}
                    accessibilityRole="text"
                    accessibilityLabel={`${tech.techniqueNameJa} ${effectConf.label} 影響度 ${magnitudeLabel}`}
                  >
                    <View style={styles.techniqueTop}>
                      <Text style={styles.techniqueNameText}>{tech.techniqueNameJa}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: effectConf.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: effectConf.text }]}>
                          {effectConf.label}
                        </Text>
                      </View>
                      <Text style={styles.magnitudeText}>（影響度: {magnitudeLabel}）</Text>
                    </View>
                    {tech.mechanism !== null && tech.mechanism.length > 0 && (
                      <Text style={styles.techniqueDesc}>{tech.mechanism}</Text>
                    )}
                  </View>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing2,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  seeAllLink: {
    ...textSm,
    color: colorActionPrimary,
    textDecorationLine: 'underline',
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

  // 相互作用カード
  interactionCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing3,
    gap: spacing2,
    marginTop: spacing2,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  interactionHormoneName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  arrowText: {
    ...textSm,
    color: colorTextSecondary,
  },
  typeBadge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  typeBadgeText: {
    ...textXs,
    fontFamily: fontFamilySerifBold,
  },
  interactionDesc: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },
  relevanceDivider: {
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    paddingTop: spacing2,
  },
  relevance: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },

  // 関連技法行
  techniqueRow: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing2,
    marginTop: spacing2,
  },
  techniqueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  techniqueNameText: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  magnitudeText: {
    ...textXs,
    color: colorTextSecondary,
  },
  techniqueDesc: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
});
