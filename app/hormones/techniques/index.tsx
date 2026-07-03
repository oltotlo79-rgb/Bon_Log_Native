/**
 * @module app/hormones/techniques/index
 * 技法とホルモン画面。Web 版 /hormones/techniques の完全再現。
 * 技法ごとに関与ホルモンと effectType / magnitude を表示する。
 * 仕様: docs/design/hormones-fertilizers-web-parity.md §4.15
 */

import React, { useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHormoneTechniquesQuery } from '@/lib/queries/hormones';
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

type HormoneTechniqueGroup = components['schemas']['HormoneTechniqueListResponse']['items'][number];
type HormoneTechniqueEffect = HormoneTechniqueGroup['effects'][number];

// ---------------------------------------------------------------------------
// 技法ごとに effectType / magnitude の日本語ラベルと色を定義
// ---------------------------------------------------------------------------

const EFFECT_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
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
// 技法カード（memo）
// ---------------------------------------------------------------------------

type TechniqueCardProps = {
  group: HormoneTechniqueGroup;
  onHormonePress: (slug: string) => void;
};

const TechniqueCard = memo(function TechniqueCard({
  group,
  onHormonePress,
}: TechniqueCardProps) {
  return (
    <View
      style={styles.card}
      accessibilityRole="none"
    >
      <Text style={styles.techniqueName}>{group.techniqueNameJa}</Text>
      {group.techniqueNameEn !== null && group.techniqueNameEn.length > 0 && (
        <Text style={styles.techniqueNameEn}>{group.techniqueNameEn}</Text>
      )}

      {group.effects.length > 0 ? (
        <View style={styles.effectList}>
          {group.effects.map((effect: HormoneTechniqueEffect) => {
            const typeConf = EFFECT_TYPE_CONFIG[effect.effectType];
            const magnitudeLabel = MAGNITUDE_LABELS[effect.magnitude] ?? effect.magnitude;

            return (
              <View
                key={`${effect.hormoneId}-${effect.effectType}`}
                style={styles.effectRow}
              >
                <View style={styles.effectTop}>
                  <Text
                    style={styles.hormoneName}
                    onPress={() => onHormonePress(effect.hormoneSlug)}
                    accessibilityRole="button"
                    accessibilityLabel={`${effect.hormoneNameJa}の詳細を見る`}
                  >
                    {effect.hormoneNameJa}
                  </Text>
                  {typeConf !== undefined && (
                    <View style={[styles.effectBadge, { backgroundColor: typeConf.bg }]}>
                      <Text style={[styles.effectBadgeText, { color: typeConf.text }]}>
                        {typeConf.label}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.magnitudeText}>
                    （影響度: {magnitudeLabel}）
                  </Text>
                </View>
                {effect.mechanism !== null && effect.mechanism.length > 0 && (
                  <Text style={styles.mechanism}>{effect.mechanism}</Text>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noEffectText}>
          この技法のホルモン効果データはまだありません。
        </Text>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HormoneTechniquesScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch } = useHormoneTechniquesQuery();

  const handleHormonePress = useCallback((slug: string) => {
    router.push(routeHormoneDetail(slug));
  }, []);

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const groups = useMemo<HormoneTechniqueGroup[]>(
    () => data?.items ?? [],
    [data],
  );

  const renderItem = useCallback(
    ({ item }: { item: HormoneTechniqueGroup }) => (
      <TechniqueCard group={item} onHormonePress={handleHormonePress} />
    ),
    [handleHormonePress],
  );

  const extractKey = useCallback((item: HormoneTechniqueGroup) => item.techniqueKey, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '技法とホルモン', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '技法とホルモン', headerShown: true }} />
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
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '技法とホルモン', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />
      <FlatList
        data={groups}
        keyExtractor={extractKey}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <ScreenEmpty
            title="技法データはまだありません"
            iconName="leaf-outline"
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
  },
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
  techniqueName: {
    ...textBase,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  techniqueNameEn: {
    ...textXs,
    color: colorTextSecondary,
    marginTop: -spacing2,
  },
  effectList: {
    gap: spacing3,
  },
  effectRow: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing2,
  },
  effectTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  hormoneName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    textDecorationLine: 'underline',
  },
  effectBadge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  effectBadgeText: {
    ...textXs,
    fontFamily: fontFamilySerifBold,
  },
  magnitudeText: {
    ...textXs,
    color: colorTextSecondary,
  },
  mechanism: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
  noEffectText: {
    ...textSm,
    color: colorTextSecondary,
  },
});
