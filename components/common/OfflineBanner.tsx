/**
 * @module components/common/OfflineBanner
 * オフライン状態を画面上部に固定表示するバナー（純粋表示コンポーネント）。
 * オフライン状態の検知は useOnlineStatus フックで行い、呼び出し側が isVisible を渡す。
 * 仕様: docs/design/common-states.md §5
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colorTextPrimary,
  colorWarning,
  colorWarningBg,
  colorBorder,
  spacing2,
  spacing3,
  textSm,
  durationNormal,
  durationFast,
} from '@/lib/constants/design-tokens';
import { ERR_OFFLINE } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const BANNER_HEIGHT = 36;
const ICON_SIZE = 14;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type OfflineBannerProps = {
  /** 表示制御フラグ */
  isVisible: boolean;
  /** バナー文言（デフォルト: ERR_OFFLINE）*/
  message?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OfflineBanner({ isVisible, message = ERR_OFFLINE }: OfflineBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT - insets.top)).current;

  useEffect(() => {
    // react/react-native-renderer のバージョン不一致により jest テスト環境では
    // useNativeDriver: true がクラッシュするため false を使う。
    // 実機では Reanimated 移行時に true に戻すことを推奨（performance.md）。
    Animated.timing(translateY, {
      toValue: isVisible ? 0 : -BANNER_HEIGHT - insets.top,
      duration: isVisible ? durationNormal : durationFast,
      useNativeDriver: false,
    }).start();
  }, [isVisible, translateY, insets.top]);

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          paddingTop: insets.top,
          top: 0,
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={isVisible ? message : undefined}
    >
      <View style={styles.content}>
        <Ionicons
          name="wifi-outline"
          size={ICON_SIZE}
          color={colorWarning}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.text} numberOfLines={1}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: BANNER_HEIGHT,
    backgroundColor: colorWarningBg,
    borderLeftWidth: 3,
    borderLeftColor: colorWarning,
    borderBottomWidth: 1,
    borderBottomColor: colorBorder,
    zIndex: 999,
  },
  content: {
    height: BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing3,
    gap: spacing2,
  },
  text: {
    ...textSm,
    color: colorTextPrimary,
    flex: 1,
  },
});
