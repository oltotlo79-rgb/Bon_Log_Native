/**
 * @module app/scheduled-posts/locked/index
 * 非プレミアムユーザー向けロック画面。
 * 誘導先は settings/subscription（Play Billing）のみ。Stripe 等への外部リンク禁止。
 * 仕様: docs/design/scheduled-posts.md §2 / store-compliance.md
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  spacing2,
  spacing4,
  spacing6,
  spacing8,
  radiusLg,
  textBase,
  textLg,
  textXl,
} from '@/lib/constants/design-tokens';
import { ROUTE_SETTINGS_SUBSCRIPTION } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CROWN_ICON_SIZE = 48;
const UPGRADE_BUTTON_HEIGHT = 48;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScheduledPostsLockedScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ 戻る</Text>
        </Pressable>
        <Text style={styles.headerTitle}>予約投稿</Text>
        <View style={styles.headerRight} />
      </View>

      {/* ロックコンテンツ */}
      <View style={[styles.content, { paddingBottom: insets.bottom + spacing8 }]}>
        <Ionicons
          name="star-outline"
          size={CROWN_ICON_SIZE}
          color={colorTextSecondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />

        <Text style={styles.title}>予約投稿はプレミアム機能です</Text>
        <Text style={styles.description}>
          プレミアムプランに加入すると、投稿を指定した日時に自動公開できます。最大 10 件の予約が可能です。
        </Text>

        <Pressable
          style={({ pressed }) => [styles.upgradeButton, pressed && styles.upgradeButtonPressed]}
          onPress={() => router.push(ROUTE_SETTINGS_SUBSCRIPTION)}
          accessibilityRole="button"
          accessibilityLabel="プレミアムプランに登録する"
        >
          <Text style={styles.upgradeButtonText}>プレミアムプランに登録する</Text>
        </Pressable>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingHorizontal: spacing4,
    minHeight: 44,
  },
  headerButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: colorTextSecondary,
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...textLg,
    color: colorTextPrimary,
  },
  headerRight: {
    minWidth: 60,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing8,
    gap: spacing4,
  },
  title: {
    ...textXl,
    color: colorTextPrimary,
    textAlign: 'center',
  },
  description: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  upgradeButton: {
    backgroundColor: colorActionPrimary,
    height: UPGRADE_BUTTON_HEIGHT,
    borderRadius: radiusLg,
    paddingHorizontal: spacing6,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    marginTop: spacing2,
  },
  upgradeButtonPressed: {
    opacity: 0.8,
  },
  upgradeButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
});
