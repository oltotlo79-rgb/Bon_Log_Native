/**
 * @module components/profile/PublicToggleField
 * プロフィールの公開・非公開設定トグル。
 * 仕様: docs/design/profile-edit.md §7.6
 */

import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorSurfaceMuted,
  colorBorder,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ROW_MIN_HEIGHT = 56;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type PublicToggleFieldProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicToggleField({ value, onChange, disabled = false }: PublicToggleFieldProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.row, disabled && styles.rowDisabled]}>
        <Text style={styles.label} numberOfLines={1}>
          プロフィールを公開する
        </Text>
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{
            false: colorSurfaceMuted,
            true: colorActionPrimary,
          }}
          thumbColor={colorBackground}
          accessibilityRole="switch"
          accessibilityLabel="プロフィールを公開する"
          accessibilityState={{ checked: value }}
        />
      </View>

      <View style={styles.separator} />

      <Text style={styles.hint}>
        非公開にすると、フォロワー以外のユーザーからあなたの投稿やプロフィールが見えなくなります。
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colorBackground,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    gap: spacing2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_MIN_HEIGHT,
    gap: spacing3,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  label: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colorBorderLight,
  },
  hint: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 18,
  },
});
