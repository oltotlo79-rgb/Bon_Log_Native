/**
 * @module app/legal/index
 * 法的文章一覧画面。利用規約・プライバシーポリシー・特商法表記への入口。
 * 仕様: docs/design/browse-screens.md §6
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLegalListQuery, type LegalListResponse } from '@/lib/queries/legal';
import type { LegalSlug } from '@/lib/queries/legal';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ERR_LEGAL_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorActionPrimary,
  spacing2,
  spacing4,
  textMd,
  textSm,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type LegalListItem = LegalListResponse['items'][number];

const LEGAL_SLUGS = ['tokushoho', 'terms', 'privacy'] as const;

function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// 一覧セル
// ---------------------------------------------------------------------------

type LegalDocumentCellProps = {
  item: LegalListItem;
  onPress: (slug: string) => void;
  showBorder: boolean;
};

function LegalDocumentCell({ item, onPress, showBorder }: LegalDocumentCellProps) {
  const handlePress = useCallback(() => {
    onPress(item.slug);
  }, [item.slug, onPress]);

  const formattedDate = formatDate(item.updatedAt);

  return (
    <TouchableOpacity
      style={[styles.cell, showBorder && styles.cellBorder]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}（更新日: ${formattedDate}）`}
    >
      <View style={styles.cellContent}>
        <Text style={styles.cellTitle}>{item.title}</Text>
        <Text style={styles.cellDate}>更新日: {formattedDate}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={colorTextTertiary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </TouchableOpacity>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function LegalListScreen() {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, refetch, isFetching } = useLegalListQuery();

  const items = data?.items ?? [];

  const handlePressItem = useCallback((slug: string) => {
    if (!isLegalSlug(slug)) return;
    router.push({ pathname: '/legal/[slug]/index', params: { slug } });
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: LegalListItem; index: number }) => (
      <LegalDocumentCell
        item={item}
        onPress={handlePressItem}
        showBorder={index < items.length - 1}
      />
    ),
    [handlePressItem, items.length]
  );

  const keyExtractor = useCallback((item: LegalListItem) => item.slug, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={!isOnline} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Ionicons name="chevron-back" size={24} color={colorTextPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          法的情報
        </Text>
        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError ? (
        <ScreenError
          description={ERR_LEGAL_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      ) : items.length === 0 ? (
        <ScreenEmpty
          iconName="document-text-outline"
          title="法的情報がありません"
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={colorActionPrimary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  header: {
    height: 48,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing2,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  listContent: {
    paddingTop: spacing4,
    paddingHorizontal: spacing4,
    paddingBottom: spacing4,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: spacing2,
  },
  cellBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  cellContent: {
    flex: 1,
    gap: 4,
  },
  cellTitle: {
    ...textMd,
    color: colorTextPrimary,
  },
  cellDate: {
    ...textSm,
    color: colorTextSecondary,
  },
});
