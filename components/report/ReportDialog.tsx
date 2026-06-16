/**
 * @module components/report/ReportDialog
 * 通報モーダル（ugc-safety.md §7 / §8.1）。
 * ステップ 1: 通報理由選択、ステップ 2: 詳細テキスト入力（任意）。
 * Google Play UGC ポリシー必須要件（store-compliance.md §UGC 要件）。
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReportMutation } from '@/lib/queries/moderation';
import { isApiError } from '@/lib/api/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/common/Toast';
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_DESCRIPTION_MAX_LENGTH,
} from '@/lib/constants/report';
import type { ReportReason, ReportTargetType } from '@/lib/constants/report';
import {
  ERR_OFFLINE_ACTION,
  ERR_REPORT_FAILED,
  ERR_REPORT_DUPLICATE,
  ERR_REPORT_TARGET_NOT_FOUND,
  ERR_RATE_LIMIT,
  ERR_FORBIDDEN,
} from '@/lib/constants/errors';
import {
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorError,
  colorErrorBg,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  spacing6,
  radius2xl,
  radiusMd,
  radiusFull,
  shadowWashiLg,
  textBase,
  textMd,
  textLg,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const MENU_HANDLE_WIDTH = 36;
const MENU_HANDLE_HEIGHT = 4;
const RADIO_ITEM_HEIGHT = 56;
const CLOSE_ICON_SIZE = 22;
const WARN_CHAR_THRESHOLD = 900;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ReportDialogProps = {
  targetType: ReportTargetType;
  targetId: string;
  targetDisplayName: string;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Step 型（ugc-safety.md §7.2 の 2 ステップフロー）
// ---------------------------------------------------------------------------

type DialogStep = 'reason' | 'detail';

// ---------------------------------------------------------------------------
// 通報理由選択（ステップ 1）
// ---------------------------------------------------------------------------

type ReasonSelectorProps = {
  selectedReason: ReportReason | null;
  onChange: (reason: ReportReason) => void;
};

function ReasonSelector({ selectedReason, onChange }: ReasonSelectorProps) {
  return (
    <View>
      {REPORT_REASONS.map((reason) => {
        const isSelected = selectedReason === reason;
        return (
          <Pressable
            key={reason}
            style={({ pressed }) => [
              styles.radioItem,
              isSelected && styles.radioItemSelected,
              pressed && styles.radioItemPressed,
            ]}
            onPress={() => onChange(reason)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={REPORT_REASON_LABELS[reason]}
          >
            <View
              style={[
                styles.radioCircle,
                isSelected && styles.radioCircleSelected,
              ]}
            >
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioLabel}>{REPORT_REASON_LABELS[reason]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 詳細テキスト入力（ステップ 2）
// ---------------------------------------------------------------------------

type DetailInputProps = {
  value: string;
  onChange: (text: string) => void;
  maxLength: number;
};

function DetailInput({ value, onChange, maxLength }: DetailInputProps) {
  const charCount = value.length;
  const isNearLimit = charCount >= WARN_CHAR_THRESHOLD;

  return (
    <View style={styles.detailInputContainer}>
      <TextInput
        style={styles.detailTextArea}
        value={value}
        onChangeText={onChange}
        maxLength={maxLength}
        multiline
        placeholder="この通報についての詳細を入力してください（任意）"
        placeholderTextColor={colorTextSecondary}
        accessibilityLabel="通報の詳細を入力"
        textAlignVertical="top"
      />
      <Text
        style={[
          styles.charCount,
          isNearLimit && styles.charCountWarn,
        ]}
        accessibilityLabel={`${charCount}文字 / 最大${maxLength}文字`}
      >
        {charCount}/{maxLength}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportDialog({
  targetType,
  targetId,
  targetDisplayName,
  onClose,
}: ReportDialogProps) {
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();
  const reportMutation = useReportMutation();

  const [step, setStep] = useState<DialogStep>('reason');
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleReasonChange = useCallback((reason: ReportReason) => {
    setSelectedReason(reason);
    setInlineError(null);
  }, []);

  const handleGoToDetail = useCallback(() => {
    setStep('detail');
    setInlineError(null);
  }, []);

  const handleBackToReason = useCallback(() => {
    setStep('reason');
    setInlineError(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedReason === null) return;

    if (!isOnline) {
      setInlineError(ERR_OFFLINE_ACTION);
      return;
    }

    setInlineError(null);

    reportMutation.mutate(
      {
        targetType,
        targetId,
        reason: selectedReason,
        description: description.length > 0 ? description : undefined,
      },
      {
        onSuccess: () => {
          showToast('通報を受け付けました。ご協力ありがとうございます。', 'default');
          onClose();
        },
        onError: (error) => {
          if (isApiError(error)) {
            if (error.code === 'CONFLICT') {
              setInlineError(ERR_REPORT_DUPLICATE);
            } else if (error.code === 'NOT_FOUND') {
              setInlineError(ERR_REPORT_TARGET_NOT_FOUND);
            } else if (error.code === 'RATE_LIMITED') {
              setInlineError(ERR_RATE_LIMIT);
            } else if (error.code === 'GUEST_NOT_ALLOWED' || error.code === 'ACCOUNT_SUSPENDED') {
              setInlineError(ERR_FORBIDDEN);
            } else {
              setInlineError(ERR_REPORT_FAILED);
            }
          } else {
            setInlineError(ERR_REPORT_FAILED);
          }
        },
      }
    );
  }, [
    selectedReason,
    isOnline,
    reportMutation,
    targetType,
    targetId,
    description,
    showToast,
    onClose,
  ]);

  const isPending = reportMutation.isPending;

  return (
    <View>
      <Modal
        visible
        transparent
        animationType="slide"
        onRequestClose={onClose}
        accessibilityViewIsModal
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.backdrop} onPress={onClose} />

          <View style={styles.sheet}>
            {/* ハンドル */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* ヘッダー行 */}
            <View style={styles.header}>
              {step === 'detail' ? (
                <Pressable
                  style={styles.backButton}
                  onPress={handleBackToReason}
                  disabled={isPending}
                  accessibilityRole="button"
                  accessibilityLabel="理由選択に戻る"
                >
                  <Ionicons name="arrow-back" size={CLOSE_ICON_SIZE} color={colorTextPrimary} accessibilityElementsHidden importantForAccessibility="no" />
                </Pressable>
              ) : (
                <View style={styles.backButtonPlaceholder} />
              )}

              <Text style={styles.headerTitle} accessibilityRole="header">
                {step === 'reason' ? '通報の理由を選択してください' : '詳細を入力（任意）'}
              </Text>

              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel="通報をキャンセルして閉じる"
              >
                <Ionicons name="close" size={CLOSE_ICON_SIZE} color={colorTextSecondary} accessibilityElementsHidden importantForAccessibility="no" />
              </Pressable>
            </View>

            <View style={styles.separator} />

            {/* コンテンツ */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {step === 'reason' ? (
                <ReasonSelector
                  selectedReason={selectedReason}
                  onChange={handleReasonChange}
                />
              ) : (
                <View>
                  <Text style={styles.selectedReasonLabel}>
                    選択した理由: {selectedReason !== null ? REPORT_REASON_LABELS[selectedReason] : ''}
                  </Text>
                  <DetailInput
                    value={description}
                    onChange={setDescription}
                    maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
                  />
                </View>
              )}

              {/* インラインエラー */}
              {inlineError !== null && (
                <View style={styles.inlineError} accessibilityLiveRegion="assertive">
                  <Text style={styles.inlineErrorText}>{inlineError}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.separator} />

            {/* フッターボタン */}
            <View style={styles.footer}>
              {step === 'reason' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    selectedReason === null && styles.primaryButtonDisabled,
                    pressed && selectedReason !== null && styles.primaryButtonPressed,
                  ]}
                  onPress={handleGoToDetail}
                  disabled={selectedReason === null}
                  accessibilityRole="button"
                  accessibilityLabel="次へ"
                  accessibilityState={{ disabled: selectedReason === null }}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      selectedReason === null && styles.primaryButtonTextDisabled,
                    ]}
                  >
                    次へ
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    isPending && styles.primaryButtonDisabled,
                    pressed && !isPending && styles.primaryButtonPressed,
                  ]}
                  onPress={handleSubmit}
                  disabled={isPending}
                  accessibilityRole="button"
                  accessibilityLabel="通報する"
                  accessibilityState={{ disabled: isPending }}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color={colorActionPrimaryText} accessibilityElementsHidden importantForAccessibility="no" />
                  ) : (
                    <Text style={styles.primaryButtonText}>通報する</Text>
                  )}
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
                ]}
                onPress={onClose}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel="キャンセル"
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colorSurface,
    borderTopLeftRadius: radius2xl,
    borderTopRightRadius: radius2xl,
    maxHeight: '85%',
    ...shadowWashiLg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing2,
    paddingBottom: spacing2,
  },
  handle: {
    width: MENU_HANDLE_WIDTH,
    height: MENU_HANDLE_HEIGHT,
    borderRadius: radiusFull,
    backgroundColor: colorBorderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    gap: spacing2,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    flex: 1,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginHorizontal: spacing5,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingVertical: spacing3,
  },
  radioItem: {
    height: RADIO_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing5,
    gap: spacing4,
  },
  radioItemSelected: {
    backgroundColor: colorSurfaceMuted,
  },
  radioItemPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: radiusFull,
    borderWidth: 2,
    borderColor: colorBorderLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioCircleSelected: {
    borderColor: colorActionPrimary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
  },
  radioLabel: {
    ...textMd,
    color: colorTextPrimary,
    flex: 1,
  },
  selectedReasonLabel: {
    ...textSm,
    color: colorTextSecondary,
    paddingHorizontal: spacing5,
    marginBottom: spacing3,
  },
  detailInputContainer: {
    marginHorizontal: spacing5,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
    padding: spacing3,
    minHeight: 120,
  },
  detailTextArea: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
    minHeight: 80,
  },
  charCount: {
    ...textSm,
    color: colorTextSecondary,
    textAlign: 'right',
    marginTop: spacing2,
  },
  charCountWarn: {
    color: colorError,
  },
  inlineError: {
    marginHorizontal: spacing5,
    marginTop: spacing3,
    borderRadius: radiusMd,
    backgroundColor: colorErrorBg,
    padding: spacing3,
  },
  inlineErrorText: {
    ...textSm,
    color: colorError,
  },
  footer: {
    paddingHorizontal: spacing5,
    paddingVertical: spacing4,
    gap: spacing3,
  },
  primaryButton: {
    height: 44,
    borderRadius: radiusMd,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
  primaryButtonTextDisabled: {
    color: colorActionPrimaryText,
  },
  cancelButton: {
    height: 44,
    borderRadius: radiusMd,
    backgroundColor: colorActionSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonPressed: {
    opacity: 0.8,
  },
  cancelButtonText: {
    ...textBase,
    color: colorActionSecondaryText,
  },
  footerBottomPad: {
    height: spacing6,
  },
});
