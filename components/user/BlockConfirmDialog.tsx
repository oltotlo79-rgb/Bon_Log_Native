/**
 * @module components/user/BlockConfirmDialog
 * ブロック確認ダイアログ。ブロックはフォロー解除という不可逆な影響があるため確認を必須とする。
 * 仕様: docs/design/ugc-safety.md §3.1
 *
 * iOS はネイティブ Alert（destructive スタイルを OS が赤色表示）、
 * Android はカスタムモーダルダイアログを使う（設計 §3.1）。
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import {
  colorBackground,
  colorError,
  colorTextPrimary,
  colorTextSecondary,
  colorTextInverse,
  spacing4,
  spacing5,
  spacing6,
  radiusLg,
  radiusMd,
  shadowWashiLg,
  textLg,
  textBase,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CONFIRM_BUTTON_HEIGHT = 44;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type BlockConfirmDialogProps = {
  targetUserId: string;
  targetNickname: string;
  onConfirm: () => void;
  onCancel: () => void;
  isBlocking: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlockConfirmDialog({
  targetNickname,
  onConfirm,
  onCancel,
  isBlocking,
}: BlockConfirmDialogProps) {
  // iOS: ネイティブ Alert を使用（設計 §3.1）
  useEffect(() => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        `@${targetNickname} をブロックしますか？`,
        'ブロックすると、互いにフォローしている場合はフォロー関係が解除され、相手はあなたのプロフィールを検索・フォローできなくなります。',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: onCancel,
          },
          {
            text: 'ブロックする',
            style: 'destructive',
            onPress: onConfirm,
          },
        ],
        { cancelable: true, onDismiss: onCancel }
      );
    }
  // Alert は一度だけ表示する
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // iOS はネイティブ Alert を使うためカスタムダイアログは表示しない
  if (Platform.OS === 'ios') return null;

  return <AndroidBlockConfirmDialog targetNickname={targetNickname} onConfirm={onConfirm} onCancel={onCancel} isBlocking={isBlocking} />;
}

// ---------------------------------------------------------------------------
// Android カスタムモーダルダイアログ（設計 §3.1）
// ---------------------------------------------------------------------------

type AndroidDialogProps = {
  targetNickname: string;
  onConfirm: () => void;
  onCancel: () => void;
  isBlocking: boolean;
};

function AndroidBlockConfirmDialog({ targetNickname, onConfirm, onCancel, isBlocking }: AndroidDialogProps) {
  const titleRef = useRef<Text>(null);

  // ダイアログ表示時にフォーカスをタイトルに移動（設計 §3.1 アクセシビリティ）
  useEffect(() => {
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node !== null) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <Pressable style={styles.overlay} onPress={isBlocking ? undefined : onCancel}>
        <View
          style={styles.dialog}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Text
            ref={titleRef}
            style={styles.title}
            accessibilityRole="header"
          >
            {`@${targetNickname} をブロックしますか？`}
          </Text>
          <Text style={styles.body}>
            ブロックすると、互いにフォローしている場合はフォロー関係が解除され、相手はあなたのプロフィールを検索・フォローできなくなります。
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onCancel}
              disabled={isBlocking}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.buttonPressed,
                isBlocking && styles.buttonDisabled,
              ]}
              onPress={onConfirm}
              disabled={isBlocking}
              accessibilityRole="button"
              accessibilityLabel="ブロックする"
              accessibilityHint="この操作は取り消せない場合があります"
              accessibilityState={{ disabled: isBlocking }}
            >
              {isBlocking ? (
                <ActivityIndicator
                  size="small"
                  color={colorTextInverse}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              ) : (
                <Text style={styles.confirmButtonText}>ブロックする</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing5,
  },
  dialog: {
    backgroundColor: colorBackground,
    borderRadius: radiusLg,
    padding: spacing5,
    width: '100%',
    maxWidth: 340,
    gap: spacing4,
    ...shadowWashiLg,
  },
  title: {
    ...textLg,
    color: colorTextPrimary,
  },
  body: {
    ...textBase,
    color: colorTextSecondary,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing4,
    marginTop: spacing4,
  },
  cancelButton: {
    height: CONFIRM_BUTTON_HEIGHT,
    paddingHorizontal: spacing5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusMd,
  },
  cancelButtonText: {
    ...textBase,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  confirmButton: {
    height: CONFIRM_BUTTON_HEIGHT,
    minWidth: 120,
    paddingHorizontal: spacing6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusMd,
    backgroundColor: colorError,
  },
  confirmButtonText: {
    ...textBase,
    color: colorTextInverse,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
