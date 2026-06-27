/**
 * @module app/pesticides/disease-pests/[slug]/index
 * 病害虫詳細画面。症状・関連農薬製品リストを表示する。
 * 仕様: docs/design/browse-screens.md §5.4
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePesticideDiseasePestDetailQuery } from '@/lib/queries/pesticides';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
import { resolveApiImageUrl } from '@/lib/utils/resolve-api-image-url';
import {
  colorBackground,
  colorSurfaceMuted,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  radiusSm,
  textBase,
  textLg,
  textMd,
  textXl,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DiseasePestDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const rawSlug = params['slug'];
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const { data, isLoading, isError, refetch } = usePesticideDiseasePestDetailQuery(slug ?? '');
  const headerImageUri = resolveApiImageUrl(data?.imageUrl);

  const handleProductPress = useCallback((productSlug: string) => {
    router.push({ pathname: '/pesticides/products/[slug]', params: { slug: productSlug } });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: data?.name ?? '病害虫詳細',
          headerShown: true,
        }}
      />

      <OfflineBanner isVisible={!isOnline} />

      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError || slug === '' ? (
        <ScreenError
          title="この情報は見つかりません。"
          description={ERR_PESTICIDES_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      ) : data === undefined ? null : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing8 },
          ]}
        >
          {/* ヘッダー */}
          {headerImageUri !== null && (
            <Image
              source={{ uri: headerImageUri }}
              style={styles.headerImage}
              contentFit="contain"
              accessibilityLabel={`${data.name}の画像`}
            />
          )}
          <Text style={styles.name}>{data.name}</Text>
          {data.nameKana !== null && (
            <Text style={styles.nameKana}>{data.nameKana}</Text>
          )}
          {data.category.length > 0 && (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{data.category}</Text>
            </View>
          )}

          {/* 説明 */}
          {data.description !== null && (
            <Text style={styles.description}>{data.description}</Text>
          )}

          {/* 関連農薬製品 */}
          {data.effects.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                関連農薬製品
              </Text>
              {data.effects.map((effect) => (
                <TouchableOpacity
                  key={effect.pesticide.id}
                  style={styles.relatedRow}
                  onPress={() => handleProductPress(effect.pesticide.slug)}
                  accessibilityRole="button"
                  accessibilityLabel={`${effect.pesticide.name}の詳細を見る`}
                >
                  <View style={styles.relatedRowContent}>
                    <Text style={styles.relatedName}>{effect.pesticide.name}</Text>
                    <Text style={styles.relatedType}>{effect.pesticide.pesticideType}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
  },
  headerImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
    marginBottom: spacing6,
  },
  name: {
    ...textXl,
    color: colorTextPrimary,
    marginBottom: spacing2,
  },
  nameKana: {
    ...textMd,
    color: colorTextSecondary,
    marginBottom: spacing3,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    marginBottom: spacing4,
  },
  categoryChipText: {
    ...textXs,
    color: colorTextSecondary,
  },
  description: {
    ...textBase,
    color: colorTextPrimary,
    lineHeight: 22,
    marginBottom: spacing4,
  },
  section: {
    borderTopWidth: 2,
    borderTopColor: colorBorderLight,
    paddingTop: spacing4,
    marginTop: spacing4,
    gap: spacing2,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
    marginBottom: spacing2,
  },
  relatedRow: {
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    minHeight: 44,
    justifyContent: 'center',
  },
  relatedRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing2,
  },
  relatedName: {
    ...textMd,
    color: colorTextLink,
    fontWeight: '600',
    flex: 1,
  },
  relatedType: {
    ...textXs,
    color: colorTextSecondary,
  },
});
