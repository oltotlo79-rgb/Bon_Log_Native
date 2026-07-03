/**
 * @module app/pesticides/formulations/index
 * 剤型の違い一覧画面。Web 版 /pesticides/formulations に対応。
 * 剤型カード（code・name・description・製品数）を FlatList で表示する。
 * 製品を持つ剤型はタップ可、0製品は opacity を下げて非タップ表示。
 * 仕様: docs/design/pesticides-web-parity.md §4-8
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
import { Ionicons } from '@expo/vector-icons';
import { useFormulationTypesQuery } from '@/lib/queries/pesticides';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
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
  radiusSm,
  radiusMd,
  shadowWashi,
  textSm,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

type FormulationTypeItem = components['schemas']['FormulationTypeItem'];

// ---------------------------------------------------------------------------
// 剤型カードコンポーネント
// ---------------------------------------------------------------------------

type FormulationCardProps = {
  item: FormulationTypeItem;
  onPress: (code: string) => void;
};

const FormulationCard = memo(function FormulationCard({ item, onPress }: FormulationCardProps) {
  const hasPesticides = item.pesticidesCount > 0;
  const handlePress = useCallback(() => { onPress(item.code); }, [item.code, onPress]);

  if (hasPesticides) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}（${item.code}）${item.pesticidesCount}製品の一覧を見る`}
      >
        <FormulationCardContent item={item} />
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colorTextSecondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.card, styles.cardDisabled]}
      accessibilityRole="text"
      accessibilityLabel={`${item.name}（${item.code}）製品なし`}
    >
      <FormulationCardContent item={item} />
    </View>
  );
});

type FormulationCardContentProps = {
  item: FormulationTypeItem;
};

function FormulationCardContent({ item }: FormulationCardContentProps) {
  return (
    <View style={styles.cardBody}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName}>{item.name}</Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{item.code}</Text>
          </View>
        </View>
        <Text style={styles.countText}>{item.pesticidesCount}製品</Text>
      </View>
      {item.description !== null && item.description.length > 0 && (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function FormulationsIndexScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const { data, isLoading, isError, refetch } = useFormulationTypesQuery();

  const handleCardPress = useCallback((code: string) => {
    router.push({ pathname: '/pesticides/products/[slug]' as never, params: { formulationTypeCode: code } });
  }, []);

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: FormulationTypeItem }) => (
      <FormulationCard item={item} onPress={handleCardPress} />
    ),
    [handleCardPress]
  );

  const extractKey = useCallback((item: FormulationTypeItem) => item.id, []);

  const ListHeader = (
    <View style={styles.listHeader}>
      <PesticideDisclaimer />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '剤型の違い', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '剤型の違い', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="データを読み込めませんでした"
          description={ERR_PESTICIDES_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const items = data?.items ?? [];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '剤型の違い', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />
      <FlatList
        data={items}
        keyExtractor={extractKey}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <ScreenEmpty
            title="剤型データはまだ登録されていません"
            iconName="flask-outline"
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing8 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing4,
    marginBottom: spacing3,
    minHeight: 48,
    ...shadowWashi,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardBody: {
    flex: 1,
    gap: spacing2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    flex: 1,
    flexWrap: 'wrap',
  },
  cardName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  codeBadge: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  codeBadgeText: {
    ...textXs,
    color: colorTextSecondary,
  },
  countText: {
    ...textXs,
    color: colorTextSecondary,
    flexShrink: 0,
  },
  cardDescription: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
});
