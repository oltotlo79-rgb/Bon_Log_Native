/**
 * @module app/hormones/diagram/index
 * ホルモン相互作用ダイアグラム画面。Web 版 /hormones/diagram に対応。
 * ノード・エッジの描画は WebView 内のインライン SVG（HormoneInteractionDiagramView）に委譲し、
 * ノードタップは postMessage 経由で受け取って下部の詳細パネルに反映する。
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHormonesQuery, useHormoneInteractionsQuery } from '@/lib/queries/hormones';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { HormoneDisclaimer } from '@/components/hormone/HormoneDisclaimer';
import { HormoneInteractionDiagramView } from '@/components/hormone/HormoneInteractionDiagramView';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_HORMONES_LOAD_FAILED } from '@/lib/constants/errors';
import { routeHormoneDetail } from '@/lib/constants/routes';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorInteractionSynergyBg,
  colorInteractionSynergyText,
  colorInteractionAntagonismBg,
  colorInteractionAntagonismText,
  colorInteractionModulationBg,
  colorInteractionModulationText,
  colorDiagramEdgeSynergy,
  colorDiagramEdgeAntagonism,
  colorDiagramEdgeModulation,
  colorDiagramNodeMajor,
  colorDiagramNodeSecondary,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusMd,
  radiusFull,
  shadowWashi,
  textSm,
  textBase,
  textXs,
  textLg,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type HormoneInteractionItem = components['schemas']['HormoneInteractionListResponse']['items'][number];

// ---------------------------------------------------------------------------
// ダイアグラム凡例・種類フィルタ定数（Web 版 hormone-techniques.ts の移植）
// ---------------------------------------------------------------------------

const INTERACTION_TYPE_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  edge: string;
  symbol: string;
}> = {
  synergistic:  {
    label: '相乗',
    bg: colorInteractionSynergyBg,
    text: colorInteractionSynergyText,
    edge: colorDiagramEdgeSynergy,
    symbol: '⇄',
  },
  antagonistic: {
    label: '拮抗',
    bg: colorInteractionAntagonismBg,
    text: colorInteractionAntagonismText,
    edge: colorDiagramEdgeAntagonism,
    symbol: '⊥',
  },
  modulatory:   {
    label: '調節',
    bg: colorInteractionModulationBg,
    text: colorInteractionModulationText,
    edge: colorDiagramEdgeModulation,
    symbol: '⇌',
  },
};

const NODE_COLOR_MAJOR     = colorDiagramNodeMajor;
const NODE_COLOR_SECONDARY = colorDiagramNodeSecondary;

// ---------------------------------------------------------------------------
// 凡例コンポーネント
// ---------------------------------------------------------------------------

const DiagramLegend = memo(function DiagramLegend() {
  return (
    <View style={styles.legend}>
      <Text style={styles.legendTitle}>凡例</Text>
      <View style={styles.legendItems}>
        <View style={styles.legendItem}>
          <View style={[styles.legendNodeDot, { backgroundColor: NODE_COLOR_MAJOR }]} />
          <Text style={styles.legendText}>五大ホルモン</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendNodeDot, { backgroundColor: NODE_COLOR_SECONDARY }]} />
          <Text style={styles.legendText}>二次ホルモン</Text>
        </View>
        {Object.entries(INTERACTION_TYPE_CONFIG).map(([type, conf]) => (
          <View key={type} style={styles.legendItem}>
            <Text style={[styles.legendSymbol, { color: conf.text }]}>{conf.symbol}</Text>
            <View style={[styles.legendBadge, { backgroundColor: conf.bg }]}>
              <Text style={[styles.legendBadgeText, { color: conf.text }]}>{conf.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 相互作用カード（パネル内）：タイプ色の左ボーダーで結びつきを強調
// ---------------------------------------------------------------------------

type InteractionPairCardProps = {
  item: HormoneInteractionItem;
  selectedHormoneName: string;
};

const InteractionPairCard = memo(function InteractionPairCard({
  item,
  selectedHormoneName,
}: InteractionPairCardProps) {
  const conf = INTERACTION_TYPE_CONFIG[item.type] ?? {
    label: item.type,
    bg: colorSurfaceMuted,
    text: colorTextSecondary,
    edge: colorBorder,
    symbol: '↔',
  };
  const partnerName =
    item.hormoneAName === selectedHormoneName ? item.hormoneBName : item.hormoneAName;

  return (
    <View
      style={[styles.interactionPairCard, { borderLeftColor: conf.edge }]}
      accessibilityRole="text"
      accessibilityLabel={`${selectedHormoneName}と${partnerName}の${conf.label}関係`}
    >
      {/* 対ペア：選択ホルモン ← シンボル+バッジ → 相手ホルモン */}
      <View style={styles.pairRow}>
        <Text style={styles.pairSelf} numberOfLines={1}>{selectedHormoneName}</Text>
        <View style={styles.pairCenter}>
          <Text style={[styles.pairSymbol, { color: conf.text }]}>{conf.symbol}</Text>
          <View style={[styles.pairBadge, { backgroundColor: conf.bg }]}>
            <Text style={[styles.pairBadgeText, { color: conf.text }]}>{conf.label}</Text>
          </View>
        </View>
        <Text style={styles.pairPartner} numberOfLines={1}>{partnerName}</Text>
      </View>
      {item.description !== null && item.description.length > 0 && (
        <Text style={styles.interactionDesc} numberOfLines={2}>{item.description}</Text>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormoneDiagramScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const { data: hormones, isLoading: isHormonesLoading, isError: isHormonesError, refetch: refetchHormones } =
    useHormonesQuery();
  const { data: interactionsData, isLoading: isInteractionsLoading, isError: isInteractionsError, refetch: refetchInteractions } =
    useHormoneInteractionsQuery();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<ReadonlySet<string>>(
    new Set(['synergistic', 'antagonistic', 'modulatory']),
  );

  const isLoading = isHormonesLoading || isInteractionsLoading;
  const isError = isHormonesError || isInteractionsError;

  const handleRefresh = useCallback(() => {
    void refetchHormones();
    void refetchInteractions();
  }, [refetchHormones, refetchInteractions]);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleToggleType = useCallback((type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const majorHormones = useMemo(
    () => (hormones ?? []).filter((h) => h.category === 'major'),
    [hormones],
  );
  const secondaryHormones = useMemo(
    () => (hormones ?? []).filter((h) => h.category === 'secondary'),
    [hormones],
  );
  const allHormones = useMemo(() => [...majorHormones, ...secondaryHormones], [majorHormones, secondaryHormones]);

  const allInteractions = useMemo(() => interactionsData?.items ?? [], [interactionsData]);

  const filteredInteractions = useMemo(
    () => allInteractions.filter((edge) => activeTypes.has(edge.type)),
    [allInteractions, activeTypes],
  );

  const selectedHormone = useMemo(
    () => allHormones.find((h) => h.id === selectedNodeId) ?? null,
    [allHormones, selectedNodeId],
  );

  const selectedInteractions = useMemo(() => {
    if (selectedHormone === null) return [];
    return filteredInteractions.filter(
      (i) => i.hormoneAId === selectedHormone.id || i.hormoneBId === selectedHormone.id,
    );
  }, [selectedHormone, filteredInteractions]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '相互作用ダイアグラム', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '相互作用ダイアグラム', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="データを読み込めませんでした"
          description={ERR_HORMONES_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  if (allHormones.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '相互作用ダイアグラム', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenEmpty title="ダイアグラムデータがありません" iconName="git-network-outline" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '相互作用ダイアグラム', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.introText}>
            ホルモン間の関係をネットワーク図で可視化します。ノードをタップすると関連する相互作用が下部に表示されます。
          </Text>
        </View>

        <HormoneDisclaimer />

        {/* 種類フィルター */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>種類:</Text>
          {Object.entries(INTERACTION_TYPE_CONFIG).map(([type, conf]) => {
            const isActive = activeTypes.has(type);
            return (
              <Pressable
                key={type}
                onPress={() => { handleToggleType(type); }}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: conf.bg, borderColor: conf.edge },
                ]}
                accessibilityRole="checkbox"
                accessibilityLabel={`${conf.label}の相互作用を${isActive ? '非表示' : '表示'}`}
                accessibilityState={{ checked: isActive }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive ? { color: conf.text } : { color: colorTextSecondary },
                  ]}
                >
                  {conf.symbol} {conf.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ダイアグラム本体（WebView 内インライン SVG） */}
        <HormoneInteractionDiagramView
          hormones={allHormones}
          interactions={allInteractions}
          activeTypes={activeTypes}
          onNodeSelect={handleNodeSelect}
        />

        <DiagramLegend />

        {/* 選択ノードの相互作用パネル */}
        {selectedHormone !== null && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{selectedHormone.name} の相互作用</Text>
              <Pressable
                onPress={() => { router.push(routeHormoneDetail(selectedHormone.slug)); }}
                style={styles.panelDetailLink}
                accessibilityRole="button"
                accessibilityLabel={`${selectedHormone.name}の詳細を見る`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.panelDetailLinkText}>詳細を見る →</Text>
              </Pressable>
            </View>

            {selectedInteractions.length === 0 ? (
              <Text style={styles.panelEmpty}>
                {activeTypes.size === 0
                  ? 'フィルターをオンにしてください'
                  : '現在の条件で相互作用はありません'}
              </Text>
            ) : (
              <View style={styles.panelList}>
                {selectedInteractions.map((item) => (
                  <InteractionPairCard
                    key={item.id}
                    item={item}
                    selectedHormoneName={selectedHormone.name}
                  />
                ))}
              </View>
            )}

            <Pressable
              onPress={() => { router.push('/hormones/interactions'); }}
              style={styles.textListLink}
              accessibilityRole="button"
              accessibilityLabel="相互作用一覧（テキスト版）を見る"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.textListLinkText}>相互作用一覧（テキスト版）を見る →</Text>
            </Pressable>
          </View>
        )}

        {selectedHormone === null && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>ノードをタップすると相互作用が表示されます</Text>
            <Pressable
              onPress={() => { router.push('/hormones/interactions'); }}
              style={styles.textListLink}
              accessibilityRole="button"
              accessibilityLabel="相互作用一覧（テキスト版）を見る"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.textListLinkText}>相互作用一覧（テキスト版）を見る →</Text>
            </Pressable>
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
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing4,
  },

  intro: {
    // gap で管理
  },
  introText: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },

  // ---- フィルター ----
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  filterLabel: {
    ...textXs,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: 4,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    ...textXs,
  },

  // ---- 凡例 ----
  legend: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing2,
    ...shadowWashi,
  },
  legendTitle: {
    ...textXs,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing3,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  legendNodeDot: {
    width: 12,
    height: 12,
    borderRadius: radiusFull,
  },
  legendText: {
    ...textXs,
    color: colorTextSecondary,
  },
  legendSymbol: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fontFamilySerifBold,
  },
  legendBadge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  legendBadgeText: {
    ...textXs,
  },

  // ---- 選択ノードパネル ----
  panel: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing4,
    gap: spacing3,
    ...shadowWashi,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  panelDetailLink: {
    // hitSlop でタップエリア確保
  },
  panelDetailLinkText: {
    ...textSm,
    color: colorActionPrimary,
    textDecorationLine: 'underline',
  },
  panelList: {
    gap: spacing2,
  },
  panelEmpty: {
    ...textSm,
    color: colorTextSecondary,
  },

  // ---- 対ペアカード（パネル内）：タイプ色の左ボーダーで結びつきを強調 ----
  interactionPairCard: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    borderLeftWidth: 4,
    padding: spacing3,
    gap: spacing2,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pairSelf: {
    ...textBase,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
    flex: 1,
    textAlign: 'left',
  },
  pairCenter: {
    alignItems: 'center',
    gap: spacing2,
    paddingHorizontal: spacing2,
  },
  pairSymbol: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: fontFamilySerifBold,
    textAlign: 'center',
  },
  pairBadge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  pairBadgeText: {
    ...textXs,
    fontFamily: fontFamilySerifBold,
  },
  pairPartner: {
    ...textBase,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    flex: 1,
    textAlign: 'right',
  },
  interactionDesc: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 18,
  },

  // ---- ヒント・テキスト版リンク ----
  hint: {
    gap: spacing3,
    alignItems: 'flex-start',
  },
  hintText: {
    ...textSm,
    color: colorTextSecondary,
  },
  textListLink: {
    // hitSlop でタップエリア確保
  },
  textListLinkText: {
    ...textSm,
    color: colorActionPrimary,
    textDecorationLine: 'underline',
  },
});
