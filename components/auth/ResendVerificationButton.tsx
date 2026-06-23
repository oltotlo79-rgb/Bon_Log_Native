/**
 * @module components/auth/ResendVerificationButton
 * 確認メール再送ボタン（email-verification-resend.md §6.1）。
 * verify-email-sent 画面とログイン画面の両方で再利用する。
 * クールダウン中はカウントダウン表示でボタンを無効化し、連打を抑制する。
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { useResendVerificationMutation } from '@/lib/queries/auth';
import {
  colorBackground,
  colorBorder,
  colorTextPrimary,
  radiusLg,
  textBase,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import { ERR_RATE_LIMIT } from '@/lib/constants/errors';
import { isApiError } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const RESEND_COOLDOWN_MS = 60_000;
const RESEND_COOLDOWN_TICK_MS = 1_000;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ResendVerificationButtonProps = {
  email: string;
  cooldownMs?: number;
  onSuccess?: () => void;
  onError: (error: unknown) => void;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResendVerificationButton({
  email,
  cooldownMs = RESEND_COOLDOWN_MS,
  onSuccess,
  onError,
  style,
}: ResendVerificationButtonProps) {
  const { mutate, isPending } = useResendVerificationMutation();
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    const startMs = cooldownMs / RESEND_COOLDOWN_TICK_MS;
    setCooldownRemaining(startMs);
    intervalRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, RESEND_COOLDOWN_TICK_MS);
  }, [cooldownMs]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const isCoolingDown = cooldownRemaining > 0;
  const isDisabled = isPending || isCoolingDown;

  function handlePress() {
    if (isDisabled) return;

    mutate(
      { email },
      {
        onSuccess: () => {
          startCooldown();
          onSuccess?.();
        },
        onError: (error) => {
          if (isApiError(error) && error.code === 'RATE_LIMITED') {
            onError(new Error(ERR_RATE_LIMIT));
          } else {
            onError(error);
          }
        },
      }
    );
  }

  function resolveLabel(): string {
    if (isPending) return '送信中...';
    if (isCoolingDown) return `残り ${cooldownRemaining} 秒`;
    return '確認メールを再送する';
  }

  function resolveAccessibilityLabel(): string {
    if (isPending) return '送信中';
    if (isCoolingDown) return `${cooldownRemaining}秒後に再送できます`;
    return '確認メールを再送する';
  }

  return (
    <TouchableOpacity
      testID="resend-verification"
      style={[styles.button, isDisabled && styles.buttonDisabled, style]}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={resolveAccessibilityLabel()}
      accessibilityState={{ busy: isPending, disabled: isDisabled }}
    >
      {isPending ? (
        <ActivityIndicator
          size="small"
          color={colorTextPrimary}
          accessibilityElementsHidden
        />
      ) : (
        <Text style={styles.buttonText}>{resolveLabel()}</Text>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  button: {
    height: 48,
    backgroundColor: colorBackground,
    borderWidth: 1.5,
    borderColor: colorBorder,
    borderRadius: radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
    letterSpacing: letterSpacingWidest,
  },
});
