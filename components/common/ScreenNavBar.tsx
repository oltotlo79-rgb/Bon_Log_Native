/**
 * @module components/common/ScreenNavBar
 * 戻るボタン + 中央タイトルの共通ナビゲーションバー。
 * プロフィール配下のサブスタック画面（フォロワー/フォロー中/いいね一覧等）で共用する。
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colorSurfaceWashi,
  colorTextPrimary,
  colorBorderLight,
  spacing4,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

export type ScreenNavBarProps = {
  title: string;
};

export function ScreenNavBar({ title }: ScreenNavBarProps) {
  return (
    <View style={styles.navBar}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="戻る"
      >
        <Ionicons
          name="chevron-back"
          size={22}
          color={colorTextPrimary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </TouchableOpacity>
      <Text style={styles.navTitle} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.navPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    height: 48,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
  },
  navTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  navPlaceholder: {
    width: 44,
  },
});
