/**
 * @module app/dictionary/[slug]/index
 * 盆栽用語辞典 詳細画面。用語本文・関連語・前後ナビ・カテゴリリンクを表示する。
 * 仕様: docs/design/browse-screens.md §2.4
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDictionaryDetailQuery } from '@/lib/queries/dictionary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_DICTIONARY_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorBorder,
  colorBorderLight,
  colorActionPrimary,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  colorCategoryGreenBg,
  colorCategoryGreenText,
  colorCategoryIndigoBg,
  colorCategoryIndigoText,
  colorCategoryGreenLightBg,
  colorCategoryGreenLightText,
  colorCategoryOrangeBg,
  colorCategoryOrangeText,
  colorCategoryAmberBg,
  colorCategoryAmberText,
  colorCategoryYellowBg,
  colorCategoryYellowText,
  colorCategoryPurpleBg,
  colorCategoryPurpleText,
  colorCategoryFallbackBg,
  colorCategoryFallbackText,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusMd,
  radiusFull,
  textXs,
  textSm,
  textBase,
  textLg,
  textXl,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// カテゴリカラーマップ（DictionaryTermCard の CATEGORY_COLOR_MAP と同一対応）
// ---------------------------------------------------------------------------

type CategoryColors = {
  bg: string;
  text: string;
};

const CATEGORY_COLOR_MAP: Readonly<Record<string, CategoryColors>> = {
  '樹形':      { bg: colorCategoryGreenBg,      text: colorCategoryGreenText },
  '技術・作業': { bg: colorCategoryIndigoBg,     text: colorCategoryIndigoText },
  '管理・育成': { bg: colorCategoryGreenLightBg, text: colorCategoryGreenLightText },
  '道具・用品': { bg: colorCategoryOrangeBg,     text: colorCategoryOrangeText },
  '盆器・鉢':   { bg: colorCategoryAmberBg,      text: colorCategoryAmberText },
  '用土・肥料': { bg: colorCategoryYellowBg,     text: colorCategoryYellowText },
  '展示・鑑賞': { bg: colorCategoryPurpleBg,     text: colorCategoryPurpleText },
} as const;

const CATEGORY_COLOR_FALLBACK: CategoryColors = {
  bg: colorCategoryFallbackBg,
  text: colorCategoryFallbackText,
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DictionaryDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  // slug は useLocalSearchParams で string | string[] を返すため型ガードで絞る
  const rawSlug = params['slug'];
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const { data, isLoading, isError, refetch } = useDictionaryDetailQuery(slug ?? '');

  const handleRelatedPress = useCallback((relatedSlug: string) => {
    router.push({ pathname: '/dictionary/[slug]', params: { slug: relatedSlug } });
  }, []);

  const handlePrevPress = useCallback((prevSlug: string) => {
    router.push({ pathname: '/dictionary/[slug]', params: { slug: prevSlug } });
  }, []);

  const handleNextPress = useCallback((nextSlug: string) => {
    router.push({ pathname: '/dictionary/[slug]', params: { slug: nextSlug } });
  }, []);

  const handleCategoryPress = useCallback((category: string) => {
    router.push({ pathname: '/dictionary', params: { category } });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: data?.term.term ?? '用語詳細',
          headerShown: true,
        }}
      />

      <OfflineBanner isVisible={!isOnline} />

      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError || slug === '' ? (
        <ScreenError
          title="この用語は見つかりません。"
          description={ERR_DICTIONARY_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      ) : data === undefined ? null : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing8 },
          ]}
        >
          {/* ヘッダー */}
          <Text style={styles.termHeading}>{data.term.term}</Text>
          <Text style={styles.reading}>{data.term.reading}</Text>
          {data.term.category.length > 0 && (
            <View
              style={[
                styles.categoryChip,
                { backgroundColor: (CATEGORY_COLOR_MAP[data.term.category] ?? CATEGORY_COLOR_FALLBACK).bg },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: (CATEGORY_COLOR_MAP[data.term.category] ?? CATEGORY_COLOR_FALLBACK).text },
                ]}
              >
                {data.term.category}
              </Text>
            </View>
          )}

          <View style={styles.separator} />

          {/* 本文 */}
          <Text style={styles.body}>{data.term.description}</Text>

          {/* 関連語 */}
          {data.related.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionLabel} accessibilityRole="header">
                関連語
              </Text>
              <View style={styles.relatedChipsRow}>
                {data.related.map((rel) => (
                  <TouchableOpacity
                    key={rel.id}
                    style={styles.relatedChip}
                    onPress={() => handleRelatedPress(rel.slug)}
                    accessibilityRole="button"
                    accessibilityLabel={`${rel.term}の詳細を見る`}
                  >
                    <Text style={styles.relatedChipText}>{rel.term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.separator} />

          {/* 前後ナビ */}
          <View style={styles.prevNextRow}>
            {data.prev !== null ? (
              <TouchableOpacity
                style={styles.prevButton}
                onPress={() => handlePrevPress(data.prev!.slug)}
                accessibilityRole="button"
                accessibilityLabel={`前の用語: ${data.prev.term}`}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={colorActionPrimary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <View style={styles.prevNextTextBlock}>
                  <Text style={styles.prevNextSubLabel}>前の用語</Text>
                  <Text style={styles.prevNextText} numberOfLines={1}>
                    {data.prev.term}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.prevButton} />
            )}

            {data.next !== null ? (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => handleNextPress(data.next!.slug)}
                accessibilityRole="button"
                accessibilityLabel={`次の用語: ${data.next.term}`}
              >
                <View style={styles.prevNextTextBlockRight}>
                  <Text style={styles.prevNextSubLabel}>次の用語</Text>
                  <Text style={styles.prevNextText} numberOfLines={1}>
                    {data.next.term}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colorActionPrimary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.nextButton} />
            )}
          </View>

          {/* 同カテゴリ一覧リンク（Web の /dictionary?category=XXX 相当） */}
          {data.term.category.length > 0 && (
            <View style={styles.categoryLinkWrapper}>
              <TouchableOpacity
                onPress={() => handleCategoryPress(data.term.category)}
                accessibilityRole="button"
                accessibilityLabel={`「${data.term.category}」カテゴリの用語一覧を見る`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.categoryLinkText}>
                  「{data.term.category}」の用語一覧を見る
                </Text>
              </TouchableOpacity>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
  },
  termHeading: {
    ...textXl,
    color: colorTextPrimary,
    marginBottom: spacing2,
  },
  reading: {
    ...textBase,
    color: colorTextSecondary,
    marginBottom: spacing3,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    borderRadius: radiusFull,
    paddingHorizontal: spacing3,
    paddingVertical: 4,
    marginBottom: spacing4,
  },
  categoryChipText: {
    ...textXs,
    fontWeight: '500',
    lineHeight: 16,
  },
  separator: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginVertical: spacing4,
  },
  body: {
    ...textBase,
    color: colorTextPrimary,
    lineHeight: 22,
    marginBottom: spacing4,
  },
  relatedSection: {
    marginBottom: spacing4,
  },
  sectionLabel: {
    ...textLg,
    color: colorTextPrimary,
    marginBottom: spacing3,
  },
  relatedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  relatedChip: {
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    borderRadius: radiusFull,
    borderWidth: 1,
    borderColor: colorBorderLight,
    backgroundColor: colorBackground,
    minHeight: 36,
    justifyContent: 'center',
  },
  relatedChipText: {
    ...textSm,
    color: colorTextLink,
    fontWeight: '600',
  },
  prevNextRow: {
    flexDirection: 'row',
    gap: spacing2,
  },
  prevButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    minHeight: 56,
    paddingVertical: spacing3,
    paddingHorizontal: spacing3,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    backgroundColor: colorSurface,
    ...shadowWashi,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing2,
    minHeight: 56,
    paddingVertical: spacing3,
    paddingHorizontal: spacing3,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    backgroundColor: colorSurface,
    ...shadowWashi,
  },
  prevNextTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  prevNextTextBlockRight: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  prevNextSubLabel: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 14,
    marginBottom: 2,
  },
  prevNextText: {
    ...textSm,
    color: colorTextLink,
    fontWeight: '600',
  },
  categoryLinkWrapper: {
    marginTop: spacing4,
    alignItems: 'center',
  },
  categoryLinkText: {
    ...textSm,
    color: colorActionPrimary,
    textDecorationLine: 'underline',
  },
});
