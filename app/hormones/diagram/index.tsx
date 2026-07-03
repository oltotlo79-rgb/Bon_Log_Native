/**
 * @module app/hormones/diagram/index
 * ホルモン相互作用ダイアグラム画面。Web 版 /hormones/diagram に対応。
 * SVG 禁止のため View の絶対配置でノードを円形配置し、
 * ノードタップで下部に相互作用一覧をパネル表示するインタラクティブ方式を採用。
 * 線描画が不要になるため RN の制約（SVG 禁止）と相性が良い。
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
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

type HormoneItem = components['schemas']['HormoneItem'];
type HormoneInteractionItem = components['schemas']['HormoneInteractionListResponse']['items'][number];

// ---------------------------------------------------------------------------
// ダイアグラム定数（Web 版 hormone-techniques.ts の移植）
// ---------------------------------------------------------------------------

const NODE_RADIUS = 36;
const NODE_LABEL_MAX_LENGTH = 4;

const INTERACTION_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; edge: string }> = {
  synergistic:  { label: '相乗', bg: '#dcfce7', text: '#166534', edge: '#22c55e' },
  antagonistic: { label: '拮抗', bg: '#fee2e2', text: '#991b1b', edge: '#ef4444' },
  modulatory:   { label: '調節', bg: '#fef9c3', text: '#854d0e', edge: '#eab308' },
};

const NODE_COLOR_MAJOR     = '#166534';
const NODE_COLOR_SECONDARY = '#1e40af';
const NODE_COLOR_SELECTED  = '#92400e';

// ---------------------------------------------------------------------------
// 円形配置計算
// ---------------------------------------------------------------------------

type NodePosition = {
  x: number;
  y: number;
};

function calcCirclePositions(
  items: HormoneItem[],
  cx: number,
  cy: number,
  radius: number,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  items.forEach((h, i) => {
    const angle = (2 * Math.PI * i) / items.length - Math.PI / 2;
    positions.set(h.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });
  return positions;
}

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
// 相互作用カード（パネル内）
// ---------------------------------------------------------------------------

type InteractionRowProps = {
  item: HormoneInteractionItem;
  selectedHormoneName: string;
};

const InteractionRow = memo(function InteractionRow({ item, selectedHormoneName }: InteractionRowProps) {
  const conf = INTERACTION_TYPE_CONFIG[item.type] ?? {
    label: item.type,
    bg: colorSurfaceMuted,
    text: colorTextSecondary,
    edge: colorBorder,
  };
  const partnerName =
    item.hormoneAName === selectedHormoneName ? item.hormoneBName : item.hormoneAName;

  return (
    <View
      style={styles.interactionRow}
      accessibilityRole="text"
      accessibilityLabel={`${selectedHormoneName}と${partnerName}の${conf.label}関係`}
    >
      <View style={[styles.typeBadge, { backgroundColor: conf.bg }]}>
        <Text style={[styles.typeBadgeText, { color: conf.text }]}>{conf.label}</Text>
      </View>
      <Text style={styles.partnerName}>{partnerName}</Text>
      {item.description !== null && item.description.length > 0 && (
        <Text style={styles.interactionDesc} numberOfLines={2}>{item.description}</Text>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// ホルモンノード（Pressable）
// ---------------------------------------------------------------------------

type HormoneNodeProps = {
  hormone: HormoneItem;
  position: NodePosition;
  isSelected: boolean;
  isHighlighted: boolean;
  onPress: (id: string) => void;
};

const HormoneNode = memo(function HormoneNode({
  hormone,
  position,
  isSelected,
  isHighlighted,
  onPress,
}: HormoneNodeProps) {
  const handlePress = useCallback(() => { onPress(hormone.id); }, [hormone.id, onPress]);

  const bgColor = isSelected
    ? NODE_COLOR_SELECTED
    : hormone.category === 'major'
      ? NODE_COLOR_MAJOR
      : NODE_COLOR_SECONDARY;

  const label =
    hormone.name.length > NODE_LABEL_MAX_LENGTH
      ? hormone.name.slice(0, NODE_LABEL_MAX_LENGTH) + '…'
      : hormone.name;

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.node,
        {
          left: position.x - NODE_RADIUS,
          top: position.y - NODE_RADIUS,
          width: NODE_RADIUS * 2,
          height: NODE_RADIUS * 2,
          borderRadius: NODE_RADIUS,
          backgroundColor: bgColor,
          opacity: isHighlighted ? 1 : 0.25,
          borderWidth: isSelected ? 3 : 0,
          borderColor: isSelected ? '#f59e0b' : 'transparent',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${hormone.name}のホルモン。タップで相互作用を表示`}
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={styles.nodeLabel} numberOfLines={2} adjustsFontSizeToFit>
        {label}
      </Text>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormoneDiagramScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
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

  const handleNodePress = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
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

  // ダイアグラムエリアのサイズ（横幅 - パディング）
  const diagramSize = screenWidth - spacing4 * 2;
  const cx = diagramSize / 2;
  const cy = diagramSize / 2;
  // 内側（五大ホルモン）・外側（二次ホルモン）の半径
  const majorRadius = diagramSize * 0.28;
  const secondaryRadius = diagramSize * 0.42;

  const majorHormones = useMemo(
    () => (hormones ?? []).filter((h) => h.category === 'major'),
    [hormones],
  );
  const secondaryHormones = useMemo(
    () => (hormones ?? []).filter((h) => h.category === 'secondary'),
    [hormones],
  );
  const allHormones = useMemo(() => [...majorHormones, ...secondaryHormones], [majorHormones, secondaryHormones]);

  const positions = useMemo(() => {
    const majorPos = calcCirclePositions(majorHormones, cx, cy, majorRadius);
    const secondaryPos = calcCirclePositions(secondaryHormones, cx, cy, secondaryRadius);
    return new Map([...majorPos, ...secondaryPos]);
  }, [majorHormones, secondaryHormones, cx, cy, majorRadius, secondaryRadius]);

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

  const isNodeHighlighted = useCallback(
    (nodeId: string): boolean => {
      if (selectedNodeId === null) return true;
      if (nodeId === selectedNodeId) return true;
      return filteredInteractions.some(
        (i) =>
          (i.hormoneAId === selectedNodeId && i.hormoneBId === nodeId) ||
          (i.hormoneBId === selectedNodeId && i.hormoneAId === nodeId),
      );
    },
    [selectedNodeId, filteredInteractions],
  );

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
                  {conf.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ダイアグラムエリア */}
        <View
          style={[styles.diagramArea, { width: diagramSize, height: diagramSize }]}
          accessibilityLabel="ホルモン相互作用ダイアグラム"
        >
          {allHormones.map((hormone) => {
            const pos = positions.get(hormone.id);
            if (pos === undefined) return null;
            return (
              <HormoneNode
                key={hormone.id}
                hormone={hormone}
                position={pos}
                isSelected={selectedNodeId === hormone.id}
                isHighlighted={isNodeHighlighted(hormone.id)}
                onPress={handleNodePress}
              />
            );
          })}
        </View>

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
                  <InteractionRow
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
    paddingHorizontal: spacing2,
    paddingVertical: 4,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    ...textXs,
  },

  // ---- ダイアグラムエリア ----
  diagramArea: {
    position: 'relative',
    alignSelf: 'center',
  },
  node: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  nodeLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: fontFamilySerifBold,
    textAlign: 'center',
    lineHeight: 13,
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
  interactionRow: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  typeBadgeText: {
    ...textXs,
    fontFamily: fontFamilySerifBold,
  },
  partnerName: {
    ...textBase,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
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
