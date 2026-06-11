import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarIcon } from '@/components/common/TabBarIcon';
import {
  colorNavBackground,
  colorNavIconActive,
  colorNavIconInactive,
  colorNavLabel,
  colorNavLabelInactive,
  colorBorderLight,
  textXs,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

const TAB_BAR_HEIGHT = 60;

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
        tabBarLabelStyle: styles.tabBarLabel,
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
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="home" color={color} size={20} />
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
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="search" color={color} size={20} />
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
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="bell" color={color} size={20} />
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
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="user" color={color} size={20} />
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
  tabBarLabel: {
    ...textXs,
    letterSpacing: letterSpacingWidest,
    marginTop: 4,
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
});
