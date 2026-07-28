/**
 * @module components/auth/GoogleTermsAgreementModal
 * Google 新規登録でサーバーが 403 TERMS_ACCEPTANCE_REQUIRED を返した場合に表示する同意モーダル。
 * 同意後は useGoogleAuth が直前に取得済みの ID トークンを再利用して再試行するため、
 * ここではネイティブのアカウント選択を再表示せず、同意チェックのみを求める。
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthTermsAgreement } from '@/components/auth/AuthTermsAgreement';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { ERR_TERMS_ACCEPTANCE_REQUIRED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorSurfaceMuted,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  spacing6,
  radiusLg,
  radius2xl,
  textBase,
  textLg,
  shadowWashiLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ICON_CIRCLE_SIZE = 56;
const ICON_SIZE = 28;
const BUTTON_HEIGHT = 48;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type GoogleTermsAgreementModalProps = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoogleTermsAgreementModal({
  visible,
  onConfirm,
  onCancel,
  isSubmitting,
  error,
}: GoogleTermsAgreementModalProps) {
  const [checked, setChecked] = useState(false);
  const [prevVisible, setPrevVisible] = useState(visible);

  // モーダルを開くたびに未同意状態へ戻す（前回同意済みのまま次回表示されるのを防ぐ）。
  // レンダー中に前回値と比較して更新する React 公式パターン（副作用ではなく派生 state の調整）。
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setChecked(false);
    }
  }

  function handleCancel() {
    if (isSubmitting) return;
    onCancel();
  }

  function handleConfirm() {
    if (!checked || isSubmitting) return;
    onConfirm();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View
          style={styles.dialog}
          accessibilityRole="alert"
          accessibilityViewIsModal
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name="document-text-outline"
              size={ICON_SIZE}
              color={colorActionPrimary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>

          <Text style={styles.title} accessibilityRole="header">
            利用規約への同意
          </Text>

          <Text style={styles.body}>{ERR_TERMS_ACCEPTANCE_REQUIRED}</Text>

          <AuthTermsAgreement
            checked={checked}
            onToggle={() => setChecked((prev) => !prev)}
            disabled={isSubmitting}
          />

          <FormErrorMessage message={error} />

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleCancel}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
              accessibilityState={{ disabled: isSubmitting }}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                (!checked || isSubmitting) && styles.confirmButtonDisabled,
                pressed && checked && !isSubmitting && styles.buttonPressed,
              ]}
              onPress={handleConfirm}
              disabled={!checked || isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="同意して続行"
              accessibilityState={{ disabled: !checked || isSubmitting, busy: isSubmitting }}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color={colorActionPrimaryText}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              ) : (
                <Text
                  style={[
                    styles.confirmButtonText,
                    !checked && styles.confirmButtonTextDisabled,
                  ]}
                >
                  同意して続行
                </Text>
              )}
            </Pressable>
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
    backgroundColor: colorSurfaceMuted,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing4,
    marginTop: spacing2,
  },
  cancelButton: {
    height: BUTTON_HEIGHT,
    paddingHorizontal: spacing5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusLg,
  },
  cancelButtonText: {
    ...textBase,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  confirmButton: {
    height: BUTTON_HEIGHT,
    minWidth: 140,
    paddingHorizontal: spacing5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusLg,
    backgroundColor: colorActionPrimary,
  },
  confirmButtonDisabled: {
    backgroundColor: colorSurfaceMuted,
  },
  confirmButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: colorTextSecondary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
