import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

type TabBarIconName = 'home' | 'search' | 'bell' | 'user';

type TabBarIconProps = {
  name: TabBarIconName;
  color: ColorValue;
  focused: boolean;
  size?: number;
};

// アクティブ時は塗り版、非アクティブ時はアウトライン版で塗り分ける（仕様 §2.2）
const ICON_NAMES: Record<TabBarIconName, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  home:   { active: 'home',          inactive: 'home-outline' },
  search: { active: 'search',        inactive: 'search-outline' },
  bell:   { active: 'notifications', inactive: 'notifications-outline' },
  user:   { active: 'person',        inactive: 'person-outline' },
};

export function TabBarIcon({ name, color, focused, size = 20 }: TabBarIconProps) {
  const iconName = focused ? ICON_NAMES[name].active : ICON_NAMES[name].inactive;

  return (
    <Ionicons
      name={iconName}
      size={size}
      color={color}
      // タブバーアイコン自体はタブボタン全体のアクセシビリティラベルで読み上げられるため装飾扱い
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
