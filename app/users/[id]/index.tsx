import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  spacing2,
  spacing4,
  textBase,
  textLg,
  textSm,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import { ERR_USER_NOT_FOUND } from '@/lib/constants/errors';

export default function UserDetailScreen() {
  const params = useLocalSearchParams();
  const rawId = params['id'];

  if (typeof rawId !== 'string' || rawId.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{ERR_USER_NOT_FOUND}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="戻る"
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const userId = rawId;

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
          プロフィール
        </Text>
        <TouchableOpacity
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel="メニューを開く（ブロック・通報）"
        >
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>ユーザープロフィール画面（実装予定）</Text>
        <Text style={styles.description}>ユーザーID: {userId}</Text>
        <Text style={styles.description}>
          フォロー・ブロック・通報などのアクションが表示されます。
        </Text>
      </View>
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
  menuButton: {
    minWidth: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: colorTextPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing4,
    gap: spacing2,
  },
  placeholder: {
    ...textLg,
    color: colorTextPrimary,
  },
  description: {
    ...textSm,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing4,
    gap: spacing4,
  },
  errorText: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
  },
});
