/**
 * @module components/common/ScreenEmpty
 * データが 0 件の場合に表示するコンポーネント。
 * 墨絵イラスト（webP） + 見出し + 補足 + 任意アクションボタン。
 * variant で Web 版 placeholders に対応する墨絵を選択する。
 * 仕様: docs/design/common-states.md §3
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  colorActionPrimary,
  colorActionPrimaryText,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusFull,
  radiusLg,
  textLg,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 墨絵イラスト定義
// Web 版 placeholders（400×300 px webP）をモバイル向けサイズに縮小表示する。
// 表示サイズ定数は lib/constants/limits/ui.ts への移行を core チームへ依頼中。
// ---------------------------------------------------------------------------

const ILLUSTRATION_WIDTH = 192;
const ILLUSTRATION_HEIGHT = 144;

// variant → ローカル画像のマッピング（アスペクト比 4:3 を維持）
// require() の戻り値は Expo Metro が解決するリソース ID（number）。
/* eslint-disable @typescript-eslint/no-require-imports */
const ILLUSTRATION_MAP: Record<string, number> = {
  feed: require('@/assets/images/placeholders/empty-timeline.webp'),
  bookmark: require('@/assets/images/placeholders/empty-bookmark.webp'),
  notification: require('@/assets/images/placeholders/empty-notification.webp'),
  search: require('@/assets/images/placeholders/empty-search.webp'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

type EmptyVariant = 'feed' | 'bookmark' | 'notification' | 'search';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ScreenEmptyProps = {
  /**
   * 墨絵バリアント。指定すると Web 版対応の墨絵を表示し、アイコン円を非表示にする。
   * 省略時はアイコン円（iconName）を表示する従来の挙動を維持する。
   */
  variant?: EmptyVariant;
  /** アイコン名（Ionicons）。variant 未指定時のフォールバック。省略時は "leaf-outline" */
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  /** 見出し文言（必須） */
  title: string;
  /** 補足文言（任意） */
  description?: string;
  /** アクションボタンのラベル（actionLabel と onAction は対で指定） */
  actionLabel?: string;
  onAction?: () => void;
  /** サブリンクのラベル（subLinkLabel と onSubLink は対で指定） */
  subLinkLabel?: string;
  onSubLink?: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ICON_CIRCLE_SIZE = 72;
const ICON_SIZE = 32;
const ACTION_BUTTON_MIN_WIDTH = 160;

export function ScreenEmpty({
  variant,
  iconName = 'leaf-outline',
  title,
  description,
  actionLabel,
  onAction,
  subLinkLabel,
  onSubLink,
}: ScreenEmptyProps) {
  const illustrationSource = variant !== undefined ? ILLUSTRATION_MAP[variant] : undefined;

  return (
    <View style={styles.container}>
      {illustrationSource !== undefined ? (
        <Image
          source={illustrationSource}
          style={styles.illustration}
          contentFit="contain"
          accessibilityLabel="空状態のイラスト"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : (
        <View style={styles.iconCircle}>
          <Ionicons
            name={iconName}
            size={ICON_SIZE}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
      )}

      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>

      {description !== undefined && description.length > 0 && (
        <Text style={styles.description}>{description}</Text>
      )}

      {actionLabel !== undefined && onAction !== undefined && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </Pressable>
      )}

      {subLinkLabel !== undefined && onSubLink !== undefined && (
        <Pressable
          style={({ pressed }) => [styles.subLink, pressed && styles.subLinkPressed]}
          onPress={onSubLink}
          accessibilityRole="button"
          accessibilityLabel={subLinkLabel}
        >
          <Text style={styles.subLinkText}>{subLinkLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing8,
    backgroundColor: colorBackground,
    gap: spacing4,
  },
  illustration: {
    width: ILLUSTRATION_WIDTH,
    height: ILLUSTRATION_HEIGHT,
    opacity: 0.6,
    marginBottom: spacing2,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing2,
  },
  title: {
    ...textLg,
    color: colorTextPrimary,
    textAlign: 'center',
  },
  description: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: colorActionPrimary,
    borderRadius: radiusLg,
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
    minWidth: ACTION_BUTTON_MIN_WIDTH,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing2,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
  subLink: {
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subLinkPressed: {
    opacity: 0.6,
  },
  subLinkText: {
    ...textSm,
    color: colorTextLink,
    fontWeight: '600',
  },
});
