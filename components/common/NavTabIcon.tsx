/**
 * @module components/common/NavTabIcon
 * ボトムタブのアイコンをラップし、アクティブコピー側にのみ墨点装飾を重ねる。
 * react-navigation はアイコンレンダラーを「アクティブ/非アクティブ」の2コピーで
 * 呼び出し、opacity（0 or 1）で表示を切り替えるため、focused===true 側にのみ
 * 装飾を差し込めば実際の選択状態と自動的に連動する。
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavActiveInkDot } from './NavActiveIndicator';

type NavTabIconProps = {
  focused: boolean;
  children: React.ReactNode;
};

export function NavTabIcon({ focused, children }: NavTabIconProps) {
  return (
    <View style={styles.frame}>
      {focused && <NavActiveInkDot />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
