/**
 * @module app/pesticides/spreaders/index
 * 展着剤タイプ一覧画面。Web 版 /pesticides/spreaders に対応。
 * タイプをタップすると詳細画面 (spreaders/[slug]) へ遷移する。
 * 仕様: docs/design/pesticides-web-parity.md §4-7
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
import { useSpreaderTypesQuery } from '@/lib/queries/pesticides';
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
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  shadowWashi,
  textSm,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

type SpreaderTypeItem = components['schemas']['SpreaderTypeItem'];

// ---------------------------------------------------------------------------
// 展着剤タイプ行コンポーネント
// ---------------------------------------------------------------------------

type SpreaderTypeRowProps = {
  item: SpreaderTypeItem;
  onPress: (slug: string) => void;
};

const SpreaderTypeRow = memo(function SpreaderTypeRow({ item, onPress }: SpreaderTypeRowProps) {
  const handlePress = useCallback(() => { onPress(item.slug); }, [item.slug, onPress]);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}の展着剤一覧を見る`}
    >
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{item.name}</Text>
        {item.description !== null && item.description.length > 0 && (
          <Text style={styles.rowDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={colorTextSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SpreadersIndexScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const { data, isLoading, isError, refetch } = useSpreaderTypesQuery();

  const handleTypePress = useCallback((slug: string) => {
    router.push({ pathname: '/pesticides/spreaders/[slug]', params: { slug } });
  }, []);

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: SpreaderTypeItem }) => (
      <SpreaderTypeRow item={item} onPress={handleTypePress} />
    ),
    [handleTypePress]
  );

  const extractKey = useCallback((item: SpreaderTypeItem) => item.id, []);

  const ListHeader = (
    <View style={styles.listHeader}>
      <PesticideDisclaimer />
      <Text style={styles.hint}>タップすると該当する展着剤一覧が表示されます</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '展着剤', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '展着剤', headerShown: true }} />
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
      <Stack.Screen options={{ title: '展着剤', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />
      <FlatList
        data={items}
        keyExtractor={extractKey}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <ScreenEmpty
            title="展着剤データはまだ登録されていません"
            iconName="water-outline"
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
    gap: spacing3,
    paddingTop: spacing4,
    paddingBottom: spacing4,
  },
  hint: {
    ...textSm,
    color: colorTextSecondary,
  },
  row: {
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
  rowBody: {
    flex: 1,
    gap: spacing2,
  },
  rowName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  rowDescription: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
  emptyContainer: {
    paddingTop: spacing6,
  },
});
