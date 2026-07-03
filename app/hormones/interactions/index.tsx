/**
 * @module app/hormones/interactions/index
 * ホルモン相互作用一覧画面。Web 版 /hormones/interactions の完全再現。
 * 相互作用ペアと type / description / bonsaiRelevance を表示する。
 * type を色分けバッジで表現する（相乗=緑 / 拮抗=赤 / 調節=黄）。
 * 仕様: docs/design/hormones-fertilizers-web-parity.md §4.16
 */

import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
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
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorInteractionSynergyBg,
  colorInteractionSynergyText,
  colorInteractionAntagonismBg,
  colorInteractionAntagonismText,
  colorInteractionModulationBg,
  colorInteractionModulationText,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusMd,
  radiusFull,
  shadowWashi,
  textBase,
  textSm,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

type HormoneInteractionItem = components['schemas']['HormoneInteractionListResponse']['items'][number];

// ---------------------------------------------------------------------------
// 相互作用タイプの色・ラベル設定（Web 版 HormoneInteractionCard.tsx と同配色）
// ---------------------------------------------------------------------------

const INTERACTION_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  synergistic: { label: '相乗', bg: colorInteractionSynergyBg, text: colorInteractionSynergyText },
  antagonistic: { label: '拮抗', bg: colorInteractionAntagonismBg, text: colorInteractionAntagonismText },
  modulatory: { label: '調節', bg: colorInteractionModulationBg, text: colorInteractionModulationText },
};

// ---------------------------------------------------------------------------
// 相互作用カード（memo）
// ---------------------------------------------------------------------------

type InteractionCardProps = {
  item: HormoneInteractionItem;
};

const InteractionCard = memo(function InteractionCard({ item }: InteractionCardProps) {
  const typeConf = INTERACTION_TYPE_CONFIG[item.type] ?? {
    label: item.type,
    bg: colorSurfaceMuted,
    text: colorTextSecondary,
  };

  return (
    <View
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={`${item.hormoneAName} と ${item.hormoneBName} の${typeConf.label}関係`}
    >
      <View style={styles.pairRow}>
        <Text style={styles.hormoneName}>{item.hormoneAName}</Text>
        <Text style={styles.arrow}>⟷</Text>
        <Text style={styles.hormoneName}>{item.hormoneBName}</Text>
        <View style={[styles.typeBadge, { backgroundColor: typeConf.bg }]}>
          <Text style={[styles.typeBadgeText, { color: typeConf.text }]}>
            {typeConf.label}
          </Text>
        </View>
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
// Screen
// ---------------------------------------------------------------------------

export default function HormoneInteractionsScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch } = useHormoneInteractionsQuery();

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: HormoneInteractionItem }) => <InteractionCard item={item} />,
    [],
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

  const items = data?.items ?? [];

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
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'ホルモン相互作用', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />
      <FlatList
        data={items}
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
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    marginBottom: spacing3,
    gap: spacing2,
    ...shadowWashi,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  hormoneName: {
    ...textBase,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  arrow: {
    ...textBase,
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
  description: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },
  relevanceDivider: {
    borderTopWidth: 1,
    borderTopColor: colorBorder,
    paddingTop: spacing2,
    marginTop: spacing2,
  },
  relevance: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
  actionPrimaryText: {
    color: colorActionPrimaryText,
  },
});
