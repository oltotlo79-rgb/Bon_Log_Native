/**
 * @module components/common/PrivateAccountNotice
 * 非公開アカウントへの案内表示。プロフィール本体・フォロワー/フォロー中/いいね一覧など、
 * 403（非公開アカウントの非フォロワーアクセス）を受け取る画面で共用する。
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorTextPrimary,
  spacing4,
  textBase,
  textLg,
} from '@/lib/constants/design-tokens';

const DEFAULT_DESCRIPTION =
  'フォローリクエストが承認されると、閲覧できるようになります。';

export type PrivateAccountNoticeProps = {
  /** 一覧の種類に応じた案内文言（省略時は汎用文言）*/
  description?: string;
};

export function PrivateAccountNotice({
  description = DEFAULT_DESCRIPTION,
}: PrivateAccountNoticeProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name="lock-closed-outline"
        size={32}
        color={colorTextPrimary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.title} accessibilityRole="header">
        このアカウントは非公開です
      </Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing4 * 2,
    gap: spacing4,
  },
  title: {
    ...textLg,
    color: colorTextPrimary,
    textAlign: 'center',
  },
  description: {
    ...textBase,
    color: colorTextPrimary,
    textAlign: 'center',
  },
});
