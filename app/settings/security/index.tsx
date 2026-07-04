/**
 * @module app/settings/security
 * セキュリティ設定画面（2段階認証の有効化・無効化）。
 * 仕様: Bon_Log_cfw の app/(main)/settings/security（TwoFactorSettings 系コンポーネント）の
 * 文言・手順を踏襲する。QR コードは描画せず、シークレットキーの手入力のみに対応する。
 *
 * users/me に twoFactorEnabled 相当のフィールドがまだ存在しないため（2026-07 時点）、
 * サーバー側の設定済み状態を判定できない。そのため有効化・無効化の両フローを常に表示する。
 * フィールドが追加され次第、状態に応じた出し分け UI に変更する。
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { TwoFactorEnableSection } from '@/components/settings/TwoFactorEnableSection';
import { TwoFactorDisableSection } from '@/components/settings/TwoFactorDisableSection';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  spacing2,
  spacing4,
  spacing6,
  textBase,
  textLg,
  textSm,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsSecurityScreen() {
  const isOnline = useOnlineStatus();

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
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          セキュリティ設定
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          2段階認証を設定すると、ログイン時にパスワードに加えて認証アプリのコードが必要になり、アカウントの安全性が高まります。
        </Text>

        <TwoFactorEnableSection isOnline={isOnline} />
        <TwoFactorDisableSection isOnline={isOnline} />
      </ScrollView>
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
    paddingHorizontal: spacing4,
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    ...textBase,
    color: colorTextPrimary,
  },
  headerRight: {
    minWidth: 44,
  },
  scrollContent: {
    padding: spacing4,
    gap: spacing6,
    paddingBottom: spacing6,
  },
  intro: {
    ...textSm,
    color: colorTextSecondary,
    paddingHorizontal: spacing2,
  },
});
