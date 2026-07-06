import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { TabBarIcon } from '@/components/common/TabBarIcon';
import { NavTabIcon } from '@/components/common/NavTabIcon';
import { NavActiveInkUnderline } from '@/components/common/NavActiveIndicator';
import { useUnreadCountQuery } from '@/lib/queries/notifications';
import {
  colorNavBackground,
  colorNavIconActive,
  colorNavIconInactive,
  colorNavLabel,
  colorNavLabelInactive,
  colorError,
  colorTextInverse,
  textXs,
  letterSpacingWidest,
  radiusFull,
} from '@/lib/constants/design-tokens';
import { BADGE_OVERFLOW_THRESHOLD } from '@/lib/constants/limits/ui';

const TAB_BAR_HEIGHT = 60;

// ---------------------------------------------------------------------------
// タブバー背景の墨筆装飾（Web の MobileNav InkStrokeBorder + 和紙ノイズを移植）
// ---------------------------------------------------------------------------

const INK_STROKE_TOP_SOURCE = require('@/assets/images/brush-frames/ink-stroke-top.svg');
const WASHI_NOISE_SOURCE = require('@/assets/images/brush-frames/washi-noise.svg');

const INK_STROKE_TOP_HEIGHT = 6;
/** Web の `opacity-[0.03]`（ライトモード時）と同値 */
const WASHI_NOISE_OPACITY = 0.03;

function TabBarBackground() {
  return (
    <View style={styles.tabBarBackground} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.tabBarBackgroundFill} />
      <Image
        source={WASHI_NOISE_SOURCE}
        style={styles.washiNoise}
        contentFit="cover"
        accessible={false}
      />
      <Image
        source={INK_STROKE_TOP_SOURCE}
        style={styles.inkStrokeTop}
        contentFit="fill"
        accessible={false}
      />
    </View>
  );
}

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
        tabBarBackground: TabBarBackground,
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
            <NavTabIcon focused={focused}>
              <TabBarIcon name="home" color={color} focused={focused} size={20} />
            </NavTabIcon>
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
            <NavTabIcon focused={focused}>
              <TabBarIcon name="search" color={color} focused={focused} size={20} />
            </NavTabIcon>
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
            <NavTabIcon focused={focused}>
              <NotificationTabIcon color={color} focused={focused} size={20} />
            </NavTabIcon>
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
            <NavTabIcon focused={focused}>
              <TabBarIcon name="user" color={color} focused={focused} size={20} />
            </NavTabIcon>
          ),
          tabBarAccessibilityLabel: 'プロフィール',
        }}
      />
      <Tabs.Screen
        name="more/index"
        options={{
          title: 'もっと見る',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="もっと見る" focused={focused} />
          ),
          tabBarIcon: ({ color, focused }) => (
            <NavTabIcon focused={focused}>
              <TabBarIcon name="more" color={color} focused={focused} size={20} />
            </NavTabIcon>
          ),
          tabBarAccessibilityLabel: 'もっと見る',
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
    <View style={styles.tabLabelFrame}>
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
      {focused && <NavActiveInkUnderline />}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colorNavBackground,
  },
  tabBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  tabBarBackgroundFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colorNavBackground,
  },
  washiNoise: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: WASHI_NOISE_OPACITY,
  },
  inkStrokeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: INK_STROKE_TOP_HEIGHT,
  },
  tabBarItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabelFrame: {
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
