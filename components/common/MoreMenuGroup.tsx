/**
 * @module components/common/MoreMenuGroup
 * もっと見る画面のメニューグループコンテナ。
 * 仕様: docs/design/more-menu.md §6.1
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  colorSurface,
  radiusLg,
  shadowWashi,
} from '@/lib/constants/design-tokens';

type MoreMenuGroupProps = {
  children: React.ReactNode;
};

export function MoreMenuGroup({ children }: MoreMenuGroupProps) {
  return (
    <View style={styles.group}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    ...shadowWashi,
    overflow: 'hidden',
  },
});
