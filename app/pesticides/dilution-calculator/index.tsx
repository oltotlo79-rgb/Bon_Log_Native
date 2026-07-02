/**
 * @module app/pesticides/dilution-calculator/index
 * 希釈計算ツール画面。完全なクライアントサイド計算のみ。サーバー API 不要。
 * Web 版 /pesticides/dilution-calculator に準拠。
 * 仕様: docs/design/pesticides-web-parity.md §4-10
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  colorTextPrimary,
  colorTextSecondary,
  colorWarning,
  colorWarningBg,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  radiusFull,
  shadowWashi,
  textBase,
  textLg,
  textMd,
  textSm,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 計算定数（Web 版 lib/constants/ と揃える値）
// ---------------------------------------------------------------------------

// 1mL あたりの滴数換算（一般的な点眼型スポイトの目安）
const DROPS_PER_ML = 20;

// この値未満の薬剤量は計量誤差が大きく危険
const MIN_MEASURABLE_ML = 0.1;

// 水量プリセット（mL）
const WATER_VOLUME_PRESETS: number[] = [200, 500, 1000, 2000];

// 希釈倍率プリセット
const DILUTION_RATIO_PRESETS: number[] = [500, 1000, 1500, 2000, 3000];

// ---------------------------------------------------------------------------
// 計算ロジック（画面固有の純粋関数）
// ---------------------------------------------------------------------------

/**
 * 正モード: 水量（mL）と希釈倍率から薬剤量（mL）を計算する。
 * 薬剤量 = 水量 ÷ 希釈倍率
 */
function calcPesticideAmount(waterMl: number, dilutionRatio: number): number {
  return waterMl / dilutionRatio;
}

/**
 * 逆モード: 薬剤量（mL）と希釈倍率から必要水量（mL）を計算する。
 * 必要水量 = 薬剤量 × 希釈倍率
 */
function calcRequiredWater(pesticideMl: number, dilutionRatio: number): number {
  return pesticideMl * dilutionRatio;
}

/**
 * mL 値を表示用文字列に変換する。
 * 1000 mL 以上は L も併記。0.5 mL 未満は滴数も併記。
 */
function formatMlDisplay(ml: number): string {
  const rounded = Math.round(ml * 1000) / 1000;
  let result = `${rounded.toFixed(2)}mL`;
  if (ml < 0.5) {
    const drops = Math.round(ml * DROPS_PER_ML);
    result += `（約${drops}滴）`;
  }
  if (ml >= 1000) {
    const liters = ml / 1000;
    result += ` / ${liters.toFixed(1)}L`;
  }
  return result;
}

// ---------------------------------------------------------------------------
// 計算モード
// ---------------------------------------------------------------------------

type CalculationMode = 'normal' | 'reverse';

// ---------------------------------------------------------------------------
// プリセットボタン共通コンポーネント
// ---------------------------------------------------------------------------

type PresetButtonProps = {
  label: string;
  onPress: () => void;
};

