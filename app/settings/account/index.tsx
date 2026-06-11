import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorError,
  colorErrorBg,
  colorBorderLight,
  spacing2,
  spacing4,
  spacing6,
  radiusLg,
  textBase,
  textLg,
  textSm,
  letterSpacingWidest,
  shadowWashi,
} from '@/lib/constants/design-tokens';

export default function SettingsAccountScreen() {
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
          アカウント設定
        </Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.group}>
          <TouchableOpacity
            style={[styles.item, styles.itemBorder]}
            accessibilityRole="button"
            accessibilityLabel="メールアドレスを変更する"
          >
            <Text style={styles.itemLabel}>メールアドレスを変更</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel="パスワードを変更する"
          >
            <Text style={styles.itemLabel}>パスワードを変更</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneLabel}>危険ゾーン</Text>
          <Text style={styles.dangerZoneDescription}>
            以下の操作は取り消すことができません。慎重に行ってください。
          </Text>
          {/*
            Google Play 審査要件: アプリ内からのアカウント削除導線が必須
            store-compliance.md 参照
          */}
          <TouchableOpacity
            style={styles.deleteButton}
            accessibilityRole="button"
            accessibilityLabel="アカウントを削除する（取り消し不可）"
          >
            <Text style={styles.deleteButtonText}>アカウントを削除する</Text>
          </TouchableOpacity>
        </View>
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
    gap: spacing6,
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
  itemLabel: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    color: colorTextSecondary,
    marginLeft: spacing2,
  },
  dangerZone: {
    backgroundColor: colorErrorBg,
    borderRadius: radiusLg,
    padding: spacing4,
    gap: spacing4,
  },
  dangerZoneLabel: {
    ...textBase,
    color: colorError,
    fontWeight: '600',
  },
  dangerZoneDescription: {
    ...textSm,
    color: colorTextSecondary,
  },
  deleteButton: {
    minHeight: 44,
    paddingVertical: spacing2,
    paddingHorizontal: spacing4,
    justifyContent: 'center',
  },
  deleteButtonText: {
    ...textBase,
    color: colorError,
    fontWeight: '600',
  },
});
