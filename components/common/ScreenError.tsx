/**
 * @module components/common/ScreenError
 * エラー状態を表示するコンポーネント（Web 版 PageError のモバイル版）。
 * Sentry 送信はこのコンポーネントに持たせず、ErrorBoundary や呼び出し元フックで行う。
 * 後から Sentry 送信を追加できるよう onError prop を用意している。
 * 仕様: docs/design/common-states.md §4
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorErrorBg,
  colorError,
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
import { ERR_GENERIC } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ScreenErrorProps = {
  /** エラータイトル文言（デフォルト: 「エラーが発生しました」）*/
  title?: string;
  /** 説明文言（デフォルト: ERR_GENERIC）*/
  description?: string;
  /** 再試行ボタンのコールバック（ErrorBoundary の reset / query の refetch）*/
  onRetry: () => void;
  /** 再試行ボタンのラベル（デフォルト: 「再試行」）*/
  retryLabel?: string;
  /** サブリンクのラベル（任意）*/
  subLinkLabel?: string;
  onSubLink?: () => void;
  /** 開発時のデバッグ情報（本番ビルドでは UI に表示しない）*/
  debugMessage?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ICON_CIRCLE_SIZE = 72;
const ICON_SIZE = 32;
const ACTION_BUTTON_MIN_WIDTH = 160;

export function ScreenError({
  title = 'エラーが発生しました',
  description = ERR_GENERIC,
  onRetry,
  retryLabel = '再試行',
  subLinkLabel,
  onSubLink,
  debugMessage,
}: ScreenErrorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons
          name="alert-circle-outline"
          size={ICON_SIZE}
          color={colorError}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>

      <Text style={styles.description}>{description}</Text>

      {/* 開発時のみ技術的なエラー詳細を表示する */}
      {__DEV__ && debugMessage !== undefined && debugMessage.length > 0 && (
        <Text style={styles.debugMessage}>{debugMessage}</Text>
      )}

      <Pressable
        style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="再試行する"
      >
        <Text style={styles.retryButtonText}>{retryLabel}</Text>
      </Pressable>

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
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorErrorBg,
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
  debugMessage: {
    ...textSm,
    color: colorError,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  retryButton: {
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
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
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
