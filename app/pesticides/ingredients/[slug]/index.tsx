/**
 * @module app/pesticides/ingredients/[slug]/index
 * 農薬有効成分詳細画面。成分グループ・説明・含む製品一覧を表示する。
 * 仕様: docs/design/browse-screens.md §5.4
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePesticideIngredientDetailQuery } from '@/lib/queries/pesticides';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorBorderLight,
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
  textBase,
  textLg,
  textMd,
  textSm,
  textXl,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 耐性リスクの日本語ラベル
// ---------------------------------------------------------------------------

const RESISTANCE_RISK_LABEL: Record<string, string> = {
  low: 'つきにくい',
  medium: 'ややつきやすい',
  high: 'つきやすい',
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function IngredientDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  const rawSlug = params['slug'];
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const { data, isLoading, isError, refetch } = usePesticideIngredientDetailQuery(slug ?? '');

  const handleProductPress = useCallback((productSlug: string) => {
    router.push({ pathname: '/pesticides/products/[slug]', params: { slug: productSlug } });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: data?.name ?? '農薬成分詳細',
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
          {/* ヘッダー：成分名 + 英名 */}
          <View style={styles.headerBlock}>
            <Text style={styles.name}>{data.name}</Text>
            {data.nameEn !== null && (
              <Text style={styles.nameEn}>{data.nameEn}</Text>
            )}
          </View>

          {/* 基本情報（Web版 <dl> グリッド形式に対応） */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              基本情報
            </Text>
            {data.fracCode !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>FRACコード</Text>
                <View style={styles.codeTag}>
                  <Text style={styles.codeTagText}>{data.fracCode}</Text>
                </View>
              </View>
            )}
            {data.iracCode !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>IRACコード</Text>
                <View style={styles.codeTag}>
                  <Text style={styles.codeTagText}>{data.iracCode}</Text>
                </View>
              </View>
            )}
            {data.ingredientGroup !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>原体グループ</Text>
                <Text style={styles.infoValue}>{data.ingredientGroup}</Text>
              </View>
            )}
            {data.resistanceRisk !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>耐性リスク</Text>
                <View style={styles.codeTag}>
                  <Text style={styles.codeTagText}>
                    {RESISTANCE_RISK_LABEL[data.resistanceRisk] ?? data.resistanceRisk}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 説明 */}
          {data.description !== null && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                原体の詳細説明
              </Text>
              <Text style={styles.descNote}>
                以下の説明は、FRAC・IRAC等の公的分類および登録情報に基づく事実のみを記載しています。実際の使用は各製品のラベルに従ってください。
              </Text>
              <Text style={styles.description}>{data.description}</Text>
            </View>
          )}

          {/* 含む製品（Web版のリスト形式に対応） */}
          {data.pesticides.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                この原体を含む薬剤（{data.pesticides.length}件）
              </Text>
              {data.pesticides.map((p) => (
                <TouchableOpacity
                  key={p.pesticide.id}
                  style={styles.relatedRow}
                  onPress={() => handleProductPress(p.pesticide.slug)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.pesticide.name}の詳細を見る`}
                >
                  <View style={styles.relatedRowContent}>
                    <Text style={styles.relatedName}>{p.pesticide.name}</Text>
                    <View style={styles.relatedMeta}>
                      {p.pesticide.formulationTypeName !== null && (
                        <Text style={styles.relatedType}>{p.pesticide.formulationTypeName}</Text>
                      )}
                      {p.contentLabel !== null && (
                        <Text style={styles.relatedType}>{p.contentLabel}</Text>
                      )}
                    </View>
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
    gap: spacing4,
  },

  // ヘッダーブロック
  headerBlock: {
    gap: spacing2,
  },
  name: {
    ...textXl,
    color: colorTextPrimary,
  },
  nameEn: {
    ...textMd,
    color: colorTextSecondary,
  },

  // 情報セクション（Web版 rounded-lg border p-4 に対応）
  infoSection: {
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    backgroundColor: colorSurface,
    gap: spacing3,
    ...shadowWashi,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },

  // 基本情報 key-value（Web版 <dl> グリッドに対応）
  infoRow: {
    flexDirection: 'row',
    gap: spacing4,
    alignItems: 'center',
    paddingVertical: spacing2,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  infoLabel: {
    ...textSm,
    color: colorTextSecondary,
    width: 80,
    flexShrink: 0,
  },
  infoValue: {
    ...textSm,
    color: colorTextPrimary,
    flex: 1,
  },
  codeTag: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  codeTagText: {
    ...textXs,
    color: colorTextSecondary,
  },

  // 説明テキスト
  descNote: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },
  description: {
    ...textBase,
    color: colorTextPrimary,
    lineHeight: 22,
  },

  // 含む製品リスト
  relatedRow: {
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    minHeight: 44,
    justifyContent: 'center',
  },
  relatedRowContent: {
    gap: 2,
  },
  relatedMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  relatedName: {
    ...textMd,
    color: colorTextLink,
    fontWeight: '600',
  },
  relatedType: {
    ...textXs,
    color: colorTextSecondary,
  },
});
