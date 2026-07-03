/**
 * @module app/hormones/interactions/index
 * ホルモン相互作用一覧画面。Web 版 /hormones/interactions の完全再現。
 * 相互作用ペアと type / description / bonsaiRelevance を表示する。
 * type を色分けバッジで表現する（相乗=緑 / 拮抗=赤 / 調節=黄）。
 * 仕様: docs/design/hormones-fertilizers-web-parity.md §4.16
 */

import React, { useCallback, useState, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHormoneInteractionsQuery } from '@/lib/queries/hormones';
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
  colorInteractionSynergyBg,
  colorInteractionSynergyText,
  colorInteractionAntagonismBg,
  colorInteractionAntagonismText,
  colorInteractionModulationBg,
  colorInteractionModulationText,
  colorDiagramEdgeSynergy,
  colorDiagramEdgeAntagonism,
  colorDiagramEdgeModulation,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusMd,
  radiusFull,
  shadowWashi,
  textSm,
  textXs,
  textLg,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

type HormoneInteractionItem = components['schemas']['HormoneInteractionListResponse']['items'][number];

// ---------------------------------------------------------------------------
// 相互作用タイプの色・ラベル・シンボル設定（Web 版 HormoneInteractionCard.tsx と同配色）
// ---------------------------------------------------------------------------

const INTERACTION_TYPE_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  edge: string;
  symbol: string;
  symbolDesc: string;
}> = {
  synergistic: {
    label: '相乗',
    bg: colorInteractionSynergyBg,
    text: colorInteractionSynergyText,
    edge: colorDiagramEdgeSynergy,
    // 双方向の強調：相乗は互いを強化する
    symbol: '⇄',
    symbolDesc: '相乗（双方向強化）',
  },
  antagonistic: {
    label: '拮抗',
    bg: colorInteractionAntagonismBg,
    text: colorInteractionAntagonismText,
    edge: colorDiagramEdgeAntagonism,
    // 対立の表現
    symbol: '⊥',
    symbolDesc: '拮抗（対立・抑制）',
  },
  modulatory: {
    label: '調節',
    bg: colorInteractionModulationBg,
    text: colorInteractionModulationText,
    edge: colorDiagramEdgeModulation,
    // 調節（片方向調整）
    symbol: '⇌',
    symbolDesc: '調節（相互調整）',
  },
};

const ALL_TYPES = ['synergistic', 'antagonistic', 'modulatory'] as const;

// ---------------------------------------------------------------------------
// 相互作用カード（memo）
// ---------------------------------------------------------------------------

type InteractionCardProps = {
  item: HormoneInteractionItem;
  onHormoneAPress: (slug: string) => void;
  onHormoneBPress: (slug: string) => void;
};

