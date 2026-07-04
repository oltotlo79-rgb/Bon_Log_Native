/**
 * @module components/profile/ProfileTabBar
 * プロフィール画面の「投稿」「コメント」タブ切り替えバー。
 * 自分・他人どちらのプロフィールでも共用する（Web 版 components/user/ProfileTabs.tsx のタブ相当）。
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  colorBackground,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  textMd,
  letterSpacingTight,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ProfileTab = 'posts' | 'comments';

type ProfileTabDefinition = { key: ProfileTab; label: string };

const PROFILE_TABS: ProfileTabDefinition[] = [
  { key: 'posts', label: '投稿' },
  { key: 'comments', label: 'コメント' },
];

export type ProfileTabBarProps = {
  activeTab: ProfileTab;
  onSelect: (tab: ProfileTab) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileTabBar({ activeTab, onSelect }: ProfileTabBarProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {PROFILE_TABS.map(({ key, label }) => {
        const isActive = activeTab === key;
        return (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
            onPress={() => onSelect(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colorBackground,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  tab: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colorActionPrimary,
  },
  tabPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  label: {
    ...textMd,
    letterSpacing: letterSpacingTight,
  },
  labelActive: {
    color: colorTextPrimary,
    fontWeight: '700',
  },
  labelInactive: {
    color: colorTextSecondary,
    fontWeight: '400',
  },
});
