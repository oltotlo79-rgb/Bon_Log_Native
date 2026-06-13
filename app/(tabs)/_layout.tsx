import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarIcon } from '@/components/common/TabBarIcon';
import { useUnreadCountQuery } from '@/lib/queries/notifications';
import {
  colorNavBackground,
  colorNavIconActive,
  colorNavIconInactive,
  colorNavLabel,
  colorNavLabelInactive,
  colorBorderLight,
  colorError,
  colorTextInverse,
  textXs,
  letterSpacingWidest,
  radiusFull,
} from '@/lib/constants/design-tokens';
import { BADGE_OVERFLOW_THRESHOLD } from '@/lib/constants/limits/ui';

const TAB_BAR_HEIGHT = 60;

// ---------------------------------------------------------------------------
// 未読バッジ（notifications-screen.md §7）
// ---------------------------------------------------------------------------

const BADGE_MIN_SIZE = 18;

type UnreadBadgeProps = {
  count: number;
};

function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const label = count > BADGE_OVERFLOW_THRESHOLD ? '99+' : String(count);

  return (
    <View
      style={styles.badge}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 通知タブアイコン（バッジ付き）
// ---------------------------------------------------------------------------

type NotificationTabIconProps = {
  color: ColorValue;
  focused: boolean;
  size: number;
};

function NotificationTabIcon({ color, focused, size }: NotificationTabIconProps) {
  const { data } = useUnreadCountQuery();
  const unreadCount = data?.count ?? 0;

  const accessibilityLabel =
    unreadCount > 0 ? `未読通知 ${unreadCount} 件` : '通知';

  return (
    <View accessibilityLabel={accessibilityLabel}>
      <TabBarIcon name="bell" color={color} focused={focused} size={size} />
      <UnreadBadge count={unreadCount} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// タブレイアウト
// ---------------------------------------------------------------------------

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            // Android では NavigationBar 分をパディングで確保する
            height: TAB_BAR_HEIGHT + (Platform.OS === 'android' ? insets.bottom : 0),
            paddingBottom: Platform.OS === 'android' ? insets.bottom : 0,
          },
        ],
        tabBarActiveTintColor: colorNavIconActive,
        tabBarInactiveTintColor: colorNavIconInactive,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="feed/index"
        options={{
          title: 'ホーム',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="ホーム" focused={focused} />
          ),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" color={color} focused={focused} size={20} />
          ),
          tabBarAccessibilityLabel: 'ホーム',
        }}
      />
      <Tabs.Screen
        name="search/index"
        options={{
          title: '検索',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="検索" focused={focused} />
          ),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="search" color={color} focused={focused} size={20} />
          ),
          tabBarAccessibilityLabel: '検索',
        }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: '通知',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="通知" focused={focused} />
          ),
          tabBarIcon: ({ color, focused }) => (
            <NotificationTabIcon color={color} focused={focused} size={20} />
          ),
          tabBarAccessibilityLabel: '通知',
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'プロフィール',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="プロフィール" focused={focused} />
          ),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="user" color={color} focused={focused} size={20} />
          ),
          tabBarAccessibilityLabel: 'プロフィール',
        }}
      />
    </Tabs>
  );
}

type TabLabelProps = {
  label: string;
  focused: boolean;
};

function TabLabel({ label, focused }: TabLabelProps) {
  return (
    <Text
      style={[
        styles.tabLabelText,
        {
          color: focused ? colorNavLabel : colorNavLabelInactive,
          fontWeight: focused ? '700' : '400',
        },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colorNavBackground,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
  },
  tabBarItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabelText: {
    ...textXs,
    letterSpacing: letterSpacingWidest,
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: BADGE_MIN_SIZE,
    height: BADGE_MIN_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorError,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    ...textXs,
    color: colorTextInverse,
    fontWeight: '700',
    lineHeight: BADGE_MIN_SIZE,
  },
});
