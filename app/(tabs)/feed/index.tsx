import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorFab,
  colorFabText,
  spacing4,
  spacing5,
  textBase,
  textLg,
  letterSpacingWidest,
  radiusFull,
  shadowWashiLg,
} from '@/lib/constants/design-tokens';
import { ROUTE_POST_NEW } from '@/lib/constants/routes';

const TAB_BAR_HEIGHT = 60;
const FAB_SIZE = 56;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();

  // FAB の bottom は BottomTabBar 高さ + セーフエリア下端 + spacing4 分を確保する（仕様 §4.2）
  const fabBottom =
    TAB_BAR_HEIGHT +
    (Platform.OS === 'android' ? insets.bottom : 0) +
    spacing4;

  function handlePressFab() {
    router.push(ROUTE_POST_NEW);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          ホーム
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>
          フィード（実装予定）
        </Text>
        <Text style={styles.description}>
          フォロー中のユーザーの投稿が表示されます。
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: fabBottom },
          shadowWashiLg,
          pressed && styles.fabPressed,
        ]}
        onPress={handlePressFab}
        accessibilityRole="button"
        accessibilityLabel="新規投稿"
        hitSlop={spacing5}
      >
        <Ionicons name="add" size={28} color={colorFabText} />
      </Pressable>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing4,
    gap: spacing4,
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
  fab: {
    position: 'absolute',
    right: spacing4,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorFab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    opacity: 0.85,
  },
});
