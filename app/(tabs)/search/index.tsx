import { View, Text, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colorBackground,
  colorSurfaceWashi,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorBorder,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  textBase,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

export default function SearchScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          検索
        </Text>
      </View>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="ユーザー、ハッシュタグ、投稿を検索"
          placeholderTextColor={colorTextSecondary}
          returnKeyType="search"
          accessibilityLabel="検索入力欄"
          accessibilityRole="search"
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>
          検索画面（実装予定）
        </Text>
        <Text style={styles.description}>
          ユーザー・ハッシュタグ・投稿を検索できます。
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
  },
  searchBarContainer: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorBackground,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  searchInput: {
    height: 44,
    backgroundColor: colorSurfaceMuted,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    ...textBase,
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
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
  },
});
