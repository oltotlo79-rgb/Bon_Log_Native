/**
 * @module app/hormones/simulator/index
 * ホルモンバランスシミュレーター画面。Web 版 /hormones/simulator の完全再現。
 * 月選択 × 技法複数選択でホルモンバランス変動を予測するインタラクティブツール。
 * 計算ロジックは Web 版 HormoneBalanceSimulator.tsx と同一。
 * 仕様: docs/design/hormones-fertilizers-web-parity.md §4.19
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHormoneSimulatorQuery } from '@/lib/queries/hormones';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { HormoneDisclaimer } from '@/components/hormone/HormoneDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_HORMONES_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  colorTextPrimary,
  colorTextSecondary,
  colorTextInverse,
  colorLevelHighBg,
  colorLevelModerateBg,
  colorLevelLowBg,
  colorLevelMinimalBg,
  colorLevelMinimalText,
  colorDeltaIncrease,
  colorDeltaDecrease,
  colorEffectRedistributeBg,
  colorEffectRedistributeText,
  colorSurfaceWashi,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  radiusSm,
  radiusFull,
  textSm,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';
import {
  SIMULATOR_MAX_LEVEL,
  SIMULATOR_MIN_LEVEL,
  SIMULATOR_MAGNITUDE_DELTA,
  SIMULATOR_LEVEL_THRESHOLDS,
} from '@/lib/constants/limits/hormone-simulator';

type SimulatorHormone = components['schemas']['HormoneSimulatorResponse']['hormones'][number];
type SimulatorTechniqueItem = components['schemas']['HormoneSimulatorResponse']['techniques'][number];
type SimulatorTechniqueEffect = SimulatorTechniqueItem['effects'][number];
type SimulatorSeasonalLevel = components['schemas']['HormoneSimulatorResponse']['seasonalLevels'][number];

// ---------------------------------------------------------------------------
// 月ラベル（Web 版 MONTH_LABELS と同一）
// ---------------------------------------------------------------------------

const MONTH_LABELS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
] as const;

// ---------------------------------------------------------------------------
// 活性レベル設定（Web 版 HORMONE_LEVEL_CONFIG と同値）
// ---------------------------------------------------------------------------

type ActivityLevel = 'high' | 'moderate' | 'low' | 'minimal';

const LEVEL_CONFIG: Record<ActivityLevel, { bg: string; text: string; label: string; numericValue: number }> = {
  high: { bg: colorLevelHighBg, text: colorTextInverse, label: '高', numericValue: 3 },
  moderate: { bg: colorLevelModerateBg, text: colorTextInverse, label: '中', numericValue: 2 },
  low: { bg: colorLevelLowBg, text: colorTextInverse, label: '低', numericValue: 1 },
  minimal: { bg: colorLevelMinimalBg, text: colorLevelMinimalText, label: '微', numericValue: 0 },
};

// Web 版 TECHNIQUE_EFFECT_TYPE_LABELS と同一
const EFFECT_TYPE_LABELS: Record<string, string> = {
  increase: '増加',
  decrease: '減少',
  redistribute: '再分配',
  combined: '複合効果',
};

// Web 版 TECHNIQUE_MAGNITUDE_LABELS と同一
const MAGNITUDE_LABELS: Record<string, string> = {
  strong: '強',
  moderate: '中',
  mild: '弱',
};

function isActivityLevel(value: string): value is ActivityLevel {
  return value === 'high' || value === 'moderate' || value === 'low' || value === 'minimal';
}

function getLevelConfig(level: string) {
  const key = isActivityLevel(level) ? level : 'minimal';
  return LEVEL_CONFIG[key];
}

function levelToNumeric(level: string): number {
  return getLevelConfig(level).numericValue;
}

function numericToLevel(value: number): ActivityLevel {
  return SIMULATOR_LEVEL_THRESHOLDS.find(({ min }) => value >= min)?.level ?? 'minimal';
}

// ---------------------------------------------------------------------------
// シミュレーター計算（Web 版 HormoneBalanceSimulator と同一ロジック）
// ---------------------------------------------------------------------------

type BaselineLevels = Map<string, { level: string; numericValue: number }>;

function calcBaseline(
  hormones: SimulatorHormone[],
  seasonalLevels: SimulatorSeasonalLevel[],
  month: number,
): BaselineLevels {
  const result: BaselineLevels = new Map();
  for (const hormone of hormones) {
    const entry = seasonalLevels.find((s) => s.hormoneId === hormone.id && s.month === month);
    const level = entry?.level ?? 'minimal';
    result.set(hormone.id, { level, numericValue: levelToNumeric(level) });
  }
  return result;
}

type PredictedEntry = {
  baseline: number;
  delta: number;
  predicted: number;
  predictedLevel: ActivityLevel;
  effectType: string | null;
  magnitude: string | null;
};

function calcPredicted(
  hormones: SimulatorHormone[],
  techniques: SimulatorTechniqueItem[],
  baselineLevels: BaselineLevels,
  selectedTechniques: Set<string>,
): Map<string, PredictedEntry> | null {
  if (selectedTechniques.size === 0) return null;

  const result = new Map<string, PredictedEntry>();
  for (const hormone of hormones) {
    const baseline = baselineLevels.get(hormone.id)?.numericValue ?? 0;

    // techniques の構造: { techniqueKey, nameJa, nameEn, effects: [{hormoneId, effectType, magnitude}] }
    // selectedTechniques は techniqueKey を保持する
    const matchingEffects: SimulatorTechniqueEffect[] = [];
    for (const tech of techniques) {
      if (!selectedTechniques.has(tech.techniqueKey)) continue;
      for (const eff of tech.effects) {
        if (eff.hormoneId === hormone.id) matchingEffects.push(eff);
      }
    }

    let delta = 0;
    let effectType: string | null = null;
    let magnitude: string | null = null;

    for (const mt of matchingEffects) {
      const magnitudeDelta = SIMULATOR_MAGNITUDE_DELTA[mt.magnitude] ?? 0;
      if (mt.effectType === 'increase') delta += magnitudeDelta;
      else if (mt.effectType === 'decrease') delta -= magnitudeDelta;

      effectType = matchingEffects.length === 1 ? mt.effectType : 'combined';
      magnitude = matchingEffects.length === 1 ? mt.magnitude : null;
    }

    const predicted = Math.min(SIMULATOR_MAX_LEVEL, Math.max(SIMULATOR_MIN_LEVEL, baseline + delta));
    result.set(hormone.id, {
      baseline,
      delta,
      predicted,
      predictedLevel: numericToLevel(predicted),
      effectType,
      magnitude,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormoneSimulatorScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const rawParams = useLocalSearchParams();

  // カレンダー画面から month パラメータで遷移する
  const monthParam = rawParams['month'];
  const monthParamNum = typeof monthParam === 'string' ? parseInt(monthParam, 10) : NaN;
  const initialMonth =
    !isNaN(monthParamNum) && monthParamNum >= 1 && monthParamNum <= 12
      ? monthParamNum
      : new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedTechniques, setSelectedTechniques] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useHormoneSimulatorQuery();

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const toggleTechnique = useCallback((slug: string) => {
    setSelectedTechniques((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const clearTechniques = useCallback(() => {
    setSelectedTechniques(new Set());
  }, []);

  const baselineLevels = useMemo(() => {
    if (data === undefined) return new Map<string, { level: string; numericValue: number }>();
    return calcBaseline(data.hormones, data.seasonalLevels, selectedMonth);
  }, [data, selectedMonth]);

  const predictedLevels = useMemo(() => {
    if (data === undefined) return null;
    return calcPredicted(data.hormones, data.techniques, baselineLevels, selectedTechniques);
  }, [data, baselineLevels, selectedTechniques]);

  const hasSelected = selectedTechniques.size > 0;

  // 技法の techniqueKey / nameJa 一覧（技法ごとに 1 エントリ）
  const uniqueTechniques = useMemo(() => {
    if (data === undefined) return [];
    const seen = new Set<string>();
    const result: Array<{ key: string; nameJa: string }> = [];
    for (const t of data.techniques) {
      if (!seen.has(t.techniqueKey)) {
        seen.add(t.techniqueKey);
        result.push({ key: t.techniqueKey, nameJa: t.nameJa });
      }
    }
    return result;
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'ホルモンバランスシミュレーター', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError || data === undefined) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'ホルモンバランスシミュレーター', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="データを読み込めませんでした"
          description={ERR_HORMONES_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const barMaxWidth = SIMULATOR_MAX_LEVEL;
  const selectedTechniqueNames = uniqueTechniques
    .filter((t) => selectedTechniques.has(t.key))
    .map((t) => t.nameJa);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'ホルモンバランスシミュレーター', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HormoneDisclaimer />

        {/* 月選択 — 6列 × 2行 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>月を選択</Text>
          <View style={styles.monthGrid}>
            {MONTH_LABELS.map((label, i) => {
              const month = i + 1;
              const isSelected = selectedMonth === month;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.monthButton, isSelected && styles.monthButtonSelected]}
                  onPress={() => setSelectedMonth(month)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}を選択`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.monthButtonText, isSelected && styles.monthButtonTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 技法選択 — 2列グリッド */}
        <View style={styles.section}>
          <View style={styles.techniqueSectionHeader}>
            <Text style={styles.sectionTitle}>技法を選択（複数可）</Text>
            {hasSelected && (
              <TouchableOpacity
                onPress={clearTechniques}
                accessibilityRole="button"
                accessibilityLabel="選択中の技法をすべて解除"
              >
                <Text style={styles.clearButton}>すべて解除</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.techniqueGrid}>
            {uniqueTechniques.map(({ key, nameJa }) => {
              const isSelected = selectedTechniques.has(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.techniqueButton, isSelected && styles.techniqueButtonSelected]}
                  onPress={() => toggleTechnique(key)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${nameJa}を${isSelected ? '解除' : '選択'}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.techniqueButtonText, isSelected && styles.techniqueButtonTextSelected]}>
                    {nameJa}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* バランス結果 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {MONTH_LABELS[selectedMonth - 1]}のホルモンバランス
            {hasSelected && selectedTechniqueNames.length > 0 && (
              <Text style={styles.selectedTechniqueLabel}>
                {` ＋ ${selectedTechniqueNames.join(' + ')}`}
              </Text>
            )}
          </Text>

          <View style={styles.hormoneList}>
            {data.hormones.map((hormone) => {
              const baseline = baselineLevels.get(hormone.id);
              const prediction = predictedLevels?.get(hormone.id);
              const baseLevel = baseline?.level ?? 'minimal';
              const baseConf = getLevelConfig(baseLevel);
              const baseValue = baseline?.numericValue ?? 0;

              const showPrediction = prediction !== undefined && hasSelected;
              const predictedConf = showPrediction ? getLevelConfig(prediction.predictedLevel) : null;

              return (
                <View
                  key={hormone.id}
                  style={styles.hormoneItem}
                  accessibilityRole="text"
                  accessibilityLabel={`${hormone.name} 基準: ${baseConf.label}${showPrediction && prediction.effectType !== null ? ` → ${EFFECT_TYPE_LABELS[prediction.effectType] ?? ''}` : ''}`}
                >
                  {/* ホルモン名 + バッジ */}
                  <View style={styles.hormoneItemTop}>
                    <Text style={styles.hormoneNameText}>{hormone.name}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.levelBadge, { backgroundColor: baseConf.bg }]}>
                        <Text style={[styles.levelBadgeText, { color: baseConf.text }]}>
                          {baseConf.label}
                        </Text>
                      </View>
                      {showPrediction && prediction.effectType !== null && (
                        <>
                          <Text style={styles.arrowText}>→</Text>
                          {prediction.effectType === 'redistribute' ? (
                            <View style={styles.redistributeBadge}>
                              <Text style={styles.redistributeBadgeText}>
                                {EFFECT_TYPE_LABELS.redistribute}
                              </Text>
                            </View>
                          ) : (
                            predictedConf !== null && (
                              <View style={[styles.levelBadge, { backgroundColor: predictedConf.bg }]}>
                                <Text style={[styles.levelBadgeText, { color: predictedConf.text }]}>
                                  {predictedConf.label}
                                </Text>
                              </View>
                            )
                          )}
                          <Text style={styles.effectDetailText}>
                            ({EFFECT_TYPE_LABELS[prediction.effectType] ?? ''}
                            {prediction.magnitude !== null ? ` ${MAGNITUDE_LABELS[prediction.magnitude] ?? ''}` : ''})
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  {/* バーグラフ */}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barBaseline,
                        {
                          backgroundColor: baseConf.bg,
                          flex: baseValue / barMaxWidth,
                        },
                      ]}
                    />
                    {showPrediction && prediction.delta !== 0 && (
                      <View
                        style={[
                          styles.barDelta,
                          {
                            backgroundColor: prediction.delta > 0 ? colorDeltaIncrease : colorDeltaDecrease,
                            flex: Math.abs(prediction.delta) / barMaxWidth,
                          },
                        ]}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 注意書き */}
        <Text style={styles.notice}>
          ※ シミュレーション結果は植物生理学の一般的な知見に基づく概算です。実際の効果は樹種・樹齢・環境条件により異なります。
        </Text>
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
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing6,
  },
  section: {
    gap: spacing3,
  },
  sectionTitle: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },

  // 月選択
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  monthButton: {
    flex: 1,
    minWidth: 44,
    minHeight: 44,
    paddingVertical: spacing2,
    borderRadius: radiusSm,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonSelected: {
    backgroundColor: colorActionPrimary,
  },
  monthButtonText: {
    ...textXs,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
  },
  monthButtonTextSelected: {
    color: colorActionPrimaryText,
  },

  // 技法選択
  techniqueSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearButton: {
    ...textXs,
    color: colorTextSecondary,
  },
  techniqueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  techniqueButton: {
    minHeight: 44,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    backgroundColor: colorSurface,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '45%',
    flex: 1,
  },
  techniqueButtonSelected: {
    borderColor: colorActionPrimary,
    backgroundColor: colorSurfaceWashi,
  },
  techniqueButtonText: {
    ...textXs,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    textAlign: 'center',
  },
  techniqueButtonTextSelected: {
    color: colorActionPrimary,
  },

  // バランス結果
  hormoneList: {
    gap: spacing3,
  },
  hormoneItem: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing3,
    gap: spacing2,
  },
  hormoneItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  hormoneNameText: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    flexWrap: 'wrap',
  },
  levelBadge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  levelBadgeText: {
    fontSize: 10,
    fontFamily: fontFamilySerifBold,
    lineHeight: 14,
  },
  arrowText: {
    ...textXs,
    color: colorTextSecondary,
  },
  redistributeBadge: {
    backgroundColor: colorEffectRedistributeBg,
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  redistributeBadgeText: {
    fontSize: 10,
    fontFamily: fontFamilySerifBold,
    color: colorEffectRedistributeText,
    lineHeight: 14,
  },
  effectDetailText: {
    ...textXs,
    color: colorTextSecondary,
  },
  selectedTechniqueLabel: {
    ...textSm,
    color: colorTextSecondary,
    fontFamily: undefined,
  },
  barTrack: {
    flexDirection: 'row',
    height: 16,
    borderRadius: radiusSm,
    overflow: 'hidden',
    backgroundColor: colorBorderLight,
  },
  barBaseline: {
    height: '100%',
    minWidth: 2,
    borderRadius: radiusSm,
  },
  barDelta: {
    height: '100%',
    minWidth: 2,
  },
  notice: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    paddingTop: spacing3,
  },
});