const InteractionCard = memo(function InteractionCard({
  item,
  onHormoneAPress,
  onHormoneBPress,
}: InteractionCardProps) {
  const typeConf = INTERACTION_TYPE_CONFIG[item.type] ?? {
    label: item.type,
    bg: colorSurfaceMuted,
    text: colorTextSecondary,
    edge: colorBorder,
    symbol: '↔',
    symbolDesc: item.type,
  };

  const handleHormoneAPress = useCallback(() => {
    onHormoneAPress(item.hormoneASlug);
  }, [item.hormoneASlug, onHormoneAPress]);

  const handleHormoneBPress = useCallback(() => {
    onHormoneBPress(item.hormoneBSlug);
  }, [item.hormoneBSlug, onHormoneBPress]);

  return (
    <View
      style={[styles.card, { borderLeftColor: typeConf.edge, borderLeftWidth: 4 }]}
      accessibilityRole="text"
      accessibilityLabel={`${item.hormoneAName} と ${item.hormoneBName} の${typeConf.label}関係`}
    >
      {/* 対ペア行：左ホルモン ← タイプシンボル → 右ホルモン */}
      <View style={styles.pairRow}>
        <Pressable
          onPress={handleHormoneAPress}
          style={styles.hormoneNameButton}
          accessibilityRole="button"
          accessibilityLabel={`${item.hormoneAName}の詳細を見る`}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={styles.hormoneName}>{item.hormoneAName}</Text>
        </Pressable>

        {/* タイプシンボル + バッジを縦積みで中央に */}
        <View style={styles.symbolBlock}>
          <Text
            style={[styles.typeSymbol, { color: typeConf.text }]}
            accessibilityLabel={typeConf.symbolDesc}
            accessibilityRole="text"
          >
            {typeConf.symbol}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: typeConf.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeConf.text }]}>
              {typeConf.label}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleHormoneBPress}
          style={styles.hormoneNameButton}
          accessibilityRole="button"
          accessibilityLabel={`${item.hormoneBName}の詳細を見る`}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={styles.hormoneName}>{item.hormoneBName}</Text>
        </Pressable>
      </View>

      {item.description !== null && item.description.length > 0 && (
        <Text style={styles.description}>{item.description}</Text>
      )}
      {item.bonsaiRelevance !== null && item.bonsaiRelevance.length > 0 && (
        <View style={styles.relevanceDivider}>
          <Text style={styles.relevance}>{item.bonsaiRelevance}</Text>
        </View>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// タイプフィルターバー（Web と同様の絞り込み機能）
// ---------------------------------------------------------------------------

type FilterBarProps = {
  activeTypes: ReadonlySet<string>;
  onToggleType: (type: string) => void;
};

const FilterBar = memo(function FilterBar({ activeTypes, onToggleType }: FilterBarProps) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>種類:</Text>
      {ALL_TYPES.map((type) => {
        const conf = INTERACTION_TYPE_CONFIG[type];
        const isActive = activeTypes.has(type);
        return (
          <Pressable
            key={type}
            onPress={() => { onToggleType(type); }}
            style={[
              styles.filterChip,
              isActive && { backgroundColor: conf.bg, borderColor: conf.edge },
            ]}
            accessibilityRole="checkbox"
            accessibilityLabel={`${conf.label}の相互作用を${isActive ? '非表示' : '表示'}`}
            accessibilityState={{ checked: isActive }}
          >
            <Text style={[styles.filterChipText, { color: isActive ? conf.text : colorTextSecondary }]}>
              {conf.symbol} {conf.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormoneInteractionsScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch } = useHormoneInteractionsQuery();

  const [activeTypes, setActiveTypes] = useState<ReadonlySet<string>>(
    new Set(ALL_TYPES),
  );

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

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

  const handleHormoneAPress = useCallback((slug: string) => {
    router.push(routeHormoneDetail(slug));
  }, []);

  const handleHormoneBPress = useCallback((slug: string) => {
    router.push(routeHormoneDetail(slug));
  }, []);

  const filteredItems = useMemo(
    () => (data?.items ?? []).filter((item) => activeTypes.has(item.type)),
    [data, activeTypes],
  );

  const renderItem = useCallback(
    ({ item }: { item: HormoneInteractionItem }) => (
      <InteractionCard
        item={item}
        onHormoneAPress={handleHormoneAPress}
        onHormoneBPress={handleHormoneBPress}
      />
    ),
    [handleHormoneAPress, handleHormoneBPress],
  );

  const extractKey = useCallback((item: HormoneInteractionItem) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'ホルモン相互作用', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'ホルモン相互作用', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="データを読み込めませんでした"
          description={ERR_HORMONES_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const ListHeader = (
    <View style={styles.listHeader}>
      <HormoneDisclaimer />
      <TouchableOpacity
        style={styles.diagramButton}
        onPress={() => router.push('/hormones/diagram')}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="相互作用ダイアグラムへ移動"
      >
        <Text style={styles.diagramButtonText}>ネットワーク図で見る →</Text>
      </TouchableOpacity>
      <FilterBar activeTypes={activeTypes} onToggleType={handleToggleType} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'ホルモン相互作用', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />
      <FlatList
        data={filteredItems}
        keyExtractor={extractKey}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <ScreenEmpty
            title="相互作用のデータはまだありません"
            iconName="link-outline"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
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
  listContent: {
    paddingHorizontal: spacing4,
  },
  listHeader: {
    paddingTop: spacing4,
    paddingBottom: spacing4,
    gap: spacing3,
  },
  diagramButton: {
    alignSelf: 'flex-start',
  },
  diagramButtonText: {
    ...textSm,
    color: colorActionPrimary,
    textDecorationLine: 'underline',
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

  // ---- カード ----
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    marginBottom: spacing3,
    gap: spacing3,
    ...shadowWashi,
  },

  // ---- 対ペア行 ----
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing2,
  },
  hormoneNameButton: {
    flex: 1,
    alignItems: 'center',
  },
  hormoneName: {
    ...textLg,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    textAlign: 'center',
  },

  // ---- タイプシンボルブロック（中央） ----
  symbolBlock: {
    alignItems: 'center',
    gap: spacing2,
    paddingHorizontal: spacing2,
  },
  typeSymbol: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: fontFamilySerifBold,
    textAlign: 'center',
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

  // ---- 説明・関連 ----
  description: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },
  relevanceDivider: {
    borderTopWidth: 1,
    borderTopColor: colorBorder,
    paddingTop: spacing2,
    marginTop: 0,
  },
  relevance: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
});
