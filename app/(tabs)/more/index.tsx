/**
 * @module app/(tabs)/more/index
 * 「もっと見る」タブ画面。アプリ内機能へのハブ。
 * 仕様: docs/design/more-menu.md
 *
 * PM 決定事項:
 * - legal（法的文章）は Web ではなくネイティブ画面（/legal/*）へ遷移する
 * - 発見・育成ガイド系・投稿分析はウェーブ1でネイティブ実装済みのため router.push
 * - ウェーブ2（マイ盆栽・盆栽園マップ・イベント・ブックマーク・予約投稿）はネイティブ遷移で追加
 * - ヘルプは Web のみ提供のため openBrowserAsync を維持
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Sentry from '@sentry/react-native';
import { useLogoutMutation } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { MoreMenuGroup } from '@/components/common/MoreMenuGroup';
import { MoreMenuItem } from '@/components/common/MoreMenuItem';
import {
  ROUTE_PROFILE,
  routes,
} from '@/lib/constants/routes';
import { HELP_URL } from '@/lib/constants/external-links';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorError,
  colorBorderLight,
  spacing1,
  spacing4,
  textLg,
  textSm,
  letterSpacingWidest,
  letterSpacingWide,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ICON_SIZE = 20;

// ---------------------------------------------------------------------------
// セクション見出し
// ---------------------------------------------------------------------------

type MoreSectionHeaderProps = {
  label: string;
};

function MoreSectionHeader({ label }: MoreSectionHeaderProps) {
  return (
    <Text style={styles.sectionHeader} accessibilityRole="header">
      {label}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MoreScreen() {
  const isOnline = useOnlineStatus();
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();

  function handleLogout() {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: () => {
            logout(undefined, {
              onError: () => {
                // サーバーエラーでもローカルのログアウトは完了するため通知不要
                // AuthGuard がログイン画面へ誘導する
              },
            });
          },
        },
      ]
    );
  }

  async function handleOpenBrowser(url: string) {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      // アプリ内ブラウザ起動失敗はサイレントにキャッチ（クラッシュさせない）
      Sentry.captureException(error);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={!isOnline} />

      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          もっと見る
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        accessibilityLabel="もっと見るメニュー"
      >
        {/* グループ 1: ナビゲーション（見出しなし） */}
        <MoreMenuGroup>
          <MoreMenuItem
            label="プロフィール"
            icon={
              <Ionicons name="person-outline" size={ICON_SIZE} color={colorTextSecondary} />
            }
            onPress={() => router.navigate(ROUTE_PROFILE)}
            accessibilityLabel="プロフィールを見る"
            showBorder
          />
          <MoreMenuItem
            label="設定"
            icon={
              <Ionicons name="settings-outline" size={ICON_SIZE} color={colorTextSecondary} />
            }
            onPress={() => router.push(routes.settings)}
            accessibilityLabel="設定を開く"
          />
        </MoreMenuGroup>

        {/* グループ 2: 機能（ネイティブ遷移） */}
        <View style={styles.groupWithHeader}>
          <MoreSectionHeader label="機能" />
          <MoreMenuGroup>
            <MoreMenuItem
              label="発見"
              icon={
                <Ionicons name="compass-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/explore' })}
              accessibilityLabel="発見画面を開く"
              showBorder
            />
            <MoreMenuItem
              label="盆栽用語辞典"
              icon={
                <Ionicons name="book-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/dictionary' })}
              accessibilityLabel="盆栽用語辞典を開く"
              showBorder
            />
            <MoreMenuItem
              label="施肥ガイド"
              icon={
                <Ionicons name="leaf-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/fertilizers' })}
              accessibilityLabel="施肥ガイドを開く"
              showBorder
            />
            <MoreMenuItem
              label="植物ホルモン"
              icon={
                <Ionicons name="flask-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/hormones' })}
              accessibilityLabel="植物ホルモン情報を開く"
              showBorder
            />
            <MoreMenuItem
              label="農薬・病害虫"
              icon={
                <Ionicons name="bug-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/pesticides' })}
              accessibilityLabel="農薬・病害虫図鑑を開く"
              showBorder
            />
            <MoreMenuItem
              label="投稿分析"
              icon={
                <Ionicons name="bar-chart-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/analytics' })}
              accessibilityLabel="投稿分析を開く"
              showBorder
            />
            <MoreMenuItem
              label="マイ盆栽"
              icon={
                <Ionicons name="flower-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/bonsai' })}
              accessibilityLabel="マイ盆栽を開く"
              showBorder
            />
            <MoreMenuItem
              label="ブックマーク"
              icon={
                <Ionicons name="bookmark-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/bookmarks' })}
              accessibilityLabel="ブックマークを開く"
              showBorder
            />
            <MoreMenuItem
              label="盆栽園マップ"
              icon={
                <Ionicons name="map-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/shops' })}
              accessibilityLabel="盆栽園マップを開く"
              showBorder
            />
            <MoreMenuItem
              label="イベント"
              icon={
                <Ionicons name="calendar-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/events' })}
              accessibilityLabel="イベント一覧を開く"
              showBorder
            />
            <MoreMenuItem
              label="予約投稿"
              icon={
                <Ionicons name="time-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/scheduled-posts' })}
              accessibilityLabel="予約投稿を開く"
            />
          </MoreMenuGroup>
        </View>

        {/* グループ 3: その他（法的情報はネイティブ・ヘルプはWeb） */}
        <View style={styles.groupWithHeader}>
          <MoreSectionHeader label="その他" />
          <MoreMenuGroup>
            <MoreMenuItem
              label="利用規約"
              icon={
                <Ionicons name="document-text-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'terms' } })}
              accessibilityLabel="利用規約を開く"
              showBorder
            />
            <MoreMenuItem
              label="プライバシーポリシー"
              icon={
                <Ionicons name="shield-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'privacy' } })}
              accessibilityLabel="プライバシーポリシーを開く"
              showBorder
            />
            <MoreMenuItem
              label="特商法表記"
              icon={
                <Ionicons name="document-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="chevron"
              onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'tokushoho' } })}
              accessibilityLabel="特商法表記を開く"
              showBorder
            />
            <MoreMenuItem
              label="ヘルプ"
              icon={
                <Ionicons name="help-circle-outline" size={ICON_SIZE} color={colorTextSecondary} />
              }
              rightElement="external"
              onPress={() => void handleOpenBrowser(HELP_URL)}
              accessibilityLabel="ヘルプ（Web ページを開く）"
            />
          </MoreMenuGroup>
        </View>

        {/* グループ 4: 危険ゾーン（見出しなし） */}
        <MoreMenuGroup>
          <MoreMenuItem
            label={isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
            icon={
              <Ionicons name="log-out-outline" size={ICON_SIZE} color={colorError} />
            }
            rightElement="none"
            onPress={handleLogout}
            destructive
            disabled={isLoggingOut}
            accessibilityLabel="ログアウト"
          />
        </MoreMenuGroup>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
  },
  scrollContent: {
    padding: spacing4,
    gap: spacing4,
  },
  groupWithHeader: {
    gap: spacing1,
  },
  sectionHeader: {
    ...textSm,
    color: colorTextSecondary,
    letterSpacing: letterSpacingWide,
    paddingHorizontal: spacing1,
    paddingBottom: spacing1,
  },
});
