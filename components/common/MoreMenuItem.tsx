/**
 * @module components/common/MoreMenuItem
 * もっと見る画面の各メニュー行コンポーネント。
 * 仕様: docs/design/more-menu.md §6.2
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorTextPrimary,
  colorTextTertiary,
  colorError,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  textBase,
  textSm,
  colorTextSecondary,
} from '@/lib/constants/design-tokens';

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
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
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
