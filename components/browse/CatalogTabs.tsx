/**
 * @module components/browse/CatalogTabs
 * カタログ系画面の水平タブ切替コンポーネント。
 * 仕様: docs/design/browse-screens.md §C-3
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  colorSurfaceWashi,
  colorBorderLight,
  colorActionPrimary,
  colorTextPrimary,
  colorTextSecondary,
  textMd,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const TAB_HEIGHT = 44;
const INDICATOR_HEIGHT = 2;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type TabItem = {
  key: string;
  label: string;
};

type CatalogTabsProps = {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CatalogTabs = memo(function CatalogTabs({
  tabs,
  activeKey,
  onChange,
}: CatalogTabsProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: TAB_HEIGHT,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  scrollContent: {
    flexDirection: 'row',
    flexGrow: 1,
  },
  tab: {
    flex: 1,
    minWidth: 80,
    height: TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    ...textMd,
    color: colorTextSecondary,
  },
  tabTextActive: {
    color: colorTextPrimary,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: INDICATOR_HEIGHT,
    backgroundColor: colorActionPrimary,
  },
});
