/**
 * @module components/common/MoreMenuItem
 * もっと見る画面の各メニュー行コンポーネント。
 * 仕様: docs/design/more-menu.md §6.2
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  colorTextPrimary,
  colorTextTertiary,
  colorError,
  spacing2,
  spacing3,
  spacing4,
  textBase,
  textSm,
  colorTextSecondary,
} from '@/lib/constants/design-tokens';

// Web の MobileNav InkSeparator（メニュー行区切りの波線）を移植。
// RN にはドロップアップメニューの構造がないため、フラットな一覧画面の
// 行区切りとして同アセットを適用する（sumi-e-theme-parity §3.5）。
const INK_SEPARATOR_SOURCE = require('@/assets/images/brush-frames/ink-separator.svg');
const INK_SEPARATOR_HEIGHT = 2;

type RightElement = 'chevron' | 'external' | 'none';

type MoreMenuItemProps = {
  label: string;
  icon?: React.ReactNode;
  description?: string;
  rightElement?: RightElement;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  showBorder?: boolean;
  accessibilityLabel: string;
};

export function MoreMenuItem({
  label,
  icon,
  description,
  rightElement = 'chevron',
  onPress,
  destructive = false,
  disabled = false,
  showBorder = false,
  accessibilityLabel,
}: MoreMenuItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.item,
        showBorder && styles.itemBorder,
        disabled && styles.itemDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {icon !== undefined && (
        <View
          style={styles.iconContainer}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {icon}
        </View>
      )}

      <View style={styles.labelContainer}>
        <Text style={[styles.label, destructive && styles.labelDestructive]}>
          {label}
        </Text>
        {description !== undefined && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>

      {rightElement === 'chevron' && (
        <Text
          style={styles.chevron}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          ›
        </Text>
      )}
      {rightElement === 'external' && (
        <Ionicons
          name="open-outline"
          size={16}
          color={colorTextTertiary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}

      {showBorder && (
        <Image
          source={INK_SEPARATOR_SOURCE}
          style={styles.itemSeparator}
          contentFit="fill"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    minHeight: 44,
    paddingVertical: spacing2,
  },
  itemBorder: {
    // 区切り線は itemSeparator（ink-separator.svg）で表現するため、ここでは
    // 装飾の重なりを防ぐ余白確保のみ行う
    paddingBottom: spacing2,
  },
  itemSeparator: {
    position: 'absolute',
    bottom: 0,
    left: spacing4,
    right: spacing4,
    height: INK_SEPARATOR_HEIGHT,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: spacing3,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    ...textBase,
    color: colorTextPrimary,
  },
  labelDestructive: {
    color: colorError,
  },
  description: {
    ...textSm,
    color: colorTextSecondary,
    marginTop: spacing2,
  },
  chevron: {
    fontSize: 18,
    color: colorTextTertiary,
    marginLeft: spacing2,
  },
});
