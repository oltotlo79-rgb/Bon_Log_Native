import { Text, StyleSheet, ColorValue } from 'react-native';

type TabBarIconName = 'home' | 'search' | 'bell' | 'user';

type TabBarIconProps = {
  name: TabBarIconName;
  color: ColorValue;
  size?: number;
};

const ICON_CHARS: Record<TabBarIconName, string> = {
  home: '⌂',
  search: '⌕',
  bell: '🔔',
  user: '◉',
};

export function TabBarIcon({ name, color, size = 20 }: TabBarIconProps) {
  return (
    <Text
      style={[styles.icon, { color, fontSize: size }]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
    >
      {ICON_CHARS[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
    lineHeight: 24,
  },
});
