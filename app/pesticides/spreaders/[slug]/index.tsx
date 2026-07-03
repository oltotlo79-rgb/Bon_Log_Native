/**
 * @module app/pesticides/spreaders/[slug]/index
 * 展着剤タイプ詳細画面。Web 版 /pesticides/spreaders/[slug] に対応。
 * 概要 / 効果 / 利用時の注意 と紐付く製品リストを表示する。
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
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSpreaderTypeDetailQuery } from '@/lib/queries/pesticides';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
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
  radiusMd,
  shadowWashi,
  textSm,
  textBase,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

type SpreaderProductInSpreaderType = components['schemas']['SpreaderProductInSpreaderType'];

// ---------------------------------------------------------------------------
// 製品行コンポーネント
// ---------------------------------------------------------------------------

type ProductRowProps = {
  item: SpreaderProductInSpreaderType;
  onPress: (slug: string) => void;
};

const ProductRow = memo(function ProductRow({ item, onPress }: ProductRowProps) {
  const handlePress = useCallback(() => { onPress(item.slug); }, [item.slug, onPress]);

  return (
    <TouchableOpacity
      style={styles.productRow}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}の詳細を見る`}
    >
      <View style={styles.productRowBody}>
        <Text style={styles.productName}>{item.name}</Text>
        {item.description !== null && item.description.length > 0 && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.formulationType !== null && (
          <Text style={styles.formulationType}>
            {item.formulationType.name}（{item.formulationType.code}）
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
// 情報セクション
// ---------------------------------------------------------------------------

type InfoSectionProps = {
  title: string;
  content: string;
};

const InfoSection = memo(function InfoSection({ title, content }: InfoSectionProps) {
  return (
    <View style={styles.infoSection}>
      <Text style={styles.infoSectionTitle}>{title}</Text>
      <Text style={styles.infoSectionContent}>{content}</Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SpreaderTypeDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const rawParams = useLocalSearchParams();

  // useLocalSearchParams の値は string | string[] — 型ガードで文字列に絞る
  const slugParam = rawParams['slug'];
  const slug = typeof slugParam === 'string' ? slugParam : '';

  const { data, isLoading, isError, refetch } = useSpreaderTypeDetailQuery(slug);

  const handleProductPress = useCallback((productSlug: string) => {
    router.push({ pathname: '/pesticides/products/[slug]', params: { slug: productSlug } });
  }, []);

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const renderProduct = useCallback(
    ({ item }: { item: SpreaderProductInSpreaderType }) => (
      <ProductRow item={item} onPress={handleProductPress} />
    ),
    [handleProductPress]
  );

  const extractProductKey = useCallback(
    (item: SpreaderProductInSpreaderType) => item.id,
    []
  );

  const screenTitle = data !== undefined ? data.name : '展着剤詳細';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: screenTitle, headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError || data === undefined) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '展着剤詳細', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="データを読み込めませんでした"
          description={ERR_PESTICIDES_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const products = data.products;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: data.name, headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />
      <FlatList
        data={products}
        keyExtractor={extractProductKey}
        renderItem={renderProduct}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <PesticideDisclaimer />

            {data.description !== null && data.description.length > 0 && (
              <InfoSection title="概要" content={data.description} />
            )}

            {data.effect !== null && data.effect.length > 0 && (
              <InfoSection title="効果" content={data.effect} />
            )}

            {data.usageNote !== null && data.usageNote.length > 0 && (
              <InfoSection title="利用時の注意" content={data.usageNote} />
            )}

            <Text style={styles.productsHeading}>
              該当する製品{products.length > 0 ? `（${products.length}件）` : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>この型の製品はまだ登録されていません</Text>
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
    gap: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing4,
  },
  infoSection: {
    backgroundColor: colorSurfaceMuted,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing4,
    gap: spacing2,
  },
  infoSectionTitle: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  infoSectionContent: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },
  productsHeading: {
    ...textBase,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    paddingTop: spacing2,
  },
  productRow: {
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
  productRowBody: {
    flex: 1,
    gap: spacing2,
  },
  productName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  productDescription: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
  formulationType: {
    ...textXs,
    color: colorTextSecondary,
  },
  emptyText: {
    ...textSm,
    color: colorTextSecondary,
    textAlign: 'center',
    paddingVertical: spacing8,
  },
});
