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
import { ROUTE_PROFILE, routes } from '@/lib/constants/routes';
import { TERMS_URL, PRIVACY_POLICY_URL, HELP_URL } from '@/lib/constants/external-links';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorError,
  colorBorderLight,
  spacing4,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

const ICON_SIZE = 20;

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
        {/* グループ 1: ナビゲーション */}
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

        {/* グループ 2: 情報 */}
        <MoreMenuGroup>
          <MoreMenuItem
            label="利用規約"
            icon={
              <Ionicons name="document-text-outline" size={ICON_SIZE} color={colorTextSecondary} />
            }
            rightElement="external"
            onPress={() => void handleOpenBrowser(TERMS_URL)}
            accessibilityLabel="利用規約を開く（外部ブラウザ）"
            showBorder
          />
          <MoreMenuItem
            label="プライバシーポリシー"
            icon={
              <Ionicons name="shield-outline" size={ICON_SIZE} color={colorTextSecondary} />
            }
            rightElement="external"
            onPress={() => void handleOpenBrowser(PRIVACY_POLICY_URL)}
            accessibilityLabel="プライバシーポリシーを開く（外部ブラウザ）"
            showBorder
          />
          <MoreMenuItem
            label="ヘルプ"
            icon={
              <Ionicons name="help-circle-outline" size={ICON_SIZE} color={colorTextSecondary} />
            }
            rightElement="external"
            onPress={() => void handleOpenBrowser(HELP_URL)}
            accessibilityLabel="ヘルプページを開く（外部ブラウザ）"
          />
        </MoreMenuGroup>

        {/* グループ 3: 危険ゾーン */}
        <MoreMenuGroup>
          <MoreMenuItem
            label={isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
            icon={
              <Ionicons name="log-out-outline" size={ICON_SIZE} color={colorError} />
            }
            rightElement={isLoggingOut ? 'none' : 'chevron'}
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
});
