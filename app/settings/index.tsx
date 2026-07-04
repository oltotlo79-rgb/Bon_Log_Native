import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Sentry from '@sentry/react-native';
import { useLogoutMutation } from '@/lib/queries/auth';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorError,
  colorBorderLight,
  spacing2,
  spacing4,
  radiusLg,
  textBase,
  textLg,
  textSm,
  letterSpacingWidest,
  shadowWashi,
} from '@/lib/constants/design-tokens';
import { routes } from '@/lib/constants/routes';
import { HELP_URL } from '@/lib/constants/external-links';

type SettingItem = {
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type SettingGroup = {
  items: SettingItem[];
};

export default function SettingsScreen() {
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
            // ログアウト成功後は AuthGuard が login 画面へリダイレクトする
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

  const settingGroups: SettingGroup[] = [
    {
      items: [
        {
          label: 'プロフィール設定',
          onPress: () => router.push(routes.settingsProfile),
        },
        {
          label: 'アカウント設定',
          description: 'メール・パスワード変更、アカウント削除',
          onPress: () => router.push(routes.settingsAccount),
        },
        {
          label: '通知設定',
          onPress: () => router.push(routes.settingsNotifications),
        },
      ],
    },
    {
      items: [
        {
          label: 'プレミアムプラン',
          description: '購入・管理・復元',
          onPress: () => router.push(routes.settingsSubscription),
        },
        {
          label: 'ブロックリスト',
          onPress: () => router.push(routes.settingsBlocked),
        },
        {
          label: 'ミュートリスト',
          onPress: () => router.push(routes.settingsMuted),
        },
        {
          label: 'フォローリクエスト',
          onPress: () => router.push(routes.followRequests),
        },
      ],
    },
    {
      items: [
        {
          label: 'ヘルプ',
          onPress: () => void handleOpenBrowser(HELP_URL),
        },
        {
          label: '利用規約',
          onPress: () => router.push(routes.legalDocument('terms')),
        },
        {
          label: 'プライバシーポリシー',
          onPress: () => router.push(routes.legalDocument('privacy')),
        },
      ],
    },
    {
      items: [
        {
          label: isLoggingOut ? 'ログアウト中...' : 'ログアウト',
          onPress: handleLogout,
          destructive: true,
          disabled: isLoggingOut,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
          設定
        </Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        accessibilityLabel="設定メニュー"
      >
        {settingGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.group}>
            {group.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={[
                  styles.item,
                  itemIndex < group.items.length - 1 && styles.itemBorder,
                ]}
                onPress={item.onPress}
                disabled={item.disabled}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.itemContent}>
                  <Text
                    style={[
                      styles.itemLabel,
                      item.destructive && styles.itemLabelDestructive,
                      item.disabled && styles.itemLabelDisabled,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.description !== undefined && (
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  )}
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
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
    gap: spacing4,
  },
  group: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    ...shadowWashi,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    minHeight: 44,
    paddingVertical: spacing2,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    ...textBase,
    color: colorTextPrimary,
  },
  itemLabelDestructive: {
    color: colorError,
  },
  itemLabelDisabled: {
    opacity: 0.5,
  },
  itemDescription: {
    ...textSm,
    color: colorTextSecondary,
    marginTop: spacing2,
  },
  chevron: {
    fontSize: 18,
    color: colorTextSecondary,
    marginLeft: spacing2,
  },
});
