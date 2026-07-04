/**
 * @module components/settings/BackupCodesList
 * 2FA バックアップコード一覧表示。
 * expo-clipboard が依存に存在しないため、コピー導線は Text の選択（長押しコピー）に留める。
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  spacing2,
  spacing3,
  radiusMd,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type BackupCodesListProps = {
  codes: string[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BackupCodesList({ codes }: BackupCodesListProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        コードは長押しで選択・コピーできます。認証アプリにアクセスできなくなった場合に使用します。
      </Text>
      <View style={styles.grid}>
        {codes.map((code) => (
          <View key={code} style={styles.item}>
            <Text style={styles.code} selectable accessibilityLabel={`バックアップコード ${code}`}>
              {code}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing3,
  },
  hint: {
    ...textSm,
    color: colorTextSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  item: {
    minWidth: '47%',
    flexGrow: 1,
    backgroundColor: colorBorderLight,
    borderRadius: radiusMd,
    paddingVertical: spacing2,
    paddingHorizontal: spacing3,
  },
  code: {
    ...textBase,
    color: colorTextPrimary,
    textAlign: 'center',
  },
});
