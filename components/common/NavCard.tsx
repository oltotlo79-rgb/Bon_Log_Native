/**
 * @module components/common/NavCard
 * 施肥・ホルモン等のトップ画面で共用するナビゲーションカード。
 * アイコンボックス + ラベル + オプショナルカウントバッジ + 説明文 + ChevronRight の全幅カード。
 * ホルモントップ・施肥トップで同一コンポーネントを流用するため common 配置にする。
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBorder,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  textSm,
  textXs,
  shadowWashi,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type NavCardProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  count?: number;
  onPress: () => void;
  accessibilityLabel?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const NavCard = memo(function NavCard({
  iconName,
  label,
  description,
  count,
  onPress,
  accessibilityLabel,
}: NavCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}へ移動`}
    >
      <View style={styles.iconBox}>
        <Ionicons
          name={iconName}
          size={18}
          color={colorTextSecondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>

      <View style={styles.textBlock}>
        <View style={styles.labelRow}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {count !== undefined && count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={colorTextSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    minHeight: 64,
    ...shadowWashi,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: spacing2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    flexWrap: 'wrap',
  },
  label: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  countBadge: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countText: {
    ...textXs,
    color: colorTextSecondary,
  },
  description: {
    ...textXs,
    color: colorTextSecondary,
  },
});
