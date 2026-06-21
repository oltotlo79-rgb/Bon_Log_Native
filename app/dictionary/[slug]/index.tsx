/**
 * @module app/dictionary/[slug]/index
 * 盆栽用語辞典 詳細画面。用語本文・関連語・前後ナビを表示する。
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
  colorSurfaceMuted,
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
  radiusFull,
  textXs,
  textSm,
  textBase,
  textLg,
  textXl,
} from '@/lib/constants/design-tokens';

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
    router.push({ pathname: '/dictionary/[slug]/index', params: { slug: relatedSlug } });
  }, []);

  const handlePrevPress = useCallback((prevSlug: string) => {
    router.push({ pathname: '/dictionary/[slug]/index', params: { slug: prevSlug } });
  }, []);

  const handleNextPress = useCallback((nextSlug: string) => {
    router.push({ pathname: '/dictionary/[slug]/index', params: { slug: nextSlug } });
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
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{data.term.category}</Text>
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
                <Text style={styles.prevNextText} numberOfLines={1}>
                  {data.prev.term}
                </Text>
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
                <Text style={styles.prevNextText} numberOfLines={1}>
                  {data.next.term}
                </Text>
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
    backgroundColor: '#ffffff',
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
    minHeight: 44,
    paddingVertical: spacing3,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 44,
    paddingVertical: spacing3,
  },
  prevNextText: {
    ...textSm,
    color: colorTextLink,
    flex: 1,
  },
});
