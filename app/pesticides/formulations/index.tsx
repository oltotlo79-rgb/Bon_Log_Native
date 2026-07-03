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
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFormulationTypesQuery, usePesticideProductsQuery } from '@/lib/queries/pesticides';
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
  colorBorderLight,
  colorActionPrimary,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
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
type PesticideItem = components['schemas']['PesticideItem'];

const PESTICIDE_TYPE_LABEL: Record<components['schemas']['PesticideType'], string> = {
  fungicide:   '殺菌剤',
  insecticide: '殺虫剤',
  acaricide:   '殺ダニ剤',
  compound:    '複合剤',
  other:       'その他',
};

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
// 製品カードコンポーネント（剤型フィルタ時の製品リスト行）
// ---------------------------------------------------------------------------

type ProductRowProps = {
  item: PesticideItem;
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
        <Text style={styles.productRowName}>{item.name}</Text>
        <View style={styles.productRowMeta}>
          <View style={styles.productTypeBadge}>
            <Text style={styles.productTypeBadgeText}>{PESTICIDE_TYPE_LABEL[item.pesticideType]}</Text>
          </View>
          {item.registrationNumber !== null && (
            <Text style={styles.productRegNumber}>No.{item.registrationNumber}</Text>
          )}
        </View>
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

export default function FormulationsIndexScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const rawCode = params['formulationTypeCode'];
  const selectedCode = typeof rawCode === 'string' ? rawCode : Array.isArray(rawCode) ? rawCode[0] : null;

  const { data, isLoading, isError, refetch } = useFormulationTypesQuery();

  const productQueryResult = usePesticideProductsQuery(
    selectedCode !== null && selectedCode !== '' ? { formulationTypeCode: selectedCode } : {}
  );
  const productData = productQueryResult?.data;
  const isProductLoading = productQueryResult?.isLoading ?? false;
  const isProductError = productQueryResult?.isError ?? false;
  const fetchProductNext = productQueryResult?.fetchNextPage;
  const hasProductNext = productQueryResult?.hasNextPage ?? false;
  const isFetchingProductNext = productQueryResult?.isFetchingNextPage ?? false;
  const refetchProduct = productQueryResult?.refetch;

  const handleCardPress = useCallback((code: string) => {
    // @ts-expect-error Expo Router の typed routes が params 付き static route のオブジェクト形式を正しく解決しない
    router.push({ pathname: '/pesticides/formulations', params: { formulationTypeCode: code } });
  }, []);

  const handleProductPress = useCallback((slug: string) => {
    router.push({ pathname: '/pesticides/products/[slug]', params: { slug } });
  }, []);

  const handleBackToList = useCallback(() => {
    router.setParams({ formulationTypeCode: '' });
  }, []);

  const handleRefresh = useCallback(() => {
    void refetch();
    if (selectedCode !== null && selectedCode !== '' && refetchProduct !== undefined) void refetchProduct();
  }, [refetch, refetchProduct, selectedCode]);

  const handleProductEndReached = useCallback(() => {
    if (hasProductNext && !isFetchingProductNext && fetchProductNext !== undefined) void fetchProductNext();
  }, [hasProductNext, isFetchingProductNext, fetchProductNext]);

  const renderItem = useCallback(
    ({ item }: { item: FormulationTypeItem }) => (
      <FormulationCard item={item} onPress={handleCardPress} />
    ),
    [handleCardPress]
  );

  const renderProductItem = useCallback(
    ({ item }: { item: PesticideItem }) => (
      <ProductRow item={item} onPress={handleProductPress} />
    ),
    [handleProductPress]
  );

  const extractKey = useCallback((item: FormulationTypeItem) => item.id, []);
  const extractProductKey = useCallback((item: PesticideItem) => item.id, []);

  const ProductListFooter = useCallback(
    () => (isFetchingProductNext ? <View style={styles.listFooter}><ActivityIndicator size="small" color={colorActionPrimary} /></View> : null),
    [isFetchingProductNext]
  );

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

  // 剤型コード指定時：その剤型の製品リストを表示（Web版の ?formulation=CODE に対応）
  if (selectedCode !== null) {
    const selectedFormulation = items.find((f) => f.code === selectedCode);
    const productItems = productData?.pages.flatMap((p) => p.items) ?? [];
    const screenTitle = selectedFormulation !== undefined ? `${selectedFormulation.name}の薬剤` : '剤型別薬剤';

    const FilterHeader = (
      <View style={styles.listHeader}>
        {selectedFormulation !== undefined && (
          <View style={styles.formulationDetailCard}>
            <View style={styles.formulationDetailTitle}>
              <Text style={styles.cardName}>{selectedFormulation.name}</Text>
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeText}>{selectedFormulation.code}</Text>
              </View>
            </View>
            {selectedFormulation.description !== null && selectedFormulation.description.length > 0 && (
              <Text style={styles.cardDescription}>{selectedFormulation.description}</Text>
            )}
          </View>
        )}
        <TouchableOpacity
          style={styles.backToListLink}
          onPress={handleBackToList}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel="剤型一覧に戻る"
        >
          <Text style={styles.backToListText}>← 剤型一覧に戻る</Text>
        </TouchableOpacity>
      </View>
    );

    if (isProductError) {
      return (
        <View style={styles.container}>
          <Stack.Screen options={{ title: screenTitle, headerShown: true }} />
          <OfflineBanner isVisible={!isOnline} />
          <ScreenError
            title="データを読み込めませんでした"
            description={ERR_PESTICIDES_LOAD_FAILED}
            onRetry={handleRefresh}
          />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: screenTitle, headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        {isProductLoading ? (
          <ScreenLoading variant="spinner" />
        ) : (
          <FlatList
            data={productItems}
            keyExtractor={extractProductKey}
            renderItem={renderProductItem}
            ListHeaderComponent={FilterHeader}
            ListFooterComponent={ProductListFooter}
            ListEmptyComponent={
              <ScreenEmpty
                title="この剤型の薬剤はまだ登録されていません"
                iconName="flask-outline"
              />
            }
            onEndReached={handleProductEndReached}
            onEndReachedThreshold={0.3}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing8 }]}
            refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

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

  // 剤型フィルタ時のヘッダーカード
  formulationDetailCard: {
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    backgroundColor: colorSurface,
    padding: spacing4,
    gap: spacing2,
    marginBottom: spacing3,
  },
  formulationDetailTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    flexWrap: 'wrap',
  },

  // 剤型一覧へ戻るリンク
  backToListLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  backToListText: {
    ...textSm,
    color: colorTextLink,
    textDecorationLine: 'underline',
  },

  // 製品行（剤型フィルタ時のリストアイテム）
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing3,
    marginBottom: spacing3,
    minHeight: 48,
    ...shadowWashi,
  },
  productRowBody: {
    flex: 1,
    gap: spacing2,
  },
  productRowName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  productRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    flexWrap: 'wrap',
  },
  productTypeBadge: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  productTypeBadgeText: {
    ...textXs,
    color: colorTextSecondary,
  },
  productRegNumber: {
    ...textXs,
    color: colorTextSecondary,
  },

  // ロードインジケーター行
  listFooter: {
    padding: spacing4,
    alignItems: 'center',
  },
  productDivider: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginVertical: spacing2,
  },
});