const PresetButton = memo(function PresetButton({ label, onPress }: PresetButtonProps) {
  return (
    <TouchableOpacity
      style={styles.presetButton}
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label}を設定`}
    >
      <Text style={styles.presetButtonText}>{label}</Text>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// 計算結果表示コンポーネント
// ---------------------------------------------------------------------------

type DilutionResultProps = {
  mode: CalculationMode;
  waterMl: number;
  pesticideMl: number;
  dilutionRatio: number;
  resultMl: number;
  isValid: boolean;
};

const DilutionResult = memo(function DilutionResult({
  mode,
  waterMl,
  pesticideMl,
  dilutionRatio,
  resultMl,
  isValid,
}: DilutionResultProps) {
  if (!isValid) return null;

  const isTooSmall = mode === 'normal' && resultMl < MIN_MEASURABLE_ML;

  return (
    <View style={[styles.resultCard, isTooSmall && styles.resultCardWarning]}>
      <Text style={styles.resultHeading}>計算結果</Text>

      {mode === 'normal' ? (
        <>
          <View style={styles.resultValueRow}>
            <Text style={styles.resultLabel}>必要な薬剤量</Text>
            <Text style={styles.resultValue}>{formatMlDisplay(resultMl)}</Text>
          </View>
          <Text style={styles.resultNote}>
            水{waterMl}mLに対して{dilutionRatio}倍希釈
          </Text>
        </>
      ) : (
        <>
          <View style={styles.resultValueRow}>
            <Text style={styles.resultLabel}>必要水量</Text>
            <Text style={styles.resultValue}>{formatMlDisplay(resultMl)}</Text>
          </View>
          <Text style={styles.resultNote}>
            薬剤{pesticideMl}mLを{dilutionRatio}倍に希釈する場合
          </Text>
        </>
      )}

      {isTooSmall && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {MIN_MEASURABLE_ML}mL未満のため正確な計量が困難です。より多い水量での調製をお勧めします。
          </Text>
        </View>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DilutionCalculatorScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const [mode, setMode] = useState<CalculationMode>('normal');

  // 正モード入力
  const [waterInput, setWaterInput] = useState('1000');
  const [ratioInputNormal, setRatioInputNormal] = useState('1000');

  // 逆モード入力
  const [pesticideInput, setPesticideInput] = useState('1');
  const [ratioInputReverse, setRatioInputReverse] = useState('1000');

  const handleModeChange = useCallback((next: CalculationMode) => {
    Keyboard.dismiss();
    setMode(next);
  }, []);

  // 正モード計算
  const waterMl = parseFloat(waterInput);
  const ratioNormal = parseFloat(ratioInputNormal);
  const isNormalValid = !isNaN(waterMl) && waterMl > 0 && !isNaN(ratioNormal) && ratioNormal > 0;
  const normalResult = isNormalValid ? calcPesticideAmount(waterMl, ratioNormal) : 0;

  // 逆モード計算
  const pesticideMl = parseFloat(pesticideInput);
  const ratioReverse = parseFloat(ratioInputReverse);
  const isReverseValid =
    !isNaN(pesticideMl) && pesticideMl > 0 && !isNaN(ratioReverse) && ratioReverse > 0;
  const reverseResult = isReverseValid ? calcRequiredWater(pesticideMl, ratioReverse) : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '希釈計算ツール', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenDescription}>
          希釈倍率から薬剤量を計算、または薬剤量から必要な水量を逆算できます
        </Text>

        {/* モード切替タブ */}
        <View style={styles.modeTabRow}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'normal' && styles.modeTabActive]}
            onPress={() => { handleModeChange('normal'); }}
            accessibilityRole="button"
            accessibilityLabel="薬剤量を計算"
            accessibilityState={{ selected: mode === 'normal' }}
          >
            <Text style={[styles.modeTabText, mode === 'normal' && styles.modeTabTextActive]}>
              薬剤量を計算
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'reverse' && styles.modeTabActive]}
            onPress={() => { handleModeChange('reverse'); }}
            accessibilityRole="button"
            accessibilityLabel="必要水量を計算"
            accessibilityState={{ selected: mode === 'reverse' }}
          >
            <Text style={[styles.modeTabText, mode === 'reverse' && styles.modeTabTextActive]}>
              必要水量を計算
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'normal' ? (
          <View style={styles.formCard}>
            {/* 水量入力 */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>水量（mL）</Text>
              <TextInput
                style={styles.fieldInput}
                value={waterInput}
                onChangeText={setWaterInput}
                keyboardType="numeric"
                returnKeyType="done"
                accessibilityLabel="水量をミリリットルで入力"
                placeholder="例: 1000"
                placeholderTextColor={colorTextSecondary}
              />
              <View style={styles.presetRow}>
                {WATER_VOLUME_PRESETS.map((v) => (
                  <PresetButton
                    key={v}
                    label={`${v}mL`}
                    onPress={() => { setWaterInput(String(v)); }}
                  />
                ))}
              </View>
            </View>

            {/* 希釈倍率入力 */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>希釈倍率</Text>
              <TextInput
                style={styles.fieldInput}
                value={ratioInputNormal}
                onChangeText={setRatioInputNormal}
                keyboardType="numeric"
                returnKeyType="done"
                accessibilityLabel="希釈倍率を入力"
                placeholder="例: 1000"
                placeholderTextColor={colorTextSecondary}
              />
              <View style={styles.presetRow}>
                {DILUTION_RATIO_PRESETS.map((v) => (
                  <PresetButton
                    key={v}
                    label={`${v}倍`}
                    onPress={() => { setRatioInputNormal(String(v)); }}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.formCard}>
            {/* 薬剤量入力（逆モード） */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>薬剤量（mL）</Text>
              <TextInput
                style={styles.fieldInput}
                value={pesticideInput}
                onChangeText={setPesticideInput}
                keyboardType="numeric"
                returnKeyType="done"
                accessibilityLabel="薬剤量をミリリットルで入力"
                placeholder="例: 1"
                placeholderTextColor={colorTextSecondary}
              />
            </View>

            {/* 希釈倍率入力（逆モード） */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>希釈倍率</Text>
              <TextInput
                style={styles.fieldInput}
                value={ratioInputReverse}
                onChangeText={setRatioInputReverse}
                keyboardType="numeric"
                returnKeyType="done"
                accessibilityLabel="希釈倍率を入力"
                placeholder="例: 1000"
                placeholderTextColor={colorTextSecondary}
              />
              <View style={styles.presetRow}>
                {DILUTION_RATIO_PRESETS.map((v) => (
                  <PresetButton
                    key={v}
                    label={`${v}倍`}
                    onPress={() => { setRatioInputReverse(String(v)); }}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* 計算結果 */}
        <DilutionResult
          mode={mode}
          waterMl={waterMl}
          pesticideMl={pesticideMl}
          dilutionRatio={mode === 'normal' ? ratioNormal : ratioReverse}
          resultMl={mode === 'normal' ? normalResult : reverseResult}
          isValid={mode === 'normal' ? isNormalValid : isReverseValid}
        />

        {/* 免責事項 */}
        <PesticideDisclaimer />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing6,
  },
  screenDescription: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },

  // モード切替タブ
  modeTabRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    overflow: 'hidden',
  },
  modeTab: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorActionSecondary,
  },
  modeTabActive: {
    backgroundColor: colorActionPrimary,
  },
  modeTabText: {
    ...textSm,
    color: colorActionSecondaryText,
    fontFamily: fontFamilySerifBold,
  },
  modeTabTextActive: {
    color: colorActionPrimaryText,
  },

  // フォームカード
  formCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    gap: spacing6,
    ...shadowWashi,
  },

  // 入力フィールドブロック
  fieldBlock: {
    gap: spacing3,
  },
  fieldLabel: {
    ...textBase,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  fieldInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    backgroundColor: colorBackground,
    ...textMd,
    color: colorTextPrimary,
  },

  // プリセットボタン群
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  presetButton: {
    height: 36,
    paddingHorizontal: spacing3,
    borderRadius: radiusFull,
    borderWidth: 1,
    borderColor: colorBorder,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  presetButtonText: {
    ...textXs,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
  },

  // 計算結果カード
  resultCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    gap: spacing3,
    ...shadowWashi,
  },
  resultCardWarning: {
    borderColor: colorWarning,
    backgroundColor: colorWarningBg,
  },
  resultHeading: {
    ...textLg,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  resultValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing2,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    gap: spacing3,
  },
  resultLabel: {
    ...textSm,
    color: colorTextSecondary,
    flexShrink: 0,
  },
  resultValue: {
    ...textMd,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    textAlign: 'right',
    flex: 1,
  },
  resultNote: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 16,
  },

  // 警告ボックス
  warningBox: {
    backgroundColor: colorWarningBg,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorWarning,
    padding: spacing3,
    marginTop: spacing2,
  },
  warningText: {
    ...textXs,
    color: colorWarning,
    lineHeight: 16,
  },
});
