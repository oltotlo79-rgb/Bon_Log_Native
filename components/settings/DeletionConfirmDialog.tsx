/**
 * @module components/settings/DeletionConfirmDialog
 * アカウント削除フロー 第2ダイアログ（意思確認）。
 * 「削除する」と入力することで削除ボタンが活性化する。
 * 仕様: docs/design/account-deletion.md §5
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorTextInverse,
  colorError,
  colorErrorBg,
  colorSurfaceMuted,
  colorActionPrimaryText,
  colorBorder,
  colorBorderFocus,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusMd,
  radiusLg,
  radius2xl,
  textBase,
  textSm,
  textLg,
  shadowWashiLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ICON_CIRCLE_SIZE = 56;
const ICON_SIZE = 28;
const CONFIRM_TEXT = '削除する';
const CONFIRMATION_INPUT_HEIGHT = 48;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type DeletionConfirmDialogProps = {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  error: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeletionConfirmDialog({
  isVisible,
  onConfirm,
  onCancel,
  isDeleting,
  error,
}: DeletionConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [hasBlurred, setHasBlurred] = useState(false);

  const trimmed = inputValue.trim();
  const isMatched = trimmed === CONFIRM_TEXT;
  const showInputError = hasBlurred && inputValue.length > 0 && !isMatched;

  function handleCancel() {
    setInputValue('');
    setHasBlurred(false);
    onCancel();
  }

  function handleConfirm() {
    if (!isMatched || isDeleting) return;
    onConfirm();
  }

  const inputBorderColor = showInputError
    ? colorError
    : isMatched
    ? colorBorderFocus
    : colorBorder;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isDeleting) {
          handleCancel();
        }
      }}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View
          style={styles.dialog}
          accessibilityRole="alert"
          accessibilityViewIsModal
        >
          {/* アイコン */}
          <View style={styles.iconCircle}>
            <Ionicons
              name="trash-outline"
              size={ICON_SIZE}
              color={colorError}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>

          {/* タイトル */}
          <Text style={styles.title}>本当にアカウントを削除しますか？</Text>

          {/* 説明文 */}
          <Text style={styles.body}>
            確認のために「削除する」と入力してください。
          </Text>

          {/* 意思確認テキスト入力 */}
          <View style={[styles.inputContainer, { borderColor: inputBorderColor }]}>
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              onBlur={() => setHasBlurred(true)}
              placeholder={CONFIRM_TEXT}
              placeholderTextColor={colorTextTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              editable={!isDeleting}
              style={styles.input}
              accessibilityLabel="削除することを確認する入力フィールド"
              accessibilityHint="「削除する」と入力してください"
            />
          </View>

          {/* テキスト不一致エラー */}
          {showInputError && (
            <View accessibilityRole="alert" accessibilityLiveRegion="assertive">
              <Text style={styles.inputError}>「削除する」と入力してください</Text>
            </View>
          )}

          {/* API エラー */}
          <FormErrorMessage message={error} />

          {/* ボタン */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
              accessibilityState={{ disabled: isDeleting }}
            >
              <Text style={[styles.cancelButtonText, isDeleting && styles.disabledText]}>
                キャンセル
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                !isMatched && styles.deleteButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!isMatched || isDeleting}
              accessibilityRole="button"
              accessibilityLabel="アカウントを完全に削除する"
              accessibilityHint="この操作は取り消せません。"
              accessibilityState={{ disabled: !isMatched || isDeleting }}
            >
              {isDeleting ? (
                <ActivityIndicator color={colorActionPrimaryText} size="small" />
              ) : (
                <Text
                  style={[
                    styles.deleteButtonText,
                    !isMatched && styles.deleteButtonTextDisabled,
                  ]}
                >
                  削除する
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing6,
  },
  dialog: {
    backgroundColor: colorBackground,
    borderRadius: radius2xl,
    padding: spacing6,
    width: '100%',
    gap: spacing3,
    ...shadowWashiLg,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: colorErrorBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing2,
  },
  title: {
    ...textLg,
    color: colorTextPrimary,
    textAlign: 'center',
  },
  body: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    height: CONFIRMATION_INPUT_HEIGHT,
    borderWidth: 1,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    justifyContent: 'center',
  },
  input: {
    ...textBase,
    color: colorTextPrimary,
    padding: 0,
  },
  inputError: {
    ...textSm,
    color: colorError,
  },
  buttonRow: {
    gap: spacing3,
    marginTop: spacing2,
  },
  cancelButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  cancelButtonText: {
    ...textBase,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.4,
  },
  deleteButton: {
    minHeight: 48,
    backgroundColor: colorError,
    borderRadius: radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  deleteButtonDisabled: {
    backgroundColor: colorSurfaceMuted,
  },
  deleteButtonText: {
    ...textBase,
    color: colorTextInverse,
    fontWeight: '600',
  },
  deleteButtonTextDisabled: {
    color: colorTextTertiary,
  },
});
