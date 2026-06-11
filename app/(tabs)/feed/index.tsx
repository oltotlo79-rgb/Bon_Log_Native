import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorBorderLight,
  colorFab,
  colorFabText,
  spacing4,
  spacing5,
  textLg,
  letterSpacingWidest,
  radiusFull,
  shadowWashiLg,
} from '@/lib/constants/design-tokens';
import { ROUTE_POST_NEW, ROUTE_SEARCH } from '@/lib/constants/routes';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { useOnlineStatus } from '@/hooks/use-online-status';

const TAB_BAR_HEIGHT = 60;
const FAB_SIZE = 56;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  // FAB の bottom は BottomTabBar 高さ + セーフエリア下端 + spacing4 分を確保する（仕様 §4.2）
  const fabBottom =
    TAB_BAR_HEIGHT +
    (Platform.OS === 'android' ? insets.bottom : 0) +
    spacing4;

  function handlePressFab() {
    router.push(ROUTE_POST_NEW);
  }

  function handleSearchAction() {
    router.push(ROUTE_SEARCH);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={!isOnline} />

      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          ホーム
        </Text>
      </View>

      <ScreenEmpty
        iconName="leaf-outline"
        title="タイムラインに投稿がありません"
        description="ユーザーをフォローすると、その人の投稿がここに表示されます"
        actionLabel="ユーザーを検索"
        onAction={handleSearchAction}
      />

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
