/**
 * @module components/settings/TwoFactorEnableSection
 * 2FA 有効化フロー（開始 → QR コード・シークレット・バックアップコード表示 → コード確認 → 完了）。
 * secret / otpAuthUrl / backupCodes はサーバーがキャッシュしない値のため、
 * 呼び出す度にローカル state で新しく保持し、キャンセル・完了時に破棄する。
 * QR コードは lib/utils/qr-code の generateQrCodeDataUri で otpAuthUrl から都度生成する
 * （GIF base64 data URI。expo-image の Android data URI デコーダとの整合のため raster GIF を採用。
 * 読み取れない環境向けに secret / otpAuthUrl のテキスト表示も残す）。
 */

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { generateQrCodeDataUri } from '@/lib/utils/qr-code';
import {
  useTwoFactorSetupMutation,
  useEnableTwoFactorMutation,
  type TwoFactorSetupResponse,
} from '@/lib/queries/auth';
import { isApiError, type MobileApiErrorCode } from '@/lib/api/errors';
import {
  messageForApiError,
  ERR_GENERIC,
  ERR_OFFLINE_ACTION,
  ERR_2FA_ENABLE_INVALID_CODE,
  ERR_2FA_SETUP_EXPIRED_SETTINGS,
  ERR_2FA_ALREADY_ENABLED,
} from '@/lib/constants/errors';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { TwoFactorCodeField, TOTP_CODE_LENGTH } from '@/components/auth/TwoFactorCodeField';
import { BackupCodesList } from '@/components/settings/BackupCodesList';
import {
  colorSurface,
  colorSurfaceMuted,
  colorSuccess,
  colorSuccessBg,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  spacing4,
  radiusLg,
  radiusMd,
  textBase,
  textLg,
  textSm,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const SHIELD_ICON_SIZE = 22;
const QR_IMAGE_SIZE = 200;

/**
 * 設定画面の 2FA 有効化フロー専用のエラー文言変換。
 * ログイン経路（messageForApiError）とは表示トーンが異なるコードのみ上書きする。
 */
function messageForEnableTwoFactorError(code: MobileApiErrorCode): string {
  if (code === 'AUTH_2FA_INVALID_CODE') return ERR_2FA_ENABLE_INVALID_CODE;
  if (code === 'AUTH_2FA_TICKET_EXPIRED') return ERR_2FA_SETUP_EXPIRED_SETTINGS;
  if (code === 'CONFLICT') return ERR_2FA_ALREADY_ENABLED;
  return messageForApiError(code);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TwoFactorEnableSectionProps = {
  isOnline: boolean;
};

type Step = 'idle' | 'setup' | 'success';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TwoFactorEnableSection({ isOnline }: TwoFactorEnableSectionProps) {
  const [step, setStep] = useState<Step>('idle');
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const codeFieldRef = useRef<TextInput>(null);

  const setupMutation = useTwoFactorSetupMutation();
  const enableMutation = useEnableTwoFactorMutation();

  // code は 6 桁入力の毎キー入力で更新されるため、QR (GIF 生成) の再生成を
  // otpAuthUrl が変わらない限り避ける。
  const qrCodeUri = useMemo(
    () => (setupData !== null ? generateQrCodeDataUri(setupData.otpAuthUrl) : null),
    [setupData]
  );

  function resetToIdle() {
    setStep('idle');
    setSetupData(null);
    setCode('');
    setError(null);
  }

  async function handleStartSetup() {
    if (!isOnline) {
      setError(ERR_OFFLINE_ACTION);
      return;
    }
    setError(null);
    try {
      const result = await setupMutation.mutateAsync();
      setSetupData(result);
      setStep('setup');
      setTimeout(() => codeFieldRef.current?.focus(), 0);
    } catch (err) {
      setError(isApiError(err) ? messageForEnableTwoFactorError(err.code) : ERR_GENERIC);
    }
  }

  function handleEnable() {
    if (setupData === null || !isOnline) {
      if (!isOnline) setError(ERR_OFFLINE_ACTION);
      return;
    }
    setError(null);
    enableMutation.mutate(
      { code, setupId: setupData.setupId },
      {
        onSuccess: () => setStep('success'),
        onError: (err) => {
          setError(isApiError(err) ? messageForEnableTwoFactorError(err.code) : ERR_GENERIC);
        },
      }
    );
  }

  const canSubmit = code.length === TOTP_CODE_LENGTH && !enableMutation.isPending && isOnline;

  if (step === 'success') {
    return (
      <View style={[styles.card, styles.successCard]}>
        <View style={styles.iconRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={SHIELD_ICON_SIZE}
            color={colorSuccess}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.successTitle}>2段階認証が有効になりました</Text>
        </View>
        <Text style={styles.description}>
          次回ログイン時から、認証アプリのコードが必要になります。
        </Text>
        <AuthPrimaryButton label="閉じる" onPress={resetToIdle} />
      </View>
    );
  }

  if (step === 'setup' && setupData !== null) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>ステップ 1: 認証アプリに登録</Text>
        <Text style={styles.description}>
          認証アプリ（Google Authenticator、Microsoft Authenticator 等）で下の QR コードを読み取るか、
          以下のキーを手動で入力してください。
        </Text>
        {qrCodeUri !== null && (
          <View style={styles.qrWrapper}>
            <Image
              source={{ uri: qrCodeUri }}
              style={styles.qrImage}
              contentFit="contain"
              accessibilityRole="image"
              accessibilityLabel="2FA QRコード"
            />
          </View>
        )}
        <View style={styles.secretBox}>
          <Text style={styles.secretLabel}>シークレットキー</Text>
          <Text style={styles.secretValue} selectable accessibilityLabel="シークレットキー">
            {setupData.secret}
          </Text>
        </View>
        <View style={styles.secretBox}>
          <Text style={styles.secretLabel}>otpauth URL</Text>
          <Text style={styles.secretValue} selectable accessibilityLabel="otpauth URL">
            {setupData.otpAuthUrl}
          </Text>
        </View>

        <Text style={styles.title}>ステップ 2: バックアップコードを保存</Text>
        <Text style={styles.description}>
          以下のバックアップコードを安全な場所に保存してください。認証アプリにアクセスできなくなった場合に使用できます。
        </Text>
        <BackupCodesList codes={setupData.backupCodes} />

        <Text style={styles.title}>ステップ 3: 認証コードを入力</Text>
        <Text style={styles.description}>
          認証アプリに表示されている6桁のコードを入力してください。
        </Text>
        <TwoFactorCodeField
          ref={codeFieldRef}
          mode="totp"
          value={code}
          onChangeText={setCode}
          onSubmitEditing={handleEnable}
          hasError={error !== null}
          disabled={enableMutation.isPending}
        />

        <FormErrorMessage message={error} />

        <View style={styles.buttonRow}>
          <AuthPrimaryButton
            label="有効化する"
            onPress={handleEnable}
            disabled={!canSubmit}
            isLoading={enableMutation.isPending}
          />
          <Pressable
            style={styles.cancelLink}
            onPress={resetToIdle}
            accessibilityRole="button"
            accessibilityLabel="セットアップをキャンセル"
          >
            <Text style={styles.cancelLinkText}>キャンセル</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.iconRow}>
        <Ionicons
          name="shield-outline"
          size={SHIELD_ICON_SIZE}
          color={colorTextPrimary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.title}>2段階認証</Text>
      </View>
      <Text style={styles.description}>
        2段階認証を有効にすると、ログイン時にパスワードに加えて認証アプリからのコードが必要になります。
      </Text>
      <Text style={styles.description}>
        Google Authenticator、Microsoft Authenticator などの認証アプリをご利用ください。
      </Text>

      <FormErrorMessage message={error} />

      <AuthPrimaryButton
        label="2段階認証を設定する"
        onPress={() => void handleStartSetup()}
        isLoading={setupMutation.isPending}
        disabled={!isOnline}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    gap: spacing3,
    ...shadowWashi,
  },
  successCard: {
    backgroundColor: colorSuccessBg,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  title: {
    ...textLg,
    color: colorTextPrimary,
  },
  successTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  description: {
    ...textSm,
    color: colorTextSecondary,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing3,
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
  },
  qrImage: {
    width: QR_IMAGE_SIZE,
    height: QR_IMAGE_SIZE,
  },
  secretBox: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing2,
  },
  secretLabel: {
    ...textSm,
    color: colorTextSecondary,
  },
  secretValue: {
    ...textBase,
    color: colorTextPrimary,
  },
  buttonRow: {
    gap: spacing3,
  },
  cancelLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing2,
  },
  cancelLinkText: {
    ...textBase,
    color: colorTextSecondary,
    textDecorationLine: 'underline',
  },
});
