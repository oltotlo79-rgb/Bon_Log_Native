/**
 * @module app/legal/[slug]/index
 * 法的文章詳細画面。sections の heading・body を表示する。
 * 仕様: docs/design/browse-screens.md §6.4
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLegalDocumentQuery, type LegalSlug } from '@/lib/queries/legal';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ERR_LEGAL_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  spacing2,
  spacing4,
  spacing8,
  textLg,
  textBase,
  textSm,
  text2xl,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型ガード
// ---------------------------------------------------------------------------

const LEGAL_SLUGS = ['tokushoho', 'terms', 'privacy'] as const satisfies readonly LegalSlug[];

function isLegalSlug(value: unknown): value is LegalSlug {
  return typeof value === 'string' && (LEGAL_SLUGS as readonly string[]).includes(value);
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

export default function LegalDetailScreen() {
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams();

  // slug パラメータを型ガードで絞り込む
  const rawSlug = params.slug;
  const slug: LegalSlug | null = isLegalSlug(rawSlug) ? rawSlug : null;

  const { data, isLoading, isError, refetch, isFetching } = useLegalDocumentQuery(
    slug ?? 'terms'
  );

  // slug が不正な場合はエラー扱い
  if (slug === null) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="戻る"
          >
            <Ionicons name="chevron-back" size={24} color={colorTextPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer} />
          <View style={styles.headerRight} />
        </View>
        <ScreenError
          title="このページは見つかりません"
          description="URLが正しくありません。"
          onRetry={() => router.back()}
          retryLabel="戻る"
        />
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
          {data?.title ?? ''}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <ScreenLoading variant="spinner" />
      ) : isError ? (
        <ScreenError
          title="このページは見つかりません"
          description={ERR_LEGAL_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      ) : data !== undefined ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={colorActionPrimary}
            />
          }
        >
          {/* ドキュメントヘッダー */}
          <Text style={styles.documentTitle}>{data.title}</Text>
          <Text style={styles.updatedAt}>更新日: {formatDate(data.updatedAt)}</Text>

          {/* セクション一覧 */}
          {data.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionHeading} accessibilityRole="header">
                {section.heading}
              </Text>
              {/* React Native の Text は \n を自動的に改行として扱うため加工不要 */}
              <Text style={styles.sectionBody} accessibilityRole="text">
                {section.body}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
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
  headerTitleContainer: {
    flex: 1,
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
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing8,
  },
  documentTitle: {
    ...text2xl,
    color: colorTextPrimary,
    marginBottom: spacing2,
  },
  updatedAt: {
    ...textSm,
    color: colorTextSecondary,
    marginBottom: spacing4,
  },
  section: {
    marginTop: spacing4,
  },
  sectionHeading: {
    ...textLg,
    color: colorTextPrimary,
    marginBottom: spacing2,
    marginTop: spacing4,
  },
  sectionBody: {
    ...textBase,
    color: colorTextPrimary,
  },
});
