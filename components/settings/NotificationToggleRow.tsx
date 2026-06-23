/**
 * @module components/settings/NotificationToggleRow
 * 通知設定 1 トグル行（notification-settings.md §3.3）。
 * FlatList 外の静的リストで使うため memo 化する。
 */

import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import type { NotificationPreferenceKey } from '@/lib/constants/notification-settings';
import {
  colorTextPrimary,
  colorTextTertiary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorSurfaceMuted,
  colorSurfaceWashi,
  colorBorderLight,
  spacing4,
  textBase,
  textXs,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type NotificationToggleRowProps = {
  notificationKey: NotificationPreferenceKey;
  label: string;
  value: boolean;
  onToggle: (key: NotificationPreferenceKey, value: boolean) => void;
  isDisabled: boolean;
  sublabel?: string;
  isLast?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function NotificationToggleRowBase({
  notificationKey,
  label,
  value,
  onToggle,
  isDisabled,
  sublabel,
  isLast = false,
}: NotificationToggleRowProps) {
  return (
    <View
      style={[styles.row, isLast && styles.rowLast, isDisabled && styles.rowDisabled]}
    >
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {sublabel !== undefined && (
          <Text style={styles.sublabel}>{sublabel}</Text>
        )}
      </View>
      <Switch
        testID={`notification-setting-${notificationKey}`}
        value={value}
        onValueChange={(newValue) => onToggle(notificationKey, newValue)}
        disabled={isDisabled}
        trackColor={{ false: colorSurfaceMuted, true: colorActionPrimary }}
        // Android: サム色を ON/OFF で出し分ける
        thumbColor={
          Platform.OS === 'android'
            ? value
              ? colorActionPrimaryText
              : colorSurfaceWashi
            : undefined
        }
        accessibilityLabel={`${label}の通知`}
        accessibilityHint={value ? 'タップしてオフにする' : 'タップしてオンにする'}
        accessibilityState={{ checked: value, disabled: isDisabled }}
      />
    </View>
  );
}

export const NotificationToggleRow = React.memo(NotificationToggleRowBase);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: spacing4,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  labelContainer: {
    flex: 1,
    marginRight: spacing4,
  },
  label: {
    ...textBase,
    color: colorTextPrimary,
  },
  sublabel: {
    ...textXs,
    color: colorTextTertiary,
    marginTop: 2,
  },
});
