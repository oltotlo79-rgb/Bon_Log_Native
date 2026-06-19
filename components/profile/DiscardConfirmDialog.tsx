/**
 * @module components/profile/DiscardConfirmDialog
 * 未保存の変更を破棄するかを確認するダイアログ。
 * 仕様: docs/design/profile-edit.md §10.5
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorError,
  colorActionPrimaryText,
  spacing3,
  spacing4,
  spacing6,
  radiusLg,
  radius2xl,
  textBase,
  textLg,
  shadowWashiLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type DiscardConfirmDialogProps = {
  isVisible: boolean;
  onContinue: () => void;
  onDiscard: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DiscardConfirmDialog({
  isVisible,
  onContinue,
  onDiscard,
}: DiscardConfirmDialogProps) {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View
          style={styles.dialog}
          accessibilityRole="alert"
          accessibilityViewIsModal
        >
          <Text style={styles.title}>変更を破棄しますか？</Text>
          <Text style={styles.body}>保存されていない変更は失われます。</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={onContinue}
              accessibilityRole="button"
              accessibilityLabel="編集を続ける"
            >
              <Text style={styles.continueButtonText}>編集を続ける</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.discardButton}
              onPress={onDiscard}
              accessibilityRole="button"
              accessibilityLabel="変更を破棄する"
            >
              <Text style={styles.discardButtonText}>破棄する</Text>
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
    gap: spacing4,
    ...shadowWashiLg,
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
  buttonRow: {
    gap: spacing3,
    marginTop: spacing3,
  },
  continueButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  continueButtonText: {
    ...textBase,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  discardButton: {
    minHeight: 48,
    backgroundColor: colorError,
    borderRadius: radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  discardButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
});
